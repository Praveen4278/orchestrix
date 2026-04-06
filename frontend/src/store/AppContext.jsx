import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
  executionMode: null, // null = not chosen yet, 'single', 'multi'
  agentUrls: {
    discovery: 'http://localhost:8001',
    analysis: 'http://localhost:8002',
    summary: 'http://localhost:8003',
    citation: 'http://localhost:8004',
  },
  currentSession: null,
  sessions: [],
  isLoading: false,
  loadingAgent: null,
  error: null,
  agentHealth: {},
};

const ACTIONS = {
  SET_MODE: 'SET_MODE',
  SET_AGENT_URLS: 'SET_AGENT_URLS',
  SET_SESSION: 'SET_SESSION',
  SET_SESSIONS: 'SET_SESSIONS',
  SET_LOADING: 'SET_LOADING',
  SET_LOADING_AGENT: 'SET_LOADING_AGENT',
  SET_ERROR: 'SET_ERROR',
  SET_AGENT_HEALTH: 'SET_AGENT_HEALTH',
  CLEAR_SESSION: 'CLEAR_SESSION',
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_MODE:
      return { ...state, executionMode: action.payload };
    case ACTIONS.SET_AGENT_URLS:
      return { ...state, agentUrls: { ...state.agentUrls, ...action.payload } };
    case ACTIONS.SET_SESSION:
      return { ...state, currentSession: action.payload };
    case ACTIONS.SET_SESSIONS:
      return { ...state, sessions: action.payload };
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTIONS.SET_LOADING_AGENT:
      return { ...state, loadingAgent: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case ACTIONS.SET_AGENT_HEALTH:
      return { ...state, agentHealth: action.payload };
    case ACTIONS.CLEAR_SESSION:
      return { ...state, currentSession: null, error: null };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch, ACTIONS }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
