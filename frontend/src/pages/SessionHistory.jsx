import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { fetchSessions, fetchSession, deleteSession } from '../utils/api';

const s = {
  page: {
    padding: '2rem 2.5rem',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
  },
  title: {
    fontFamily: 'var(--mono)',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  refreshBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '7px',
    padding: '7px 14px',
    color: 'var(--text3)',
    fontFamily: 'var(--mono)',
    fontSize: '0.68rem',
    cursor: 'pointer',
    letterSpacing: '0.06em',
    transition: 'all 0.15s',
  },
  sessionCard: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    marginBottom: '0.6rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  sessionIcon: {
    width: '36px', height: '36px',
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1rem',
    flexShrink: 0,
  },
  sessionInfo: { flex: 1, overflow: 'hidden' },
  sessionQuery: {
    fontFamily: 'var(--sans)',
    fontSize: '0.88rem',
    fontWeight: 600,
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '3px',
  },
  sessionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap',
  },
  metaBadge: {
    fontFamily: 'var(--mono)',
    fontSize: '0.6rem',
    color: 'var(--text3)',
  },
  sessionActions: {
    display: 'flex',
    gap: '0.4rem',
    flexShrink: 0,
  },
  actionBtn: (danger) => ({
    background: 'transparent',
    border: `1px solid ${danger ? 'rgba(255,68,102,0.3)' : 'var(--border)'}`,
    borderRadius: '6px',
    padding: '5px 10px',
    color: danger ? 'var(--red)' : 'var(--text3)',
    fontFamily: 'var(--mono)',
    fontSize: '0.6rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '0.04em',
  }),
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: 'var(--text3)',
  },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  emptyText: {
    fontFamily: 'var(--mono)',
    fontSize: '0.85rem',
    color: 'var(--text2)',
    marginBottom: '0.5rem',
  },
  emptySubtext: {
    fontSize: '0.78rem',
    color: 'var(--text3)',
  },
  loadingText: {
    fontFamily: 'var(--mono)',
    fontSize: '0.78rem',
    color: 'var(--text3)',
    textAlign: 'center',
    padding: '2rem',
  },
};

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    if (!window.confirm('Delete this session?')) return;
    setDeleting(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
    } catch (err) {
      alert('Delete failed: ' + (err.message || ''));
    }
    setDeleting(null);
  };

  if (loading) return <div style={s.page}><div style={s.loadingText}>Loading sessions…</div></div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>Session History</div>
        <button style={s.refreshBtn} onClick={loadSessions}>↺ Refresh</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,68,102,0.08)', border: '1px solid rgba(255,68,102,0.25)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: '0.75rem', marginBottom: '1rem' }}>
          ⚠ {error} — MongoDB may not be running.
        </div>
      )}

      {sessions.length === 0 && !error ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>🗂️</div>
          <div style={s.emptyText}>No sessions yet</div>
          <div style={s.emptySubtext}>Your research sessions will appear here after running queries.</div>
        </div>
      ) : (
        sessions.map(session => (
          <div
            key={session.session_id}
            style={s.sessionCard}
            onClick={() => openSession(session.session_id)}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={s.sessionIcon}>🔬</div>
            <div style={s.sessionInfo}>
              <div style={s.sessionQuery}>{session.query}</div>
              <div style={s.sessionMeta}>
                <span style={s.metaBadge}>
                  {session.execution_mode === 'multi' ? '🌐' : '🖥️'} {session.execution_mode}
                </span>
                <span style={s.metaBadge}>·</span>
                <span style={s.metaBadge}>{formatDate(session.created_at)}</span>
                <span style={s.metaBadge}>·</span>
                <span style={{ ...s.metaBadge, fontFamily: 'var(--mono)', fontSize: '0.58rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1px 5px', color: 'var(--accent)', letterSpacing: '0.05em' }}>
                  {session.session_id.slice(0, 8)}
                </span>
              </div>
            </div>
            <div style={s.sessionActions}>
              <button
                style={s.actionBtn(false)}
                onClick={e => { e.stopPropagation(); openSession(session.session_id); }}
              >
                Open
              </button>
              <button
                style={s.actionBtn(true)}
                onClick={e => handleDelete(e, session.session_id)}
                disabled={deleting === session.session_id}
              >
                {deleting === session.session_id ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
