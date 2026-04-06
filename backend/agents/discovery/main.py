"""
Discovery Agent — Port 8001
Fetches research papers from arXiv and Semantic Scholar APIs.
Uses a short-lived cache so the SSE stream and POST /discover
share one arXiv fetch per query, avoiding rate-limit errors.
"""
import os
import sys
import asyncio
import hashlib
import time
import json
import xml.etree.ElementTree as ET
from typing import List, AsyncGenerator, Dict, Tuple, Optional
from datetime import datetime

import httpx
from fastapi import FastAPI
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

ARXIV_API  = "https://export.arxiv.org/api/query"
ARXIV_NS   = {"atom": "http://www.w3.org/2005/Atom"}
SS_API     = "https://api.semanticscholar.org/graph/v1/paper/search"
CACHE_TTL  = 120  # seconds — reuse results within 2 minutes for same query

# ── In-memory cache: query_key → (timestamp, arxiv_papers, ss_papers) ────────
_cache: Dict[str, Tuple[float, List[Paper], List[Paper]]] = {}


def _cache_key(query: str, fetch_limit: int) -> str:
    return hashlib.md5(f"{query.lower().strip()}:{fetch_limit}".encode()).hexdigest()


def _get_cached(query: str, fetch_limit: int) -> Optional[Tuple[List[Paper], List[Paper]]]:
    key = _cache_key(query, fetch_limit)
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        print(f"[Discovery] Cache hit for {query!r}")
        return entry[1], entry[2]
    return None


def _set_cache(query: str, fetch_limit: int, arxiv: List[Paper], ss: List[Paper]):
    key = _cache_key(query, fetch_limit)
    _cache[key] = (time.time(), arxiv, ss)


# ── Helpers ───────────────────────────────────────────────────────────────────
def make_paper_id(source: str, identifier: str) -> str:
    return hashlib.md5(f"{source}:{identifier}".encode()).hexdigest()[:12]


def compute_relevance(title: str, abstract: str, query: str) -> float:
    query_terms = set(query.lower().split())
    text = f"{title} {abstract}".lower()
    matches = sum(1 for t in query_terms if t in text)
    return round(matches / max(len(query_terms), 1), 3)


# ── arXiv fetch ───────────────────────────────────────────────────────────────
async def fetch_arxiv_papers(query: str, max_results: int, page: int = 1) -> List[Paper]:
    papers = []
    try:
        params = {
            "search_query": f"all:{query}",
            "start": (page - 1) * max_results,
            "max_results": max_results,
            "sortBy": "relevance",
            "sortOrder": "descending",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(ARXIV_API, params=params)
            resp.raise_for_status()

        root = ET.fromstring(resp.text)
        for entry in root.findall("atom:entry", ARXIV_NS):
            title    = (entry.findtext("atom:title",   "", ARXIV_NS) or "").strip().replace("\n", " ")
            abstract = (entry.findtext("atom:summary", "", ARXIV_NS) or "").strip()[:800]
            published = entry.findtext("atom:published", "", ARXIV_NS) or ""
            year     = int(published[:4]) if published else datetime.now().year
            entry_id = entry.findtext("atom:id", "", ARXIV_NS) or ""
            arxiv_id = entry_id.split("/abs/")[-1]
            authors  = [a.findtext("atom:name", "", ARXIV_NS) for a in entry.findall("atom:author", ARXIV_NS)][:6]
            keywords = [c.get("term", "") for c in entry.findall("atom:category", ARXIV_NS)][:5]
            if not title or not arxiv_id:
                continue
            papers.append(Paper(
                id=make_paper_id("arxiv", arxiv_id),
                title=title, authors=authors, year=year, abstract=abstract,
                citation_count=0, url=entry_id, source="arxiv",
                keywords=keywords, venue="arXiv",
                relevance_score=compute_relevance(title, abstract, query),
            ))
        print(f"[Discovery] arXiv: {len(papers)} papers fetched")
    except Exception as e:
        import traceback
        print(f"[Discovery] arXiv error: {type(e).__name__}: {e}")
        traceback.print_exc()
    return papers


# ── Semantic Scholar fetch ────────────────────────────────────────────────────
async def fetch_semantic_scholar_papers(query: str, max_results: int) -> List[Paper]:
    papers = []
    try:
        params = {
            "query": query,
            "limit": min(max_results, 100),
            "fields": "title,authors,year,abstract,citationCount,externalIds,venue,fieldsOfStudy",
        }
        headers = {}
        ss_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")
        if ss_key:
            headers["x-api-key"] = ss_key

        for attempt in range(4):
            await asyncio.sleep(attempt * 3)
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(SS_API, params=params, headers=headers)
            if resp.status_code == 429:
                print(f"[Discovery] Semantic Scholar rate limited (attempt {attempt+1}/4)")
                continue
            if resp.status_code != 200:
                print(f"[Discovery] Semantic Scholar HTTP {resp.status_code}")
                break
            for item in resp.json().get("data", []):
                pid = item.get("paperId", "")
                if not pid:
                    continue
                abstract = item.get("abstract") or ""
                title    = item.get("title") or "Untitled"
                year     = item.get("year") or datetime.now().year
                authors  = [a.get("name", "") for a in item.get("authors", [])[:6]]
                ext_ids  = item.get("externalIds", {}) or {}
                url_val  = f"https://www.semanticscholar.org/paper/{pid}"
                if ext_ids.get("ArXiv"):
                    url_val = f"https://arxiv.org/abs/{ext_ids['ArXiv']}"
                papers.append(Paper(
                    id=make_paper_id("ss", pid),
                    title=title.strip(), authors=authors,
                    year=int(year) if year else datetime.now().year,
                    abstract=abstract.strip()[:800] if abstract else "No abstract available.",
                    citation_count=item.get("citationCount", 0),
                    url=url_val, source="semantic_scholar",
                    keywords=(item.get("fieldsOfStudy") or [])[:5],
                    venue=item.get("venue", ""),
                    relevance_score=compute_relevance(title, abstract or "", query),
                ))
            print(f"[Discovery] Semantic Scholar: {len(papers)} papers fetched")
            break
    except Exception as e:
        print(f"[Discovery] Semantic Scholar error: {e}")
    return papers


# ── Dedup + rank ──────────────────────────────────────────────────────────────
def deduplicate_papers(papers: List[Paper]) -> List[Paper]:
    seen, unique = set(), []
    for p in papers:
        key = " ".join(p.title.lower().split()[:6])
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


def rank_papers(papers: List[Paper], query: str) -> List[Paper]:
    """Score then interleave top papers from each source for guaranteed diversity."""
    max_cit = max((p.citation_count for p in papers), default=1) or 1
    for p in papers:
        p.relevance_score = round(0.7 * p.relevance_score + 0.3 * (p.citation_count / max_cit), 4)

    ranked = sorted(papers, key=lambda p: p.relevance_score, reverse=True)
    arxiv_list = [p for p in ranked if p.source == "arxiv"]
    ss_list    = [p for p in ranked if p.source == "semantic_scholar"]

    if not arxiv_list or not ss_list:
        return ranked

    mixed, i, j = [], 0, 0
    while i < len(arxiv_list) or j < len(ss_list):
        if i < len(arxiv_list):
            mixed.append(arxiv_list[i]); i += 1
        if j < len(ss_list):
            mixed.append(ss_list[j]); j += 1
    return mixed


# ── Shared fetch (used by both SSE stream and POST /discover) ─────────────────
async def fetch_all_papers(query: str, fetch_limit: int) -> Tuple[List[Paper], List[Paper]]:
    """Fetch from both sources, using cache to avoid duplicate arXiv calls."""
    cached = _get_cached(query, fetch_limit)
    if cached:
        return cached

    arxiv_papers = await fetch_arxiv_papers(query, fetch_limit)
    ss_papers    = await fetch_semantic_scholar_papers(query, fetch_limit)
    _set_cache(query, fetch_limit, arxiv_papers, ss_papers)
    return arxiv_papers, ss_papers


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "agent": "discovery", "port": 8001}


# ── SSE stream ────────────────────────────────────────────────────────────────
def sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@app.get("/discover/stream")
async def discover_stream(query: str, max_results: int = 15):
    """SSE endpoint — streams real-time paper fetching progress."""

    async def event_generator() -> AsyncGenerator[str, None]:
        start = time.time()
        fetch_limit = max_results * 2

        yield sse_event({"type": "start", "query": query, "max_results": max_results,
                         "ts": datetime.utcnow().isoformat()})

        # arXiv
        yield sse_event({"type": "source_start", "source": "arxiv",
                         "message": "Connecting to arXiv API...",
                         "ts": datetime.utcnow().isoformat()})
        arxiv_papers: List[Paper] = []
        try:
            arxiv_papers = await asyncio.wait_for(
                fetch_arxiv_papers(query, fetch_limit), timeout=35.0
            )
            for i, paper in enumerate(arxiv_papers):
                yield sse_event({"type": "paper", "source": "arxiv",
                                 "index": i + 1, "total": len(arxiv_papers),
                                 "title": paper.title[:80], "status": "ok",
                                 "ts": datetime.utcnow().isoformat()})
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

        # Semantic Scholar
        yield sse_event({"type": "source_start", "source": "semantic_scholar",
                         "message": "Connecting to Semantic Scholar API...",
                         "ts": datetime.utcnow().isoformat()})
        ss_papers: List[Paper] = []
        try:
            ss_papers = await fetch_semantic_scholar_papers(query, fetch_limit)
            for i, paper in enumerate(ss_papers):
                yield sse_event({"type": "paper", "source": "semantic_scholar",
                                 "index": i + 1, "total": len(ss_papers),
                                 "title": paper.title[:80], "status": "ok",
                                 "ts": datetime.utcnow().isoformat()})
                await asyncio.sleep(0)
            yield sse_event({"type": "source_done", "source": "semantic_scholar",
                             "count": len(ss_papers),
                             "ts": datetime.utcnow().isoformat()})
        except Exception as e:
            yield sse_event({"type": "source_error", "source": "semantic_scholar",
                             "error": str(e)[:120],
                             "ts": datetime.utcnow().isoformat()})

        # Cache results so /discover POST reuses them
        _set_cache(query, fetch_limit, arxiv_papers, ss_papers)

        final = rank_papers(deduplicate_papers(arxiv_papers + ss_papers), query)[:max_results]
        elapsed = round((time.time() - start) * 1000, 1)

        yield sse_event({
            "type": "done",
            "total_found": len(final),
            "duplicates_removed": len(arxiv_papers) + len(ss_papers) - len(deduplicate_papers(arxiv_papers + ss_papers)),
            "arxiv_in_final": sum(1 for p in final if p.source == "arxiv"),
            "ss_in_final": sum(1 for p in final if p.source == "semantic_scholar"),
            "elapsed_ms": elapsed,
            "ts": datetime.utcnow().isoformat(),
        })

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── POST /discover ────────────────────────────────────────────────────────────
@app.post("/discover", response_model=DiscoveryResponse)
async def discover(request: DiscoveryRequest):
    start = time.time()
    print(f"[Discovery] Query: {request.query!r}")

    fetch_limit = request.max_results * 2
    arxiv_papers, ss_papers = await fetch_all_papers(request.query, fetch_limit)

    sources_used = []
    if arxiv_papers: sources_used.append("arxiv")
    if ss_papers:    sources_used.append("semantic_scholar")

    all_papers = rank_papers(deduplicate_papers(arxiv_papers + ss_papers), request.query)
    total = len(all_papers)

    start_idx = (request.page - 1) * request.max_results
    paginated = all_papers[start_idx: start_idx + request.max_results]

    print(f"[Discovery] Returning {len(paginated)}/{total} papers "
          f"(arXiv:{sum(1 for p in paginated if p.source=='arxiv')} "
          f"SS:{sum(1 for p in paginated if p.source=='semantic_scholar')}) "
          f"in {(time.time()-start)*1000:.0f}ms")

    return DiscoveryResponse(papers=paginated, total_found=total,
                             query=request.query, sources_used=sources_used)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
