"""
Shared Pydantic models used across all agents and orchestrator.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ─── Paper Model ──────────────────────────────────────────────
class Paper(BaseModel):
    id: str
    title: str
    authors: List[str]
    year: int
    abstract: str
    citation_count: int = 0
    url: str
    source: str  # "arxiv" or "semantic_scholar"
    keywords: List[str] = []
    venue: Optional[str] = None
    relevance_score: float = 0.0


# ─── Discovery Agent Models ────────────────────────────────────
class DiscoveryRequest(BaseModel):
    query: str
    max_results: int = 20
    page: int = 1
    sources: List[str] = ["arxiv", "semantic_scholar"]


class DiscoveryResponse(BaseModel):
    papers: List[Paper]
    total_found: int
    query: str
    sources_used: List[str]


# ─── Analysis Agent Models ─────────────────────────────────────
class AnalysisRequest(BaseModel):
    papers: List[Paper]
    query: str = ""


class YearTrend(BaseModel):
    year: int
    count: int


class AuthorStats(BaseModel):
    name: str
    paper_count: int
    total_citations: int


class KeywordFreq(BaseModel):
    keyword: str
    count: int


class AnalysisResponse(BaseModel):
    publication_trends: List[YearTrend]
    top_authors: List[AuthorStats]
    keyword_frequency: List[KeywordFreq]
    citation_distribution: Dict[str, int]
    emerging_topics: List[str]
    total_papers: int
    avg_citations: float
    year_range: Dict[str, int]


# ─── Summary Agent Models ──────────────────────────────────────
class SummaryRequest(BaseModel):
    papers: List[Paper]
    mode: str = "single"  # "single" or "multi"
    eli5_mode: bool = False
    target_paper_id: Optional[str] = None


class SinglePaperSummary(BaseModel):
    paper_id: str
    title: str
    summary: str
    key_contributions: List[str]
    methodology: str
    limitations: List[str]
    eli5_summary: Optional[str] = None


class SynthesisResult(BaseModel):
    common_themes: List[str]
    contradictions: List[Dict[str, str]]
    research_gaps: List[str]
    research_roadmap: List[Dict[str, Any]]
    future_trends: List[str]
    overall_summary: str


class SummaryResponse(BaseModel):
    mode: str
    individual_summaries: List[SinglePaperSummary] = []
    synthesis: Optional[SynthesisResult] = None


# ─── Citation Agent Models ─────────────────────────────────────
class CitationRequest(BaseModel):
    papers: List[Paper]
    formats: List[str] = ["apa", "mla", "ieee"]


class PaperCitations(BaseModel):
    paper_id: str
    title: str
    apa: str
    mla: str
    ieee: str


class CitationResponse(BaseModel):
    citations: List[PaperCitations]
    bulk_export: Dict[str, str]  # format -> combined string


# ─── Orchestrator Models ───────────────────────────────────────
class QueryRequest(BaseModel):
    query: str
    max_results: int = 15
    generate_citations: bool = True
    eli5_mode: bool = False
    execution_mode: str = "single"  # "single" or "multi"
    agent_urls: Optional[Dict[str, str]] = None


class AgentTrace(BaseModel):
    agent: str
    status: str
    duration_ms: Optional[float] = None
    error: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class OrchestratorResponse(BaseModel):
    session_id: str
    query: str
    papers: List[Paper]
    analysis: Optional[AnalysisResponse] = None
    summaries: Optional[SummaryResponse] = None
    citations: Optional[CitationResponse] = None
    trace: List[AgentTrace]
    execution_mode: str
    total_duration_ms: float
    agent_conflicts: List[Dict[str, Any]] = []  # conflicts between Analysis and Summary agents
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Session Models ────────────────────────────────────────────
class Session(BaseModel):
    session_id: str
    query: str
    papers: List[Paper]
    analysis: Optional[Dict[str, Any]] = None
    summaries: Optional[Dict[str, Any]] = None
    citations: Optional[Dict[str, Any]] = None
    trace: List[Dict[str, Any]] = []
    execution_mode: str = "single"
    created_at: str


# ─── Chat Agent Models ──────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    attachments: Optional[List[Dict[str, Any]]] = None

class ChatRequest(BaseModel):
    session_id: str
    query: str
    history: List[ChatMessage] = []
    papers: List[Paper] = []
    attachments: Optional[List[Dict[str, Any]]] = None
    interview_paper_id: Optional[str] = None # New field for persona mode

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, str]] = [] # paper_id -> title/link
    history: List[ChatMessage]


# ─── Contradiction Engine Models ────────────────────────────────
class PaperClaim(BaseModel):
    paper_id: str
    title: str
    claim: str
    variable: str
    outcome: str
    methodology: Optional[str] = None

class Conflict(BaseModel):
    topic: str
    paper_1: Dict[str, str]  # id, title, claim
    paper_2: Dict[str, str]  # id, title, claim
    reason: str
    confidence: float

class ContradictionResponse(BaseModel):
    conflicts: List[Conflict]
    conflict_score: int
    total_papers_analyzed: int


# ─── Audio Briefing Models ──────────────────────────────────────
class AudioBriefingRequest(BaseModel):
    papers: List[Paper]
    query: str


class AudioBriefingResponse(BaseModel):
    script: str
    audio_base64: str  # Base64 encoded MP3
    duration_seconds: float
    total_papers: int


# ─── Paper Synthesis Models ─────────────────────────────────────
class SynthesisSection(BaseModel):
    title: str
    content: str
    key_points: List[str] = []

class SynthesizedPaper(BaseModel):
    title: str
    authors: List[str] = ["Orchestrix AI Synthesizer"]
    abstract: str
    introduction: str
    literature_review: str
    methodology: str
    results: str
    discussion: str
    conclusion: str
    references: List[str]
    session_id: str
    paper_id: str = Field(default_factory=lambda: "synthesized_" + datetime.utcnow().strftime("%Y%m%d%H%M%S"))

class SynthesisRequest(BaseModel):
    papers: List[Paper]
    session_id: str
    query: str
    style: str = "scholarly" # scholarly, simplified, executive

class SynthesisResponse(BaseModel):
    paper: SynthesizedPaper
    pdf_base64: Optional[str] = None


# ─── Agent Conflict Resolution Models ─────────────────────────────
class AgentConflict(BaseModel):
    type: str                  # "topic_disagreement" | "trend_mismatch" | "gap_vs_emerging"
    severity: str              # "low" | "medium" | "high"
    analysis_claim: str        # what the Analysis agent said
    summary_claim: str         # what the Summary agent said
    topic: str                 # the topic in dispute
    resolution_hint: str       # suggested interpretation for the user


# ─── Scheduled Digest Models ───────────────────────────────────
class DigestSchedule(BaseModel):
    id: str = Field(default_factory=lambda: "digest_" + datetime.utcnow().strftime("%Y%m%d%H%M%S%f"))
    query: str
    frequency: str              # "daily" | "weekly"
    max_results: int = 10
    last_run: Optional[str] = None
    last_paper_ids: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    active: bool = True


class DigestResult(BaseModel):
    digest_id: str
    query: str
    new_papers: List[Paper]
    total_new: int
    run_at: str

