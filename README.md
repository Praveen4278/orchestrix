# Orchestrix — Distributed Multi-Agent Research Intelligence Platform

> **"We built a configurable execution system where the platform can dynamically switch between local and distributed multi-agent execution, making it adaptable for both standalone and scalable environments."**

---

## 🏗️ Architecture

```
Frontend (React :3000)
         ↓
Orchestrator (FastAPI :8000)
         ↓
─────────────────────────────────────────
   ↓            ↓           ↓         ↓
Discovery    Analysis    Summary   Citation
Agent        Agent       Agent     Agent
(:8001)      (:8002)     (:8003)   (:8004)
─────────────────────────────────────────
         ↓
     MongoDB (:27017)
```

---

## 📁 Folder Structure

```
orchestrix/
├── start_all.sh                  ← Start all services
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── shared/
│   │   └── models.py             ← Pydantic models shared across agents
│   ├── orchestrator/
│   │   └── main.py               ← Central brain (port 8000)
│   └── agents/
│       ├── discovery/main.py     ← arXiv + Semantic Scholar (port 8001)
│       ├── analysis/main.py      ← Trend analysis (port 8002)
│       ├── summary/main.py       ← OpenAI summaries (port 8003)
│       └── citation/main.py      ← APA/MLA/IEEE (port 8004)
└── frontend/
    ├── package.json
    └── src/
        ├── App.jsx
        ├── index.jsx
        ├── store/AppContext.jsx
        ├── utils/api.js
        ├── pages/
        │   ├── ModeSelector.jsx  ← Startup mode selection
        │   ├── SearchPage.jsx    ← Query input
        │   ├── ResultsPage.jsx   ← Main dashboard
        │   └── SessionHistory.jsx
        └── components/
            ├── Layout.jsx
            ├── AgentTimeline.jsx ← Live execution trace
            ├── AnalysisDashboard.jsx ← Charts
            ├── PapersList.jsx
            ├── SummaryPanel.jsx
            └── CitationsPanel.jsx
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API key

### 1. Clone & Setup Environment

```bash
cd orchestrix/backend
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and MONGODB_URI
```

### 2. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Start All Backend Services

**Option A — One script (recommended):**
```bash
chmod +x start_all.sh
./start_all.sh
```

**Option B — Manually in separate terminals:**
```bash
# Terminal 1 — Discovery Agent
cd backend/agents/discovery
PYTHONPATH=../../ uvicorn main:app --port 8001

# Terminal 2 — Analysis Agent
cd backend/agents/analysis
PYTHONPATH=../../ uvicorn main:app --port 8002

# Terminal 3 — Summary Agent
cd backend/agents/summary
PYTHONPATH=../../ uvicorn main:app --port 8003

# Terminal 4 — Citation Agent
cd backend/agents/citation
PYTHONPATH=../../ uvicorn main:app --port 8004

# Terminal 5 — Orchestrator
cd backend/orchestrator
PYTHONPATH=../ uvicorn main:app --port 8000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm start
# Opens at http://localhost:3000
```

---

## 🌐 Distributed (Multi-Laptop) Mode

Run each agent on a different machine on the same network:

**Machine 1 (Discovery):**
```bash
cd backend/agents/discovery
PYTHONPATH=../../ uvicorn main:app --host 0.0.0.0 --port 8001
```

**Machine 2 (Analysis):**
```bash
cd backend/agents/analysis
PYTHONPATH=../../ uvicorn main:app --host 0.0.0.0 --port 8002
```

**Machine 3 (Summary + Citation):**
```bash
# Two agents on same machine, different ports
PYTHONPATH=../../ uvicorn backend/agents/summary/main:app --host 0.0.0.0 --port 8003
PYTHONPATH=../../ uvicorn backend/agents/citation/main:app --host 0.0.0.0 --port 8004
```

**Orchestrator machine:**
```bash
# Update .env with actual IPs:
DISCOVERY_AGENT_URL=http://192.168.1.10:8001
ANALYSIS_AGENT_URL=http://192.168.1.11:8002
SUMMARY_AGENT_URL=http://192.168.1.12:8003
CITATION_AGENT_URL=http://192.168.1.13:8004

uvicorn orchestrator/main:app --host 0.0.0.0 --port 8000
```

When opening the frontend, choose **"Multi Laptop Mode"** and enter the IP addresses.

---

## 🔌 API Reference

### POST /query
```json
{
  "query": "transformer attention mechanisms",
  "max_results": 15,
  "generate_citations": true,
  "eli5_mode": false,
  "execution_mode": "single"
}
```

Response includes: `session_id`, `papers`, `analysis`, `summaries`, `citations`, `trace`

### GET /sessions
Returns list of all past sessions.

### GET /sessions/{session_id}
Returns full session data.

### GET /agents/health
Returns health status of all downstream agents.

---

## 🧠 Orchestration Strategy

```
Discovery → always first (sequential)
              ↓
        papers.length > 0?
              ↓
    asyncio.gather(Analysis, Summary)  ← PARALLEL
              ↓
           Citations
```

The orchestrator trace shows:
```json
[
  {"agent": "discovery", "status": "completed", "duration_ms": 2100},
  {"agent": "analysis", "status": "completed (parallel)", "duration_ms": 340},
  {"agent": "summary", "status": "completed (parallel)", "duration_ms": 8200},
  {"agent": "citation", "status": "completed", "duration_ms": 12}
]
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | required |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `orchestrix` |
| `DISCOVERY_AGENT_URL` | Discovery agent URL | `http://localhost:8001` |
| `ANALYSIS_AGENT_URL` | Analysis agent URL | `http://localhost:8002` |
| `SUMMARY_AGENT_URL` | Summary agent URL | `http://localhost:8003` |
| `CITATION_AGENT_URL` | Citation agent URL | `http://localhost:8004` |

---

## 🎤 Demo Script

1. Open http://localhost:3000
2. Select **"Single Laptop Mode"** (or Multi for distributed demo)
3. Enter query: `"large language model alignment safety"`
4. Click **"Launch Research Agents"**
5. Watch the **Agent Execution Timeline** — Analysis and Summary run in parallel
6. Switch tabs: Papers → Analysis (charts) → Summary (synthesis + gaps) → Citations
7. Go to **Session History** to view/reload past research sessions

---

## 📦 Advanced Features

| Feature | Agent | Description |
|---|---|---|
| Research Gap Detector | Summary | AI identifies missing areas |
| Contradiction Finder | Summary | Conflicting conclusions between papers |
| Research Roadmap | Summary | Step-by-step learning path |
| ELI5 Mode | Summary | Simplified explanations |
| Future Trend Predictor | Summary | Predicted research direction |
| Emerging Topics | Analysis | Topics growing in recent papers |
| Relevance Ranking | Discovery | Combined TF + citation scoring |
| Bulk Citation Export | Citation | Download APA/MLA/IEEE as .txt |
