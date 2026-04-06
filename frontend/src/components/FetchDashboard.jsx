import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Activity,
  History,
  Timer
} from 'lucide-react';

const DEFAULT_DISCOVERY_URL = 'http://127.0.0.1:8001';

const SOURCE_COLORS = {
  arxiv: 'text-[#FF6B9D]',
  semantic_scholar: 'text-[#00FF88]',
};

const SOURCE_LABELS = {
  arxiv: 'arXiv',
  semantic_scholar: 'Semantic Scholar',
};

function ts(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ''; }
}

export default function FetchDashboard({ query, isLoading, onDone, maxResults = 15 }) {
  const { state } = useApp();
  const discoveryUrl = state.agentUrls?.discovery || DEFAULT_DISCOVERY_URL;

  const [open, setOpen] = useState(true);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ arxiv: 0, semantic_scholar: 0, errors: 0, total: 0, duplicates: 0 });
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | fetching | done | error
  const [elapsedMs, setElapsedMs] = useState(null);
  const logsEndRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (!isLoading || !query) return;

    // Reset state
    setLogs([]);
    setStats({ arxiv: 0, semantic_scholar: 0, errors: 0, total: 0, duplicates: 0 });
    setProgress(0);
    setPhase('fetching');
    setElapsedMs(null);
    setOpen(true);

    const url = `${discoveryUrl}/discover/stream?query=${encodeURIComponent(query)}&max_results=${maxResults}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        handleEvent(ev);
      } catch {}
    };

    es.onerror = () => {
      setLogs(prev => [...prev, { type: 'error', message: 'Stream connection lost', ts: new Date().toISOString() }]);
      setPhase('error');
      es.close();
    };

    return () => {
      es.close();
    };
  }, [isLoading, query]);

  // Close stream when loading finishes (orchestrator done)
  useEffect(() => {
    if (!isLoading && esRef.current) {
      esRef.current.close();
    }
  }, [isLoading]);

  function handleEvent(ev) {
    const time = ts(ev.ts);

    switch (ev.type) {
      case 'start':
        setLogs(prev => [...prev, {
          type: 'info',
          message: `Starting fetch for "${ev.query}" — requesting up to ${ev.max_results} papers`,
          time,
        }]);
        setProgress(2);
        break;

      case 'source_start':
        setLogs(prev => [...prev, {
          type: 'source',
          source: ev.source,
          message: ev.message,
          time,
        }]);
        break;

      case 'paper':
        setLogs(prev => [...prev, {
          type: ev.status === 'ok' ? 'success' : 'fail',
          source: ev.source,
          message: `Paper ${ev.index}/${ev.total}: ${ev.title}${ev.title.length >= 80 ? '…' : ''}`,
          time,
        }]);
        setStats(prev => ({
          ...prev,
          [ev.source]: ev.index,
          errors: ev.status !== 'ok' ? prev.errors + 1 : prev.errors,
        }));
        // Progress: arXiv = 0–45%, SS = 45–90%
        if (ev.source === 'arxiv') {
          setProgress(Math.min(45, Math.round((ev.index / ev.total) * 45)));
        } else {
          setProgress(Math.min(90, 45 + Math.round((ev.index / ev.total) * 45)));
        }
        break;

      case 'source_done':
        setLogs(prev => [...prev, {
          type: 'done',
          source: ev.source,
          message: `${SOURCE_LABELS[ev.source] || ev.source} — retrieved ${ev.count} papers`,
          time,
        }]);
        break;

      case 'source_error':
        setLogs(prev => [...prev, {
          type: 'error',
          source: ev.source,
          message: `${SOURCE_LABELS[ev.source] || ev.source} failed: ${ev.error}`,
          time,
        }]);
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        break;

      case 'done':
        setProgress(100);
        setPhase('done');
        setElapsedMs(ev.elapsed_ms);
        setStats(prev => ({ ...prev, total: ev.total_found, duplicates: ev.duplicates_removed }));
        setLogs(prev => [...prev, {
          type: 'complete',
          message: `Done — ${ev.total_found} papers in final set (arXiv: ${ev.arxiv_in_final ?? '?'}, Semantic Scholar: ${ev.ss_in_final ?? '?'}, ${ev.duplicates_removed} duplicates removed) in ${(ev.elapsed_ms / 1000).toFixed(2)}s`,
          time,
        }]);
        if (onDone) onDone(ev.total_found);
        break;

      default:
        break;
    }
  }

  if (!isLoading && phase === 'idle') return null;

  const successCount = (stats.arxiv || 0) + (stats.semantic_scholar || 0);
  const errorCount = stats.errors || 0;
  const successRate = successCount + errorCount > 0
    ? Math.round((successCount / (successCount + errorCount)) * 100)
    : 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <button 
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-slate-100"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            phase === 'fetching' ? 'bg-accent animate-pulse' : 
            phase === 'done' ? 'bg-green-500' : 
            phase === 'error' ? 'bg-red-500' : 'bg-slate-300'
          }`} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            {phase === 'fetching' ? 'Discovery Agents Active' : phase === 'done' ? 'Discovery Complete' : 'Discovery Pipeline'}
          </span>
          {phase === 'fetching' && <Activity size={14} className="text-accent animate-pulse" />}
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold uppercase tracking-tighter">
            <span className="text-green-600">✓ {successCount}</span>
            {errorCount > 0 && <span className="text-red-500">✗ {errorCount}</span>}
          </div>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-slate-100 relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`h-full absolute top-0 left-0 transition-colors duration-500 ${
            phase === 'done' ? 'bg-green-500' : phase === 'error' ? 'bg-red-500' : 'bg-accent'
          }`}
          style={{ boxShadow: phase === 'fetching' ? '0 0 8px rgba(239, 35, 60, 0.4)' : 'none' }}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'arXiv', value: stats.arxiv || 0, color: 'text-[#FF6B9D]', icon: Database },
                  { label: 'Semantic Scholar', value: stats.semantic_scholar || 0, color: 'text-[#00FF88]', icon: Database },
                  { label: 'Success Rate', value: `${successRate}%`, color: 'text-primary', icon: CheckCircle2 },
                  { label: 'Unique Papers', value: stats.total || 0, color: 'text-accent', icon: Search },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center">
                    <div className={`text-sm font-bold ${color}`}>{value}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-1">
                      <Icon size={10} /> {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Logs */}
              <div className="bg-slate-900 rounded-xl p-4 max-h-48 overflow-y-auto font-mono text-[10px] space-y-1.5 custom-scrollbar shadow-inner">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 leading-relaxed">
                    <span className="text-slate-600 shrink-0">{log.time}</span>
                    <span className={`shrink-0 ${LOG_COLORS[log.type]}`}>
                      {LOG_ICONS[log.type]}
                    </span>
                    {log.source && (
                      <span className={`shrink-0 font-bold ${SOURCE_COLORS[log.source]}`}>
                        [{SOURCE_LABELS[log.source]}]
                      </span>
                    )}
                    <span className={`break-all ${
                      log.type === 'error' || log.type === 'fail' ? 'text-red-400' : 
                      log.type === 'complete' ? 'text-green-400' : 'text-slate-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>

              {/* Footer info */}
              <div className="mt-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-3">
                  {['arxiv', 'semantic_scholar'].map(src => (
                    <div key={src} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${src === 'arxiv' ? 'bg-[#FF6B9D]' : 'bg-[#00FF88]'}`} />
                      {SOURCE_LABELS[src]}
                    </div>
                  ))}
                </div>
                {elapsedMs && (
                  <div className="flex items-center gap-1.5 text-primary bg-slate-100 px-2 py-0.5 rounded-full">
                    <Timer size={10} />
                    {(elapsedMs / 1000).toFixed(2)}s
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

const LOG_ICONS = {
  info: '◈',
  source: '⬡',
  success: '✓',
  fail: '✗',
  done: '●',
  error: '⚠',
  complete: '★',
};

const LOG_COLORS = {
  info: 'text-blue-400',
  source: 'text-purple-400',
  success: 'text-green-400',
  fail: 'text-red-400',
  done: 'text-yellow-400',
  error: 'text-red-400',
  complete: 'text-green-400',
};
