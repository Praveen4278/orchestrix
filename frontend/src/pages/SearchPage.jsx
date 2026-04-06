import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { runQuery, checkAgentHealth } from '../utils/api';
import { Search, Zap, Loader2, BookOpen, Layers, Lightbulb, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import FetchDashboard from '../components/FetchDashboard';

const SUGGESTIONS = [
  { text: 'transformer architecture attention mechanism', icon: Lightbulb },
  { text: 'large language model alignment safety', icon: Layers },
  { text: 'diffusion models image generation', icon: BookOpen },
  { text: 'reinforcement learning from human feedback', icon: PlayCircle },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const { state, dispatch, ACTIONS } = useApp();

  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState(15);
  const [eli5, setEli5] = useState(false);
  const [citations, setCitations] = useState(true);
  const [error, setError] = useState(null);
  const [agentHealth, setAgentHealth] = useState({});
  const [healthChecked, setHealthChecked] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const health = await checkAgentHealth();
      setAgentHealth(health);
      dispatch({ type: ACTIONS.SET_AGENT_HEALTH, payload: health });
      setHealthChecked(true);
    } catch {
      setHealthChecked(true);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;

    setError(null);
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: ACTIONS.CLEAR_SESSION });

    // Navigate to PipelinePage immediately
    navigate('/pipeline', { 
      state: { 
        query: q, 
        maxResults, 
        eli5, 
        citations 
      } 
    });
  };

  const isLoading = state.isLoading;

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }
      `}</style>
      {/* Hero Section */}
      <div className="text-center mb-12">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-bold tracking-widest uppercase mb-6 border border-accent/20 shadow-sm"
        >
          <Zap size={14} className="fill-accent/20" />
          Research Intelligence Platform
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-5xl font-extrabold text-primary font-display leading-tight tracking-tight mb-6"
        >
          What are you<br />
          <span className="text-accent underline decoration-accent/30 underline-offset-4">researching</span> today?
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-secondary text-lg max-w-2xl mx-auto leading-relaxed"
        >
          Enter a research topic. Orchestrix dispatches specialized agents to discover papers, analyze trends, generate summaries, and compile citations.
        </motion.p>
      </div>

      {/* Search Input Container */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-16"
      >
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-6 md:p-8">
          
          {/* Main Search Bar */}
          <div className="relative mb-6 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-accent transition-colors">
              <Search size={22} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder='e.g. "attention mechanisms in transformer models"'
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={isLoading}
              autoFocus
              className="w-full bg-light/50 border-2 border-slate-200 text-primary text-lg sm:text-xl rounded-xl pl-12 pr-4 py-4 sm:py-5 outline-none focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Settings Row */}
          <div className="flex flex-wrap items-center gap-6 mb-8 px-2">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-secondary">Papers limit:</label>
              <select
                value={maxResults}
                onChange={e => setMaxResults(Number(e.target.value))}
                disabled={isLoading}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer"
              >
                {[5, 10, 15, 20, 30].map(n => (
                  <option key={n} value={n}>{n} papers</option>
                ))}
              </select>
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={eli5}
                onChange={e => setEli5(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent/50 cursor-pointer"
              />
              <span className="text-sm font-semibold text-secondary group-hover:text-primary transition-colors">ELI5 Summary</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={citations}
                onChange={e => setCitations(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent/50 cursor-pointer"
              />
              <span className="text-sm font-semibold text-secondary group-hover:text-primary transition-colors">Auto-Citations</span>
            </label>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading || !query.trim()}
            className={`w-full relative overflow-hidden rounded-xl font-bold text-white text-base py-4 px-6 flex items-center justify-center gap-2 transition-all ${
              isLoading || !query.trim() 
                ? 'bg-slate-300 cursor-not-allowed text-slate-500' 
                : 'bg-accent hover:bg-accent-deep shadow-lg shadow-accent/30 hover:shadow-accent/40 hover:-translate-y-0.5'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin text-white" />
                <span>Initializing Agents...</span>
              </>
            ) : (
              <>
                <Zap size={20} className="fill-white/20" />
                <span>Launch Research Pipeline</span>
              </>
            )}
            
            {/* Glossy overlay effect for button */}
            {!isLoading && query.trim() && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            )}
          </button>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="mt-6 bg-red-50 border-l-4 border-accent-deep text-accent-deep p-4 rounded-r-md text-sm font-medium flex items-center gap-2"
            >
              <Zap size={16} /> {error}
            </motion.div>
          )}
        </form>
      </motion.div>

      {/* Fetch Dashboard */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <FetchDashboard query={query.trim()} isLoading={isLoading} />
        </motion.div>
      )}

      {/* Suggested Queries */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-xs font-bold tracking-wider uppercase text-secondary mb-4 flex items-center gap-2">
          <span>Trending Topics</span>
          <div className="h-px bg-slate-200 flex-1"></div>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTIONS.map((suggestion, idx) => {
            const Icon = suggestion.icon;
            return (
              <button
                key={idx}
                onClick={() => setQuery(suggestion.text)}
                disabled={isLoading}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-accent hover:shadow-md hover:bg-light/30 transition-all group"
              >
                <div className="bg-light p-2 rounded-lg text-secondary group-hover:text-accent group-hover:bg-accent/10 transition-colors">
                  <Icon size={16} strokeWidth={2.5} />
                </div>
                <span className="text-sm font-medium text-primary line-clamp-1">{suggestion.text}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

    </div>
  );
}
