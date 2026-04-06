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
import json
from typing import List, AsyncGenerator
from datetime import datetime

import httpx
import arxiv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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
    """Fetch papers from Semantic Scholar API with retry on 429."""
    papers = []
    try:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": query,
            "limit": min(max_results, 100),
            "fields": "title,authors,year,abstract,citationCount,externalIds,venue,fieldsOfStudy",
        }
        headers = {}
        ss_api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")
        if ss_api_key:
            headers["x-api-key"] = ss_api_key

        for attempt in range(4):
            await asyncio.sleep(attempt * 3)  # 0s, 3s, 6s, 9s between attempts
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(url, params=params, headers=headers)
            if response.status_code == 429:
                print(f"[Discovery] Semantic Scholar rate limited (attempt {attempt+1}/4)")
                continue
            if response.status_code != 200:
                print(f"[Discovery] Semantic Scholar HTTP {response.status_code}")
                break
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
            print(f"[Discovery] Semantic Scholar: {len(papers)} papers fetched")
            break
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
    """Rank papers by combined relevance + citation score, ensuring source diversity."""
    max_cit = max((p.citation_count for p in papers), default=1) or 1
    for paper in papers:
        citation_score = paper.citation_count / max_cit
        combined = 0.7 * paper.relevance_score + 0.3 * citation_score
        paper.relevance_score = round(combined, 4)

    ranked = sorted(papers, key=lambda p: p.relevance_score, reverse=True)

    # Ensure both sources appear in the final list if available
    arxiv = [p for p in ranked if p.source == "arxiv"]
    ss = [p for p in ranked if p.source == "semantic_scholar"]

    if not arxiv or not ss:
        return ranked  # only one source available, return as-is

    # Interleave: pick top from each source alternately until we have enough
    mixed = []
    i, j = 0, 0
    while i < len(arxiv) or j < len(ss):
        if i < len(arxiv):
            mixed.append(arxiv[i]); i += 1
        if j < len(ss):
            mixed.append(ss[j]); j += 1

    return mixed


@app.get("/health")
async def health():
    return {"status": "ok", "agent": "discovery", "port": 8001}


def sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@app.get("/discover/stream")
async def discover_stream(query: str, max_results: int = 15):
    """SSE endpoint — streams real-time paper fetching progress to the frontend."""

    async def event_generator() -> AsyncGenerator[str, None]:
        start = time.time()
        fetch_limit = max_results * 2  # fetch more so both sources contribute after dedup

        yield sse_event({"type": "start", "query": query, "max_results": max_results,
                         "ts": datetime.utcnow().isoformat()})

        # ── arXiv ──────────────────────────────────────────────
        yield sse_event({"type": "source_start", "source": "arxiv",
                         "message": "Connecting to arXiv API...",
                         "ts": datetime.utcnow().isoformat()})
        arxiv_papers: List[Paper] = []
        try:
            arxiv_papers = await asyncio.wait_for(
                fetch_arxiv_papers(query, fetch_limit, 1), timeout=35.0
            )
            for i, paper in enumerate(arxiv_papers):
                yield sse_event({
                    "type": "paper",
                    "source": "arxiv",
                    "index": i + 1,
                    "total": len(arxiv_papers),
                    "title": paper.title[:80],
                    "status": "ok",
                    "ts": datetime.utcnow().isoformat(),
                })
                await asyncio.sleep(0)
            yield sse_event({"type": "source_done", "source": "arxiv",
                             "count": len(arxiv_papers),
                             "ts": datetime.utcnow().isoformat()})
        except asyncio.TimeoutError:
            yield sse_event({"type": "source_error", "source": "arxiv",
                             "error": "Timeout after 35s",
                             "ts": datetime.utcnow().isoformat()})
        except Exception as e:
            yield sse_event({"type": "source_error", "source": "arxiv",
                             "error": str(e)[:120],
                             "ts": datetime.utcnow().isoformat()})

        # ── Semantic Scholar ───────────────────────────────────
        yield sse_event({"type": "source_start", "source": "semantic_scholar",
                         "message": "Connecting to Semantic Scholar API...",
                         "ts": datetime.utcnow().isoformat()})
        ss_papers: List[Paper] = []
        try:
            ss_papers = await fetch_semantic_scholar_papers(query, fetch_limit)
            for i, paper in enumerate(ss_papers):
                yield sse_event({
                    "type": "paper",
                    "source": "semantic_scholar",
                    "index": i + 1,
                    "total": len(ss_papers),
                    "title": paper.title[:80],
                    "status": "ok",
                    "ts": datetime.utcnow().isoformat(),
                })
                await asyncio.sleep(0)
            yield sse_event({"type": "source_done", "source": "semantic_scholar",
                             "count": len(ss_papers),
                             "ts": datetime.utcnow().isoformat()})
        except Exception as e:
            yield sse_event({"type": "source_error", "source": "semantic_scholar",
                             "error": str(e)[:120],
                             "ts": datetime.utcnow().isoformat()})

        # ── Dedup + rank + slice to max_results ────────────────
        all_papers = deduplicate_papers(arxiv_papers + ss_papers)
        all_papers = rank_papers(all_papers, query)
        final_papers = all_papers[:max_results]
        arxiv_in_final = sum(1 for p in final_papers if p.source == "arxiv")
        ss_in_final = sum(1 for p in final_papers if p.source == "semantic_scholar")
        elapsed = round((time.time() - start) * 1000, 1)

        yield sse_event({
            "type": "done",
            "total_found": len(final_papers),
            "duplicates_removed": len(arxiv_papers) + len(ss_papers) - len(all_papers),
            "arxiv_in_final": arxiv_in_final,
            "ss_in_final": ss_in_final,
            "elapsed_ms": elapsed,
            "ts": datetime.utcnow().isoformat(),
        })

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/discover", response_model=DiscoveryResponse)
async def discover(request: DiscoveryRequest):
    """Main discovery endpoint — fetches and ranks papers from multiple sources."""
    start = time.time()
    print(f"[Discovery] Query: {request.query!r}, sources: {request.sources}")

    # Fetch 2x from each source so after dedup we still have enough to fill max_results
    fetch_limit = request.max_results * 2

    # Run arXiv first, then Semantic Scholar sequentially
    # This gives SS a natural delay after the previous request cycle
    arxiv_papers: List[Paper] = []
    ss_papers: List[Paper] = []
    sources_used = []

    if "arxiv" in request.sources:
        try:
            arxiv_papers = await asyncio.wait_for(
                fetch_arxiv_papers(request.query, fetch_limit, request.page), timeout=35.0
            )
            sources_used.append("arxiv")
            print(f"[Discovery] arxiv: {len(arxiv_papers)} papers fetched")
        except Exception as e:
            print(f"[Discovery] arXiv error: {e}")

    if "semantic_scholar" in request.sources:
        ss_papers = await fetch_semantic_scholar_papers(request.query, fetch_limit)
        if ss_papers:
            sources_used.append("semantic_scholar")

    all_papers = arxiv_papers + ss_papers

    all_papers = deduplicate_papers(all_papers)
    all_papers = rank_papers(all_papers, request.query)
    total = len(all_papers)

    # Slice to requested max_results after ranking
    start_idx = (request.page - 1) * request.max_results
    paginated = all_papers[start_idx: start_idx + request.max_results]

    elapsed = (time.time() - start) * 1000
    print(f"[Discovery] Returning {len(paginated)}/{total} papers in {elapsed:.0f}ms")

    return DiscoveryResponse(
        papers=paginated,
        total_found=total,
        query=request.query,
        sources_used=sources_used,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
