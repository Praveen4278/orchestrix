"""
Chat Agent — Port 8005
AI-powered chatbot using llama3.2 (via Ollama) to answer questions 
based on research papers. Supports history, RAG-like context, and citations.
"""
import os
import sys
import json
import time
from typing import List, Optional, Dict, Any
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))
from shared.models import Paper, ChatRequest, ChatResponse, ChatMessage

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

app = FastAPI(title="Orchestrix Chat Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

SYSTEM_PROMPT = """You are a specialized Research Assistant. Your goal is to help users understand research papers.
Strict Rules:
1. ONLY answer based on the provided paper context. 
2. If the answer isn't in the papers, say "I don't have enough information from the research papers to answer that."
3. ALWAYS provide citations like [Paper Title] when referencing specific findings.
4. If the user attaches an image/file, try to incorporate its context if it relates to the research.
5. Be professional, academic, and concise.

Context:
{context}
"""

INTERVIEW_PROMPT = """You are the lead author of the research paper: "{title}".
Your goal is to answer questions about YOUR study as if you were the researcher who conducted it.

Strict Rules:
1. Speak in the first person (e.g., "In our study, we found...", "We chose this methodology because...").
2. Answer ONLY based on the content of your paper.
3. Be professional, confident, and academic.
4. If asked about something not in your study, say "Our current study did not specifically investigate that aspect."
5. Maintain the specific tone and methodology of your research.

Paper Details:
Title: {title}
Authors: {authors}
Year: {year}
Abstract: {abstract}
"""

async def get_ollama_response(prompt: str, system: str, history: List[ChatMessage], attachments: Optional[List[Dict[str, Any]]] = None) -> str:
    url = f"{OLLAMA_BASE_URL}/api/chat"
    
    messages = [{"role": "system", "content": system}]
    
    # Add history
    for msg in history[-5:]: # Keep last 5 messages for context
        messages.append({"role": msg.role, "content": msg.content})
    
    # Add current user message with attachments if any
    user_content = prompt
    if attachments:
        # Simplistic attachment handling for text-based models
        # In a full vision implementation, we'd send base64 to a vision-capable model
        attachment_desc = "\n\n[Attached Files/Images Metadata]: " + ", ".join([a.get('name', 'file') for a in attachments])
        user_content += attachment_desc
        
    messages.append({"role": "user", "content": user_content})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.2}
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["message"]["content"]
    except Exception as e:
        print(f"[Chat] Ollama error: {e}")
        return f"Error connecting to Ollama: {str(e)}"

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # 1. Handle "Interview a Paper" mode vs general Research Assistant mode
    if request.interview_paper_id:
        target_paper = next((p for p in request.papers if p.id == request.interview_paper_id), None)
        if not target_paper:
            raise HTTPException(status_code=404, detail="Target paper for interview not found")
        
        system = INTERVIEW_PROMPT.format(
            title=target_paper.title,
            authors=", ".join(target_paper.authors),
            year=target_paper.year,
            abstract=target_paper.abstract
        )
        sources = [{"id": target_paper.id, "title": target_paper.title, "url": target_paper.url}]
    else:
        # Build general context from all papers
        context_parts = []
        sources = []
        for p in request.papers:
            context_parts.append(f"Title: {p.title}\nAuthors: {', '.join(p.authors)}\nYear: {p.year}\nAbstract: {p.abstract}")
            sources.append({"id": p.id, "title": p.title, "url": p.url})
        
        full_context = "\n\n---\n\n".join(context_parts)
        system = SYSTEM_PROMPT.format(context=full_context)
    
    # 2. Get AI response
    answer = await get_ollama_response(request.query, system, request.history, request.attachments)
    
    # 3. Update history
    new_history = request.history + [
        ChatMessage(role="user", content=request.query, attachments=request.attachments),
        ChatMessage(role="assistant", content=answer)
    ]
    
    return ChatResponse(
        answer=answer,
        sources=sources,
        history=new_history
    )

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "chat", "port": 8005}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005, reload=False)
