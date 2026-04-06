import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, Play, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchDigests, createDigest, deleteDigest, runDigest } from '../utils/api';

function formatDate(iso) {
  if (!iso) return 'Never';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function NewDigestForm({ onCreated }) {
  const [query, setQuery] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [maxResults, setMaxResults] = useState(10);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const digest = await createDigest({ query: query.trim(), frequency, max_results: maxResults });
      onCreated(digest);
      setQuery('');
    } catch (err) {
      alert('Failed to create digest: ' + (err.message || ''));
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <h3 className="font-bold text-primary flex items-center gap-2">
        <Plus size={18} className="text-accent" /> New Digest Schedule
      </h3>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Research Query</label>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='e.g. "large language model safety"'
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
          disabled={loading}
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Frequency</label>
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent"
            disabled={loading}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Max Papers</label>
          <select
            value={maxResults}
            onChange={e => setMaxResults(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent"
            disabled={loading}
          >
            {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="w-full bg-accent text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
      >
        {loading ? 'Creating…' : 'Schedule Digest'}
      </button>
    </form>
  );
}

function DigestResultPanel({ result }) {
  if (!result) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        {result.total_new > 0
          ? <CheckCircle2 size={16} className="text-green-500" />
          : <AlertCircle size={16} className="text-slate-400" />}
        <span className="font-bold text-sm text-slate-800">
          {result.total_new > 0 ? `${result.total_new} new paper${result.total_new !== 1 ? 's' : ''} found` : 'No new papers since last run'}
        </span>
        <span className="text-xs text-slate-400 ml-auto">{formatDate(result.run_at)}</span>
      </div>
      {result.new_papers?.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {result.new_papers.map((p, i) => (
            <a
              key={i}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white border border-slate-100 rounded-lg px-3 py-2 hover:border-accent transition-colors"
            >
              <div className="text-sm font-semibold text-slate-800 line-clamp-1">{p.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {p.year} · {p.source} · rel: {(p.relevance_score * 100).toFixed(0)}%
              </div>
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function DigestPage() {
  const [digests, setDigests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState({});
  const [results, setResults] = useState({});
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setDigests(await fetchDigests()); } catch {}
    setLoading(false);
  };

  const handleCreated = (digest) => {
    setDigests(prev => [digest, ...prev]);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this digest schedule?')) return;
    try {
      await deleteDigest(id);
      setDigests(prev => prev.filter(d => d.id !== id));
    } catch (err) { alert('Delete failed: ' + err.message); }
  };

  const handleRun = async (id) => {
    setRunning(prev => ({ ...prev, [id]: true }));
    try {
      const result = await runDigest(id);
      setResults(prev => ({ ...prev, [id]: result }));
      // Update last_run in local state
      setDigests(prev => prev.map(d => d.id === id ? { ...d, last_run: result.run_at } : d));
    } catch (err) { alert('Run failed: ' + err.message); }
    setRunning(prev => ({ ...prev, [id]: false }));
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-primary flex items-center gap-2">
            <Bell size={24} className="text-accent" /> Research Digest
          </h1>
          <p className="text-sm text-secondary mt-1">
            Schedule recurring queries. Run them manually to see new papers since the last check.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw size={16} className="text-slate-500" />
          </button>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 bg-accent text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} /> New Schedule
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <NewDigestForm onCreated={handleCreated} />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading digests…</div>
      ) : digests.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <Bell size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-bold text-slate-500">No digest schedules yet</p>
          <p className="text-sm text-slate-400 mt-1">Create one to track new papers on a recurring query.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {digests.map(digest => (
            <motion.div
              key={digest.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                  <Bell size={18} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 truncate">{digest.query}</div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {digest.frequency === 'daily' ? 'Daily' : 'Weekly'}
                    </span>
                    <span>Max {digest.max_results} papers</span>
                    <span>Last run: {formatDate(digest.last_run)}</span>
                    <span className={`font-bold ${digest.active ? 'text-green-500' : 'text-slate-400'}`}>
                      {digest.active ? '● Active' : '○ Paused'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleRun(digest.id)}
                    disabled={running[digest.id]}
                    className="flex items-center gap-1.5 bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-accent/90 transition-colors"
                  >
                    {running[digest.id]
                      ? <RefreshCw size={12} className="animate-spin" />
                      : <Play size={12} />}
                    {running[digest.id] ? 'Running…' : 'Run Now'}
                  </button>
                  <button
                    onClick={() => handleDelete(digest.id)}
                    className="p-1.5 border border-red-100 text-red-400 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {results[digest.id] && <DigestResultPanel result={results[digest.id]} />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
