import axios from 'axios';

const ORCHESTRATOR_URL = process.env.REACT_APP_ORCHESTRATOR_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: ORCHESTRATOR_URL,
  timeout: 300000, // 5 min for AI processing
});

// ── Query ──────────────────────────────────────────────────────
export const runQuery = async (payload) => {
  const response = await api.post('/query', payload);
  return response.data;
};

// ── Sessions ──────────────────────────────────────────────────
export const fetchSessions = async () => {
  const response = await api.get('/sessions?limit=30');
  return response.data.sessions || [];
};

export const fetchSession = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data;
};

export const deleteSession = async (sessionId) => {
  const response = await api.delete(`/sessions/${sessionId}`);
  return response.data;
};

// ── Agent Health ───────────────────────────────────────────────
export const checkAgentHealth = async () => {
  const response = await api.get('/agents/health');
  return response.data;
};

export const checkOrchestratorHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// ── Notes ─────────────────────────────────────────────────────
export const addNote = async (sessionId, paperId, content) => {
  const response = await api.post('/notes', null, {
    params: { session_id: sessionId, paper_id: paperId, content }
  });
  return response.data;
};

// ── Chat ─────────────────────────────────────────────────────
export const chatWithPapers = async (payload) => {
  const response = await api.post('/chat', payload);
  return response.data;
};

export const fetchNotes = async (sessionId) => {
  const response = await api.get(`/notes/${sessionId}`);
  return response.data.notes || [];
};

// ── Graph ─────────────────────────────────────────────────────
export const fetchGraphData = async (papers, threshold = 0.25) => {
  const response = await api.post('/graph', papers, {
    params: { similarity_threshold: threshold }
  });
  return response.data;
};

export const fetchClusterSummary = async (clusterId, papers, sessionId = null) => {
  const response = await api.post('/cluster-summary', papers, {
    params: { cluster_id: clusterId, session_id: sessionId }
  });
  return response.data;
};

export const fetchContradictions = async (papers, sessionId = null) => {
  const response = await api.post('/contradictions', papers, {
    params: { session_id: sessionId }
  });
  return response.data;
};

export const fetchAudioBriefing = async (papers, query, sessionId = null) => {
  const response = await api.post('/audio-briefing', { papers, query }, {
    params: { session_id: sessionId }
  });
  return response.data;
};

export const fetchSynthesis = async (papers, query, sessionId) => {
  const response = await api.post('/synthesize', { papers, query, session_id: sessionId });
  return response.data;
};
