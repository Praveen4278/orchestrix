"""
Analysis Agent — Port 8002
Analyzes a list of papers to extract trends, top authors,
keyword frequency, citation distribution, and emerging topics.
"""
import os
import sys
import re
import time
from collections import Counter, defaultdict
from typing import List, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))
from shared.models import (
    Paper, AnalysisRequest, AnalysisResponse,
    YearTrend, AuthorStats, KeywordFreq,
)

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

app = FastAPI(title="Orchestrix Analysis Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stop words to filter from keyword extraction
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "this", "that", "these", "those", "we", "our",
    "paper", "proposed", "method", "approach", "using", "based", "novel",
    "show", "results", "also", "further", "however", "while", "as", "which",
    "model", "models", "task", "data", "use", "used", "can", "new", "work",
    "study", "research", "learning", "deep", "neural", "network", "networks",
}


def extract_keywords_from_text(text: str, top_n: int = 10) -> List[str]:
    """Extract meaningful n-grams from abstract text."""
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    words = [w for w in words if w not in STOP_WORDS]
    counts = Counter(words)
    # bigrams
    for i in range(len(words) - 1):
        bigram = f"{words[i]} {words[i+1]}"
        if len(bigram) > 8:
            counts[bigram] = counts.get(bigram, 0) + 2
    return [kw for kw, _ in counts.most_common(top_n)]


def compute_publication_trends(papers: List[Paper]) -> List[YearTrend]:
    year_counts: Dict[int, int] = Counter(p.year for p in papers if p.year)
    return sorted(
        [YearTrend(year=y, count=c) for y, c in year_counts.items()],
        key=lambda x: x.year
    )


def compute_top_authors(papers: List[Paper]) -> List[AuthorStats]:
    author_papers: Dict[str, int] = defaultdict(int)
    author_citations: Dict[str, int] = defaultdict(int)
    for paper in papers:
        for author in paper.authors:
            if author and len(author.strip()) > 1:
                author_papers[author] += 1
                author_citations[author] += paper.citation_count
    combined = [
        AuthorStats(
            name=name,
            paper_count=author_papers[name],
            total_citations=author_citations[name],
        )
        for name in author_papers
    ]
    return sorted(combined, key=lambda a: (a.paper_count, a.total_citations), reverse=True)[:15]


def compute_keyword_frequency(papers: List[Paper]) -> List[KeywordFreq]:
    all_keywords: List[str] = []
    for paper in papers:
        # Use tagged keywords
        all_keywords.extend([kw.lower() for kw in paper.keywords if kw])
        # Also extract from title
        title_words = [
            w for w in re.findall(r'\b[a-z]{4,}\b', paper.title.lower())
            if w not in STOP_WORDS
        ]
        all_keywords.extend(title_words)

    counts = Counter(all_keywords)
    return [
        KeywordFreq(keyword=kw, count=cnt)
        for kw, cnt in counts.most_common(30)
        if len(kw) > 2
    ]


def compute_citation_distribution(papers: List[Paper]) -> Dict[str, int]:
    buckets = {
        "0": 0, "1-10": 0, "11-50": 0,
        "51-200": 0, "201-500": 0, "500+": 0,
    }
    for paper in papers:
        c = paper.citation_count
        if c == 0:
            buckets["0"] += 1
        elif c <= 10:
            buckets["1-10"] += 1
        elif c <= 50:
            buckets["11-50"] += 1
        elif c <= 200:
            buckets["51-200"] += 1
        elif c <= 500:
            buckets["201-500"] += 1
        else:
            buckets["500+"] += 1
    return buckets


def detect_emerging_topics(papers: List[Paper]) -> List[str]:
    """
    Detect topics appearing mostly in recent papers (last 2 years)
    vs older ones, indicating growth.
    """
    if not papers:
        return []
    max_year = max((p.year for p in papers if p.year), default=2024)
    recent = [p for p in papers if p.year and p.year >= max_year - 2]
    older = [p for p in papers if p.year and p.year < max_year - 2]

    def kw_set(group: List[Paper]) -> Counter:
        c: Counter = Counter()
        for p in group:
            words = re.findall(r'\b[a-z]{4,}\b', f"{p.title} {p.abstract}".lower())
            for w in words:
                if w not in STOP_WORDS:
                    c[w] += 1
        return c

    recent_kw = kw_set(recent)
    older_kw = kw_set(older)

    emerging = []
    for kw, cnt in recent_kw.most_common(50):
        old_cnt = older_kw.get(kw, 0)
        # Keyword appears significantly more in recent papers
        if cnt >= 2 and (old_cnt == 0 or cnt / max(old_cnt, 1) > 1.8):
            emerging.append(kw)
        if len(emerging) >= 10:
            break
    return emerging


@app.get("/health")
async def health():
    return {"status": "ok", "agent": "analysis", "port": 8002}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    """Main analysis endpoint."""
    start = time.time()
    papers = request.papers
    print(f"[Analysis] Analyzing {len(papers)} papers")

    if not papers:
        return AnalysisResponse(
            publication_trends=[],
            top_authors=[],
            keyword_frequency=[],
            citation_distribution={},
            emerging_topics=[],
            total_papers=0,
            avg_citations=0.0,
            year_range={"min": 0, "max": 0},
        )

    trends = compute_publication_trends(papers)
    authors = compute_top_authors(papers)
    keywords = compute_keyword_frequency(papers)
    citation_dist = compute_citation_distribution(papers)
    emerging = detect_emerging_topics(papers)

    valid_years = [p.year for p in papers if p.year]
    avg_citations = sum(p.citation_count for p in papers) / len(papers)

    elapsed = (time.time() - start) * 1000
    print(f"[Analysis] Completed in {elapsed:.0f}ms")

    return AnalysisResponse(
        publication_trends=trends,
        top_authors=authors,
        keyword_frequency=keywords,
        citation_distribution=citation_dist,
        emerging_topics=emerging,
        total_papers=len(papers),
        avg_citations=round(avg_citations, 1),
        year_range={
            "min": min(valid_years) if valid_years else 0,
            "max": max(valid_years) if valid_years else 0,
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, reload=False)
