"""
Citation Agent — Port 8004
Generates APA, MLA, and IEEE citations for research papers.
Supports bulk export.
"""
import os
import sys
import time
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))
from shared.models import Paper, CitationRequest, CitationResponse, PaperCitations

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

app = FastAPI(title="Orchestrix Citation Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def format_authors_apa(authors: List[str]) -> str:
    """Format authors for APA: Last, F. M., & Last, F. M."""
    formatted = []
    for author in authors[:6]:
        parts = author.strip().split()
        if len(parts) >= 2:
            last = parts[-1]
            initials = "".join(f"{p[0]}." for p in parts[:-1])
            formatted.append(f"{last}, {initials}")
        else:
            formatted.append(author)
    if len(authors) > 6:
        formatted.append("et al.")
        result = ", ".join(formatted[:6])
    elif len(formatted) > 1:
        result = ", ".join(formatted[:-1]) + f", & {formatted[-1]}"
    else:
        result = formatted[0] if formatted else "Unknown Author"
    return result


def format_authors_mla(authors: List[str]) -> str:
    """Format authors for MLA: Last, First, and First Last."""
    if not authors:
        return "Unknown Author"
    formatted_first = _invert_name(authors[0])
    if len(authors) == 1:
        return formatted_first
    elif len(authors) == 2:
        return f"{formatted_first}, and {authors[1]}"
    else:
        return f"{formatted_first}, et al."


def format_authors_ieee(authors: List[str]) -> str:
    """Format authors for IEEE: F. M. Last, F. M. Last, ..."""
    formatted = []
    for author in authors[:6]:
        parts = author.strip().split()
        if len(parts) >= 2:
            last = parts[-1]
            initials = " ".join(f"{p[0]}." for p in parts[:-1])
            formatted.append(f"{initials} {last}")
        else:
            formatted.append(author)
    if len(authors) > 6:
        return ", ".join(formatted[:6]) + " et al."
    return ", ".join(formatted)


def _invert_name(name: str) -> str:
    """Last, First format."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return f"{parts[-1]}, {' '.join(parts[:-1])}"
    return name


def generate_apa(paper: Paper) -> str:
    """
    APA 7th Edition:
    Authors (Year). Title. Venue/Source. URL
    """
    authors = format_authors_apa(paper.authors)
    year = f"({paper.year})" if paper.year else "(n.d.)"
    title = paper.title.strip()
    venue = paper.venue or "arXiv preprint"
    url = paper.url

    return f"{authors} {year}. {title}. *{venue}*. {url}"


def generate_mla(paper: Paper) -> str:
    """
    MLA 9th Edition:
    Authors. "Title." Venue, Year, URL.
    """
    authors = format_authors_mla(paper.authors)
    title = paper.title.strip()
    venue = paper.venue or "arXiv"
    year = str(paper.year) if paper.year else "n.d."
    url = paper.url

    return f'{authors}. "{title}." *{venue}*, {year}. {url}.'


def generate_ieee(paper: Paper) -> str:
    """
    IEEE:
    [N] Authors, "Title," Venue, Year. [Online]. Available: URL
    """
    authors = format_authors_ieee(paper.authors)
    title = paper.title.strip()
    venue = paper.venue or "arXiv preprint"
    year = str(paper.year) if paper.year else "n.d."
    url = paper.url

    return f'{authors}, "{title}," *{venue}*, {year}. [Online]. Available: {url}'


def build_bulk_export(citations: List[PaperCitations]) -> dict:
    """Build bulk export strings for each format."""
    apa_lines = [f"[{i+1}] {c.apa}" for i, c in enumerate(citations)]
    mla_lines = [f"{c.mla}" for c in citations]
    ieee_lines = [f"[{i+1}] {c.ieee}" for i, c in enumerate(citations)]
    return {
        "apa": "\n\n".join(apa_lines),
        "mla": "\n\n".join(mla_lines),
        "ieee": "\n\n".join(ieee_lines),
    }


@app.get("/health")
async def health():
    return {"status": "ok", "agent": "citation", "port": 8004}


@app.post("/cite", response_model=CitationResponse)
async def cite(request: CitationRequest):
    """Main citation generation endpoint."""
    start = time.time()
    print(f"[Citation] Generating citations for {len(request.papers)} papers")

    citations: List[PaperCitations] = []
    for paper in request.papers:
        pc = PaperCitations(
            paper_id=paper.id,
            title=paper.title,
            apa=generate_apa(paper) if "apa" in request.formats else "",
            mla=generate_mla(paper) if "mla" in request.formats else "",
            ieee=generate_ieee(paper) if "ieee" in request.formats else "",
        )
        citations.append(pc)

    bulk = build_bulk_export(citations)
    elapsed = (time.time() - start) * 1000
    print(f"[Citation] Completed in {elapsed:.0f}ms")

    return CitationResponse(citations=citations, bulk_export=bulk)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004, reload=False)
