import os
import sys
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

# Ensure project root is in path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))
from shared.models import SynthesisRequest, SynthesisResponse
from agents.synthesis.synthesis_logic import SynthesisEngine

app = FastAPI(title="Orchestrix Synthesis Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SynthesisEngine()

@app.post("/synthesize", response_model=SynthesisResponse)
async def synthesize_papers(request: SynthesisRequest):
    """
    Synthesizes multiple papers into a single cohesive research document.
    """
    try:
        response = await engine.synthesize(request)
        return response
    except Exception as e:
        print(f"[Synthesis Agent] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "agent": "synthesis"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8006)
