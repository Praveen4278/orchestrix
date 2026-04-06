"""
Discovery Agent — Port 8001
Fetches research papers from arXiv and Semantic Scholar APIs.
Implements relevance ranking and pagination.
"""
import os
import sys
import asyncio
import hashlib
import time
from typing import List
from datetime import datetime

import httpx
import arxiv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))
from shared.models import Paper, DiscoveryRequest, DiscoveryResponse

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

app = FastAPI(title="Orchestrix Discovery Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def make_paper_id(source: str, identifier: str) -> str:
    return hashlib.md5(f"{source}:{identifier}".encode()).hexdigest()[:12]


def compute_relevance(paper_title: str, paper_abstract: str, query: str) -> float:
    """Simple TF-based relevance scoring."""
    query_terms = set(query.lower().split())
    text = f"{paper_title} {paper_abstract}".lower()
    matches = sum(1 for term in query_terms if term in text)
    return round(matches / max(len(query_terms), 1), 3)


def _get_arxiv_results(query: str, max_results: int):
    """Synchronous helper for arxiv library results."""
    client = arxiv.Client(
        page_size=max_results,
        delay_seconds=1.5,
        num_retries=3,
    )
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.Relevance,
        sort_order=arxiv.SortOrder.Descending,
    )
    return list(client.results(search))


async def fetch_arxiv_papers(query: str, max_results: int, page: int) -> List[Paper]:
    """Fetch papers from arXiv API."""
    papers = []
    try:
        # Run synchronous arxiv call in a thread pool to avoid blocking event loop
        results = await asyncio.to_thread(_get_arxiv_results, query, max_results)

        for result in results:
            arxiv_id = result.entry_id.split("/abs/")[-1]
            paper = Paper(
                id=make_paper_id("arxiv", arxiv_id),
                title=result.title.strip(),
                authors=[a.name for a in result.authors[:6]],
                year=result.published.year if result.published else datetime.now().year,
                abstract=result.summary.strip()[:800],
                citation_count=0,
                url=result.entry_id,
                source="arxiv",
                keywords=[c if isinstance(c, str) else getattr(c, 'term', str(c)) for c in result.categories[:5]] if result.categories else [],
                venue="arXiv",
                relevance_score=compute_relevance(result.title, result.summary, query),
            )
            papers.append(paper)
    except Exception as e:
        import traceback
        print(f"[Discovery] arXiv error: {e}")
        traceback.print_exc()
    return papers


async def fetch_semantic_scholar_papers(query: str, max_results: int) -> List[Paper]:
    """Fetch papers from Semantic Scholar API."""
    papers = []
    try:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": query,
            "limit": min(max_results, 20),
            "fields": "title,authors,year,abstract,citationCount,externalIds,venue,fieldsOfStudy",
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                for item in data.get("data", []):
                    paper_id = item.get("paperId", "")
                    if not paper_id:
                        continue
                    abstract = item.get("abstract") or ""
                    title = item.get("title") or "Untitled"
                    year = item.get("year") or datetime.now().year
                    authors = [a.get("name", "") for a in item.get("authors", [])[:6]]
                    citation_count = item.get("citationCount", 0)
                    venue = item.get("venue", "")
                    keywords = item.get("fieldsOfStudy", []) or []
                    ext_ids = item.get("externalIds", {}) or {}
                    url_val = f"https://www.semanticscholar.org/paper/{paper_id}"
                    if ext_ids.get("ArXiv"):
                        url_val = f"https://arxiv.org/abs/{ext_ids['ArXiv']}"

                    paper = Paper(
                        id=make_paper_id("ss", paper_id),
                        title=title.strip(),
                        authors=authors,
                        year=int(year) if year else datetime.now().year,
                        abstract=abstract.strip()[:800] if abstract else "No abstract available.",
                        citation_count=citation_count,
                        url=url_val,
                        source="semantic_scholar",
                        keywords=keywords[:5],
                        venue=venue,
                        relevance_score=compute_relevance(title, abstract or "", query),
                    )
                    papers.append(paper)
    except Exception as e:
        print(f"[Discovery] Semantic Scholar error: {e}")
    return papers


def deduplicate_papers(papers: List[Paper]) -> List[Paper]:
    """Remove duplicate papers based on title similarity."""
    seen_titles = set()
    unique = []
    for paper in papers:
        normalized = " ".join(paper.title.lower().split()[:6])
        if normalized not in seen_titles:
            seen_titles.add(normalized)
            unique.append(paper)
    return unique


def rank_papers(papers: List[Paper], query: str) -> List[Paper]:
    """Rank papers by combined relevance + citation score."""
    max_cit = max((p.citation_count for p in papers), default=1) or 1
    for paper in papers:
        citation_score = paper.citation_count / max_cit
        combined = 0.7 * paper.relevance_score + 0.3 * citation_score
        paper.relevance_score = round(combined, 4)
    return sorted(papers, key=lambda p: p.relevance_score, reverse=True)


@app.get("/health")
async def health():
    return {"status": "ok", "agent": "discovery", "port": 8001}


@app.post("/discover", response_model=DiscoveryResponse)
async def discover(request: DiscoveryRequest):
    """Main discovery endpoint — fetches and ranks papers from multiple sources."""
    start = time.time()
    print(f"[Discovery] Query: {request.query!r}, sources: {request.sources}")

    tasks = []
    source_names = []
    
    if "arxiv" in request.sources:
        # Wrap arxiv call in a timeout to prevent it from holding up the entire discovery process
        tasks.append(asyncio.wait_for(fetch_arxiv_papers(request.query, request.max_results, request.page), timeout=35.0))
        source_names.append("arxiv")
    if "semantic_scholar" in request.sources:
        tasks.append(fetch_semantic_scholar_papers(request.query, request.max_results))
        source_names.append("semantic_scholar")

    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_papers: List[Paper] = []
    sources_used = []
    for i, res in enumerate(results):
        source = source_names[i] if i < len(source_names) else "unknown"
        if isinstance(res, Exception):
            print(f"[Discovery] Source {source} error: {res}")
            continue
        sources_used.append(source)
        all_papers.extend(res)

    all_papers = deduplicate_papers(all_papers)
    all_papers = rank_papers(all_papers, request.query)
    total = len(all_papers)
    # Paginate
    start_idx = (request.page - 1) * request.max_results
    paginated = all_papers[start_idx: start_idx + request.max_results]

    elapsed = (time.time() - start) * 1000
    print(f"[Discovery] Found {total} papers in {elapsed:.0f}ms")

    return DiscoveryResponse(
        papers=paginated,
        total_found=total,
        query=request.query,
        sources_used=sources_used,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
