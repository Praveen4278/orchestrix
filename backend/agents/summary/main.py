"""
Summary & Synthesis Agent — Port 8003
Uses OpenAI to summarize individual papers and synthesize insights
across multiple papers. Detects contradictions and research gaps.
"""
import os
import sys
import time
import json
import asyncio
from typing import List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))
from shared.models import (
    Paper, SummaryRequest, SummaryResponse,
    SinglePaperSummary, SynthesisResult,
    AudioBriefingRequest, AudioBriefingResponse
)
from agents.summary.audio_engine import AudioBriefingEngine

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

app = FastAPI(title="Orchestrix Summary Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM Configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def get_llm_response(prompt: str, temperature: float = 0.3, max_tokens: int = 1000) -> str:
    """Helper to get response from either OpenAI or Ollama."""
    if LLM_PROVIDER == "ollama":
        try:
            print(f"[Summary] Requesting Ollama ({OLLAMA_MODEL})")
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": OLLAMA_MODEL,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        "options": {
                            "temperature": temperature,
                        }
                    }
                )
                response.raise_for_status()
                data = response.json()
                if "error" in data:
                    raise Exception(f"Ollama API Error: {data['error']}")
                return data["response"]
        except Exception as e:
            print(f"[Summary] Ollama error ({type(e).__name__}): {e}")
            raise e
    else:
        try:
            print(f"[Summary] Requesting OpenAI (gpt-4o-mini)")
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[Summary] OpenAI error ({type(e).__name__}): {e}")
            raise e

SINGLE_SUMMARY_PROMPT = """You are a research paper analyst. Analyze the following paper and return a JSON response.

Paper Title: {title}
Authors: {authors}
Year: {year}
Abstract: {abstract}

Return ONLY valid JSON with this exact structure:
{{
  "summary": "2-3 sentence summary of the paper",
  "key_contributions": ["contribution 1", "contribution 2", "contribution 3"],
  "methodology": "Brief description of methodology used",
  "limitations": ["limitation 1", "limitation 2"],
  "eli5_summary": "Explain this paper like I am 5 years old in 2-3 simple sentences"
}}"""

SYNTHESIS_PROMPT = """You are a senior research scientist synthesizing multiple research papers.

Papers:
{papers_text}

Analyze these papers together and return ONLY valid JSON with this structure:
{{
  "common_themes": ["theme 1", "theme 2", "theme 3"],
  "contradictions": [
    {{"papers": "Paper A vs Paper B", "issue": "description of contradiction"}}
  ],
  "research_gaps": ["gap 1", "gap 2", "gap 3"],
  "research_roadmap": [
    {{"step": 1, "title": "Foundation", "description": "Start with...", "papers": ["paper title"]}},
    {{"step": 2, "title": "Core Methods", "description": "Then study...", "papers": ["paper title"]}},
    {{"step": 3, "title": "Advanced Topics", "description": "Finally explore...", "papers": []}}
  ],
  "future_trends": ["trend 1", "trend 2", "trend 3"],
  "overall_summary": "3-4 sentence overview of the research landscape"
}}"""


def format_papers_for_prompt(papers: List[Paper]) -> str:
    lines = []
    for i, paper in enumerate(papers[:10], 1):
        lines.append(
            f"{i}. Title: {paper.title}\n"
            f"   Authors: {', '.join(paper.authors[:3])}\n"
            f"   Year: {paper.year}\n"
            f"   Abstract: {paper.abstract[:300]}...\n"
        )
    return "\n".join(lines)


def robust_json_load(content: str) -> dict:
    """Attempt to parse JSON even if the model included extra text or markdown."""
    content = content.strip()
    if content.startswith("```json"):
        content = content.replace("```json", "", 1)
    if content.endswith("```"):
        content = content.rsplit("```", 1)[0]
    content = content.strip()
    
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"[Summary] JSON parse error: {e}")
        print(f"[Summary] Raw content: {content[:500]}...")
        # If standard load fails, try finding the first '{' and last '}'
        start = content.find('{')
        end = content.rfind('}')
        if start != -1 and end != -1:
            try:
                return json.loads(content[start:end+1])
            except:
                pass
        raise


async def summarize_single_paper(paper: Paper, eli5: bool) -> SinglePaperSummary:
    """Summarize a single paper using OpenAI or Ollama."""
    prompt = SINGLE_SUMMARY_PROMPT.format(
        title=paper.title,
        authors=", ".join(paper.authors[:4]),
        year=paper.year,
        abstract=paper.abstract[:600],
    )
    try:
        content = await get_llm_response(prompt, temperature=0.3, max_tokens=600)
        data = robust_json_load(content)
        return SinglePaperSummary(
            paper_id=paper.id,
            title=paper.title,
            summary=data.get("summary", "Summary unavailable."),
            key_contributions=data.get("key_contributions", []),
            methodology=data.get("methodology", "Not specified."),
            limitations=data.get("limitations", []),
            eli5_summary=data.get("eli5_summary") if eli5 else None,
        )
    except Exception as e:
        print(f"[Summary] Error summarizing paper {paper.id}: {e}")
        return SinglePaperSummary(
            paper_id=paper.id,
            title=paper.title,
            summary=f"Summary unavailable: {str(e)[:100]}",
            key_contributions=[],
            methodology="N/A",
            limitations=[],
        )


async def synthesize_papers(papers: List[Paper]) -> SynthesisResult:
    """Synthesize insights across multiple papers using OpenAI or Ollama."""
    papers_text = format_papers_for_prompt(papers)
    prompt = SYNTHESIS_PROMPT.format(papers_text=papers_text)
    try:
        content = await get_llm_response(prompt, temperature=0.4, max_tokens=1500)
        data = robust_json_load(content)
        return SynthesisResult(
            common_themes=data.get("common_themes", []),
            contradictions=data.get("contradictions", []),
            research_gaps=data.get("research_gaps", []),
            research_roadmap=data.get("research_roadmap", []),
            future_trends=data.get("future_trends", []),
            overall_summary=data.get("overall_summary", ""),
        )
    except Exception as e:
        print(f"[Summary] Synthesis error: {e}")
        return SynthesisResult(
            common_themes=[],
            contradictions=[],
            research_gaps=[f"Error during synthesis: {str(e)[:100]}"],
            research_roadmap=[],
            future_trends=[],
            overall_summary="Synthesis unavailable.",
        )


@app.get("/health")
async def health():
    return {"status": "ok", "agent": "summary", "port": 8003}


@app.post("/summarize", response_model=SummaryResponse)
async def summarize(request: SummaryRequest):
    """Main summarization endpoint."""
    start = time.time()
    papers = request.papers
    print(f"[Summary] Mode={request.mode}, papers={len(papers)}, eli5={request.eli5_mode}")

    if not papers:
        raise HTTPException(status_code=400, detail="No papers provided")

    import asyncio

    if request.mode == "single" and request.target_paper_id:
        # Summarize one specific paper
        target = next((p for p in papers if p.id == request.target_paper_id), papers[0])
        summary = await summarize_single_paper(target, request.eli5_mode)
        return SummaryResponse(mode="single", individual_summaries=[summary])

    # Summarize all papers + synthesize
    # If using local LLM, run sequentially to avoid resource contention
    # Increased limit to 5 for Ollama, 15 for OpenAI
    limit = 5 if LLM_PROVIDER == "ollama" else 15
    papers_to_summarize = papers[:limit]
    
    individual_summaries = []
    
    if LLM_PROVIDER == "ollama":
        print(f"[Summary] Running up to {len(papers_to_summarize)} summaries sequentially for Ollama...")
        for p in papers_to_summarize:
            try:
                # Add a smaller timeout per paper to keep things moving
                summary = await asyncio.wait_for(summarize_single_paper(p, request.eli5_mode), timeout=60.0)
                individual_summaries.append(summary)
            except asyncio.TimeoutError:
                print(f"[Summary] Timeout summarizing paper {p.id}")
                individual_summaries.append(SinglePaperSummary(
                    paper_id=p.id,
                    title=p.title,
                    summary="Summary timed out (Ollama is currently under heavy load).",
                    key_contributions=[],
                    methodology="N/A",
                    limitations=[]
                ))
            except Exception as e:
                print(f"[Summary] Error summarizing paper {p.id}: {e}")
                individual_summaries.append(SinglePaperSummary(
                    paper_id=p.id,
                    title=p.title,
                    summary=f"Summary failed: {str(e)[:100]}",
                    key_contributions=[],
                    methodology="N/A",
                    limitations=[]
                ))
    else:
        print(f"[Summary] Running {len(papers_to_summarize)} summaries in parallel for OpenAI...")
        summary_tasks = [
            summarize_single_paper(p, request.eli5_mode)
            for p in papers_to_summarize
        ]
        individual_summaries = await asyncio.gather(*summary_tasks)

    synthesis = None
    if len(papers) > 1:
        synthesis = await synthesize_papers(papers)

    elapsed = (time.time() - start) * 1000
    print(f"[Summary] Completed in {elapsed:.0f}ms")

    return SummaryResponse(
        mode="multi" if len(papers) > 1 else "single",
        individual_summaries=list(individual_summaries),
        synthesis=synthesis,
    )

@app.post("/audio-briefing", response_model=AudioBriefingResponse)
async def generate_audio_briefing(request: AudioBriefingRequest):
    """Generate an AI-narrated executive briefing."""
    engine = AudioBriefingEngine()
    try:
        response = await engine.generate_briefing(request.query, request.papers)
        return response
    except Exception as e:
        print(f"[Summary] Audio briefing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003, reload=False)
