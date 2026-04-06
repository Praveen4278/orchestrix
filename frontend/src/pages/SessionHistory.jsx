import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, RefreshCw, Trash2, ExternalLink, 
  Calendar, Database, Hash, Search, 
  LayoutGrid, Layers, Clock, AlertCircle,
  FileText, ArrowRight
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { fetchSessions, fetchSession, deleteSession } from '../utils/api';

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch { return iso; }
}

export default function SessionHistory() {
  const navigate = useNavigate();
  const { dispatch, ACTIONS } = useApp();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
    }
    setLoading(false);
  };

  const openSession = async (sessionId) => {
    try {
      const data = await fetchSession(sessionId);
      dispatch({ type: ACTIONS.SET_SESSION, payload: data });
      navigate('/results');
    } catch (err) {
      alert('Failed to load session: ' + (err.message || ''));
    }
  };

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this research session permanently?')) return;
    setDeleting(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
    } catch (err) {
      alert('Delete failed: ' + (err.message || ''));
    }
    setDeleting(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tight">
            <History className="text-accent" size={32} />
            Research History
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Access and manage your previous research intelligence sessions.
          </p>
        </div>
        
        <button 
          onClick={loadSessions}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:text-primary hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4"
        >
          <AlertCircle className="text-red-500 shrink-0" size={24} />
          <div>
            <h3 className="text-sm font-bold text-red-900 mb-1">Connection Error</h3>
            <p className="text-xs text-red-700 leading-relaxed">
              {error}. Please ensure MongoDB is running to persist your research sessions permanently.
            </p>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="mb-4"
            >
              <RefreshCw size={40} />
            </motion.div>
            <p className="text-sm font-bold tracking-widest uppercase opacity-50">Loading Intelligence...</p>
          </div>
        ) : sessions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 bg-slate-50 border border-dashed border-slate-200 rounded-[3rem]"
          >
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
              <Database size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No sessions yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
              Your research sessions will appear here automatically after running queries in the discovery lab.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="mt-8 px-8 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:scale-105 transition-all shadow-xl shadow-primary/10 flex items-center gap-2 mx-auto"
            >
              Start New Discovery <ArrowRight size={14} />
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode='popLayout'>
              {sessions.map((session, idx) => (
                <motion.div
                  key={session.session_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative bg-white border border-slate-200 p-6 rounded-[2rem] hover:border-accent hover:shadow-2xl hover:shadow-accent/5 transition-all cursor-pointer overflow-hidden"
                  onClick={() => openSession(session.session_id)}
                >
                  {/* Decorative Background Icon */}
                  <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                    <FileText size={120} />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                    {/* Icon */}
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors border border-slate-100">
                      <Search size={24} className="text-slate-400 group-hover:text-accent transition-colors" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-primary mb-2 truncate group-hover:text-accent transition-colors">
                        {session.query}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <LayoutGrid size={12} />
                          {session.execution_mode} mode
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-l border-slate-200 pl-4">
                          <Calendar size={12} />
                          {formatDate(session.created_at)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-widest border-l border-slate-200 pl-4 bg-accent/5 px-2 py-0.5 rounded-md">
                          <Hash size={10} />
                          {session.session_id.slice(0, 8)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openSession(session.session_id); }}
                        className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                        title="Open Research"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, session.session_id)}
                        disabled={deleting === session.session_id}
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
                        title="Delete Session"
                      >
                        {deleting === session.session_id ? (
                          <RefreshCw size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
