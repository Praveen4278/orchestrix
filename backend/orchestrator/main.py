"""
Orchestrix Orchestrator — Port 8000
Central brain that coordinates all agents, manages sessions in MongoDB,
and supports both sequential and parallel execution strategies.
"""
import os
import sys
import asyncio
import time
import uuid
from typing import Optional, Dict, List, Any
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "../"))
from shared.models import (
    QueryRequest, OrchestratorResponse, AgentTrace,
    DiscoveryRequest, AnalysisRequest, SummaryRequest, CitationRequest,
    Paper, AnalysisResponse, SummaryResponse, CitationResponse,
    Session,
)

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

app = FastAPI(title="Orchestrix Orchestrator", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── MongoDB ──────────────────────────────────────────────────
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "orchestrix")
mongo_client: Optional[AsyncIOMotorClient] = None
db = None


@app.on_event("startup")
async def startup():
    global mongo_client, db
    try:
        mongo_client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        await mongo_client.admin.command("ping")
        db = mongo_client[DB_NAME]
        print(f"[Orchestrator] MongoDB connected: {MONGODB_URI}")
    except Exception as e:
        print(f"[Orchestrator] MongoDB unavailable: {e}. Sessions won't persist.")
        db = None


@app.on_event("shutdown")
async def shutdown():
    if mongo_client:
        mongo_client.close()


# ─── Default Agent URLs ───────────────────────────────────────
DEFAULT_SINGLE_URLS = {
    "discovery": os.getenv("DISCOVERY_AGENT_URL", "http://127.0.0.1:8001"),
    "analysis": os.getenv("ANALYSIS_AGENT_URL", "http://127.0.0.1:8002"),
    "summary": os.getenv("SUMMARY_AGENT_URL", "http://127.0.0.1:8003"),
    "citation": os.getenv("CITATION_AGENT_URL", "http://127.0.0.1:8004"),
}


def get_agent_urls(request: QueryRequest) -> Dict[str, str]:
    """Resolve agent URLs based on execution mode."""
    if request.execution_mode == "multi" and request.agent_urls:
        return {**DEFAULT_SINGLE_URLS, **request.agent_urls}
    return DEFAULT_SINGLE_URLS


# ─── Agent Communication Helpers ─────────────────────────────
async def call_discovery(
    base_url: str, query: str, max_results: int, trace: List[AgentTrace]
) -> Optional[List[Paper]]:
    t0 = time.time()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/discover",
                json=DiscoveryRequest(query=query, max_results=max_results).model_dump(),
            )
            resp.raise_for_status()
            data = resp.json()
            papers = [Paper(**p) for p in data["papers"]]
            trace.append(AgentTrace(
                agent="discovery",
                status="completed",
                duration_ms=round((time.time() - t0) * 1000, 1),
            ))
            return papers
    except Exception as e:
        trace.append(AgentTrace(agent="discovery", status="failed", error=str(e)[:120]))
        print(f"[Orchestrator] Discovery failed: {e}")
        return None


async def call_analysis(
    base_url: str, papers: List[Paper], query: str, trace: List[AgentTrace]
) -> Optional[AnalysisResponse]:
    t0 = time.time()
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{base_url}/analyze",
                json=AnalysisRequest(papers=papers, query=query).model_dump(),
            )
            resp.raise_for_status()
            result = AnalysisResponse(**resp.json())
            trace.append(AgentTrace(
                agent="analysis",
                status="completed (parallel)",
                duration_ms=round((time.time() - t0) * 1000, 1),
            ))
            return result
    except Exception as e:
        trace.append(AgentTrace(agent="analysis", status="failed", error=str(e)[:120]))
        print(f"[Orchestrator] Analysis failed: {e}")
        return None


async def call_summary(
    base_url: str, papers: List[Paper], eli5: bool, trace: List[AgentTrace]
) -> Optional[SummaryResponse]:
    t0 = time.time()
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{base_url}/summarize",
                json=SummaryRequest(
                    papers=papers, mode="multi", eli5_mode=eli5
                ).model_dump(),
            )
            resp.raise_for_status()
            result = SummaryResponse(**resp.json())
            trace.append(AgentTrace(
                agent="summary",
                status="completed (parallel)",
                duration_ms=round((time.time() - t0) * 1000, 1),
            ))
            return result
    except Exception as e:
        trace.append(AgentTrace(agent="summary", status="failed", error=str(e)[:120]))
        print(f"[Orchestrator] Summary failed: {e}")
        return None


async def call_citation(
    base_url: str, papers: List[Paper], trace: List[AgentTrace]
) -> Optional[CitationResponse]:
    t0 = time.time()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{base_url}/cite",
                json=CitationRequest(papers=papers).model_dump(),
            )
            resp.raise_for_status()
            result = CitationResponse(**resp.json())
            trace.append(AgentTrace(
                agent="citation",
                status="completed",
                duration_ms=round((time.time() - t0) * 1000, 1),
            ))
            return result
    except Exception as e:
        trace.append(AgentTrace(agent="citation", status="failed", error=str(e)[:120]))
        print(f"[Orchestrator] Citation failed: {e}")
        return None


# ─── Session Persistence ──────────────────────────────────────
async def save_session(session_data: dict):
    if db is None:
        return
    try:
        await db.sessions.insert_one(session_data)
    except Exception as e:
        print(f"[Orchestrator] Failed to save session: {e}")


async def get_session_from_db(session_id: str) -> Optional[dict]:
    if db is None:
        return None
    return await db.sessions.find_one({"session_id": session_id}, {"_id": 0})


# ─── Main Orchestration Logic ─────────────────────────────────
@app.post("/query", response_model=OrchestratorResponse)
async def run_query(request: QueryRequest):
    """
    Main orchestration endpoint.
    
    Execution strategy:
    1. Discovery Agent (sequential — must run first)
    2. If papers > 5: Analysis + Summary in PARALLEL (asyncio.gather)
    3. Citation Agent (after papers available)
    """
    t_global = time.time()
    session_id = str(uuid.uuid4())
    trace: List[AgentTrace] = []
    urls = get_agent_urls(request)

    print(f"[Orchestrator] Session {session_id} | Mode: {request.execution_mode}")
    print(f"[Orchestrator] Query: {request.query!r}")
    print(f"[Orchestrator] Agent URLs: {urls}")

    # ── Step 1: Discovery (always sequential) ──────────────────
    trace.append(AgentTrace(agent="discovery", status="running"))
    papers = await call_discovery(urls["discovery"], request.query, request.max_results, trace)
    # Remove last "running" trace entry (replaced by completed/failed)
    trace = [t for t in trace if not (t.agent == "discovery" and t.status == "running")]

    if not papers:
        papers = []

    # ── Step 2: Parallel Analysis + Summary ───────────────────
    analysis: Optional[AnalysisResponse] = None
    summaries: Optional[SummaryResponse] = None
    citations: Optional[CitationResponse] = None

    if len(papers) > 0:
        # Mark both as starting parallel execution
        trace.append(AgentTrace(agent="analysis", status="parallel execution — starting"))
        trace.append(AgentTrace(agent="summary", status="parallel execution — starting"))

        # Run Analysis and Summary in PARALLEL
        # Add a timeout for the entire parallel block to prevent hanging the UI
        async def analysis_with_timeout():
            try:
                return await asyncio.wait_for(
                    call_analysis(urls["analysis"], papers, request.query, trace),
                    timeout=30.0
                )
            except asyncio.TimeoutError:
                trace.append(AgentTrace(agent="analysis", status="timeout", error="Analysis timed out"))
                return None

        async def summary_with_timeout():
            try:
                return await asyncio.wait_for(
                    call_summary(urls["summary"], papers, request.eli5_mode, trace),
                    timeout=180.0
                )
            except asyncio.TimeoutError:
                trace.append(AgentTrace(agent="summary", status="timeout", error="Summary timed out"))
                return None

        a_result, s_result = await asyncio.gather(
            analysis_with_timeout(), summary_with_timeout(), return_exceptions=True
        )

        if isinstance(a_result, Exception):
            trace.append(AgentTrace(agent="analysis", status="failed", error=str(a_result)[:120]))
        elif a_result is not None:
            analysis = a_result

        if isinstance(s_result, Exception):
            trace.append(AgentTrace(agent="summary", status="failed", error=str(s_result)[:120]))
        elif s_result is not None:
            summaries = s_result

        # ── Step 3: Citations ──────────────────────────────────
        if request.generate_citations and papers:
            trace.append(AgentTrace(agent="citation", status="running"))
            citations = await call_citation(urls["citation"], papers, trace)
            trace = [t for t in trace if not (t.agent == "citation" and t.status == "running")]

    total_ms = round((time.time() - t_global) * 1000, 1)

    # ── Build response ─────────────────────────────────────────
    response = OrchestratorResponse(
        session_id=session_id,
        query=request.query,
        papers=papers,
        analysis=analysis,
        summaries=summaries,
        citations=citations,
        trace=trace,
        execution_mode=request.execution_mode,
        total_duration_ms=total_ms,
    )

    # ── Persist to MongoDB ─────────────────────────────────────
    session_doc = {
        "session_id": session_id,
        "query": request.query,
        "papers": [p.model_dump() for p in papers],
        "analysis": analysis.model_dump() if analysis else None,
        "summaries": summaries.model_dump() if summaries else None,
        "citations": citations.model_dump() if citations else None,
        "trace": [t.model_dump() for t in trace],
        "execution_mode": request.execution_mode,
        "total_duration_ms": total_ms,
        "created_at": datetime.utcnow().isoformat(),
    }
    await save_session(session_doc)

    print(f"[Orchestrator] Session {session_id} completed in {total_ms}ms")
    return response


# ─── Session History Endpoints ────────────────────────────────
@app.get("/sessions")
async def list_sessions(limit: int = 20):
    if db is None:
        return {"sessions": [], "message": "MongoDB not available"}
    cursor = db.sessions.find({}, {"_id": 0, "session_id": 1, "query": 1, "created_at": 1, "execution_mode": 1})
    cursor.sort("created_at", -1).limit(limit)
    sessions = await cursor.to_list(length=limit)
    return {"sessions": sessions}


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = await get_session_from_db(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    result = await db.sessions.delete_one({"session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True, "session_id": session_id}


# ─── Notes Endpoints ──────────────────────────────────────────
@app.post("/notes")
async def add_note(session_id: str, paper_id: str, content: str):
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    note = {
        "session_id": session_id,
        "paper_id": paper_id,
        "content": content,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.notes.insert_one(note)
    return {"saved": True}


@app.get("/notes/{session_id}")
async def get_notes(session_id: str):
    if db is None:
        return {"notes": []}
    cursor = db.notes.find({"session_id": session_id}, {"_id": 0})
    notes = await cursor.to_list(length=100)
    return {"notes": notes}


# ─── Health Check ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "agent": "orchestrator",
        "port": 8000,
        "mongodb": db is not None,
        "default_urls": DEFAULT_SINGLE_URLS,
    }


@app.get("/agents/health")
async def check_agents():
    """Check health of all downstream agents."""
    results = {}
    for name, url in DEFAULT_SINGLE_URLS.items():
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{url}/health")
                results[name] = {"status": "ok", "url": url}
        except Exception as e:
            results[name] = {"status": "unreachable", "url": url, "error": str(e)[:60]}
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
