#!/bin/bash
# ============================================================
# Orchestrix — Start All Services
# ============================================================
# Usage: ./start_all.sh
# Starts all agents and orchestrator in background processes.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

echo "╔══════════════════════════════════════════════╗"
echo "║          ORCHESTRIX — STARTING UP           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Copy env if not exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "⚠️  Created .env from template. Please edit $BACKEND_DIR/.env with your API keys."
fi

# Setup Virtual Environment
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "🌐 Creating virtual environment with Python 3.12..."
    python3.12 -m venv "$BACKEND_DIR/venv"
fi
source "$BACKEND_DIR/venv/bin/activate"

# Install dependencies
echo "📦 Installing Python dependencies..."
cd "$BACKEND_DIR"
python3 -m pip install -r requirements.txt -q

echo ""
echo "🚀 Starting agents..."
echo ""

# Discovery Agent (port 8001)
echo "  [8001] Discovery Agent..."
cd "$BACKEND_DIR/agents/discovery"
PYTHONPATH="$BACKEND_DIR" python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 > "$LOG_DIR/discovery.log" 2>&1 &
echo "         PID: $!"

# Analysis Agent (port 8002)
echo "  [8002] Analysis Agent..."
cd "$BACKEND_DIR/agents/analysis"
PYTHONPATH="$BACKEND_DIR" python3 -m uvicorn main:app --host 0.0.0.0 --port 8002 > "$LOG_DIR/analysis.log" 2>&1 &
echo "         PID: $!"

# Summary Agent (port 8003)
echo "  [8003] Summary Agent..."
cd "$BACKEND_DIR/agents/summary"
PYTHONPATH="$BACKEND_DIR" python3 -m uvicorn main:app --host 0.0.0.0 --port 8003 > "$LOG_DIR/summary.log" 2>&1 &
echo "         PID: $!"

# Citation Agent (port 8004)
echo "  [8004] Citation Agent..."
cd "$BACKEND_DIR/agents/citation"
PYTHONPATH="$BACKEND_DIR" python3 -m uvicorn main:app --host 0.0.0.0 --port 8004 > "$LOG_DIR/citation.log" 2>&1 &
echo "         PID: $!"

# Chat Agent (port 8005)
echo "  [8005] Chat Agent..."
cd "$BACKEND_DIR/agents/chat"
PYTHONPATH="$BACKEND_DIR" python3 -m uvicorn main:app --host 0.0.0.0 --port 8005 > "$LOG_DIR/chat.log" 2>&1 &
echo "         PID: $!"

# Wait for agents to start
sleep 3

# Orchestrator (port 8000)
echo "  [8000] Orchestrator..."
cd "$BACKEND_DIR/orchestrator"
PYTHONPATH="$BACKEND_DIR" python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/orchestrator.log" 2>&1 &
echo "         PID: $!"

sleep 2
echo ""
echo "✅ All services started!"
echo ""
echo "  Orchestrator:    http://127.0.0.1:8000"
echo "  Discovery:       http://127.0.0.1:8001"
echo "  Analysis:        http://127.0.0.1:8002"
echo "  Summary:         http://127.0.0.1:8003"
echo "  Citation:        http://127.0.0.1:8004"
echo ""
echo "  Logs: $LOG_DIR/"
echo ""
echo "  API Docs: http://127.0.0.1:8000/docs"
echo ""
echo "To stop all services: pkill -f uvicorn"
