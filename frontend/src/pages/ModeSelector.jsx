import React, { useState } from 'react';
import { useApp } from '../store/AppContext';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
    opacity: 0.4,
  },
  glow: {
    position: 'absolute',
    width: '600px', height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1,
    background: 'var(--bg2)',
    border: '1px solid var(--border2)',
    borderRadius: '16px',
    padding: '3rem',
    maxWidth: '680px',
    width: '100%',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    background: 'var(--accent3)',
    border: '1px solid var(--accent2)',
    color: 'var(--accent)',
    fontFamily: 'var(--mono)',
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    padding: '4px 12px',
    borderRadius: '999px',
    marginBottom: '1.5rem',
    textTransform: 'uppercase',
  },
  logo: {
    fontFamily: 'var(--mono)',
    fontSize: '2.8rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
  },
  logoAccent: { color: 'var(--accent)' },
  tagline: {
    color: 'var(--text2)',
    fontSize: '1rem',
    marginBottom: '2.5rem',
    lineHeight: 1.6,
  },
  sectionTitle: {
    fontFamily: 'var(--mono)',
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    color: 'var(--text3)',
    textTransform: 'uppercase',
    marginBottom: '1.25rem',
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '2rem',
  },
  modeBtn: (active, hovered) => ({
    background: active ? 'rgba(0,212,255,0.08)' : hovered ? 'var(--bg3)' : 'var(--bg)',
    border: `1px solid ${active ? 'var(--accent)' : hovered ? 'var(--border2)' : 'var(--border)'}`,
    borderRadius: '12px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
    color: 'var(--text)',
  }),
  modeBtnIcon: {
    fontSize: '1.8rem',
    marginBottom: '0.75rem',
    display: 'block',
  },
  modeBtnTitle: {
    fontFamily: 'var(--mono)',
    fontSize: '0.85rem',
    fontWeight: 700,
    marginBottom: '0.4rem',
    color: 'var(--accent)',
  },
  modeBtnDesc: {
    fontSize: '0.78rem',
    color: 'var(--text2)',
    lineHeight: 1.5,
  },
  multiConfig: {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    textAlign: 'left',
  },
  configTitle: {
    fontFamily: 'var(--mono)',
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    marginBottom: '1rem',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  inputLabel: {
    fontFamily: 'var(--mono)',
    fontSize: '0.7rem',
    color: 'var(--text2)',
    width: '80px',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'var(--bg2)',
    border: '1px solid var(--border2)',
    borderRadius: '6px',
    padding: '6px 10px',
    color: 'var(--text)',
    fontSize: '0.78rem',
    fontFamily: 'var(--mono)',
    outline: 'none',
  },
  launchBtn: (disabled) => ({
    width: '100%',
    background: disabled ? 'var(--bg3)' : 'var(--accent)',
    color: disabled ? 'var(--text3)' : 'var(--bg)',
    border: 'none',
    borderRadius: '10px',
    padding: '1rem',
    fontFamily: 'var(--mono)',
    fontSize: '0.9rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
  }),
};

const AGENT_NAMES = ['discovery', 'analysis', 'summary', 'citation'];

export default function ModeSelector() {
  const { dispatch, ACTIONS } = useApp();
  const [selectedMode, setSelectedMode] = useState(null);
  const [hoveredMode, setHoveredMode] = useState(null);
  const [agentUrls, setAgentUrls] = useState({
    discovery: 'http://127.0.0.1:8001',
    analysis: 'http://127.0.0.1:8002',
    summary: 'http://127.0.0.1:8003',
    citation: 'http://127.0.0.1:8004',
  });

  const handleLaunch = () => {
    if (!selectedMode) return;
    dispatch({ type: ACTIONS.SET_MODE, payload: selectedMode });
    if (selectedMode === 'multi') {
      dispatch({ type: ACTIONS.SET_AGENT_URLS, payload: agentUrls });
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.grid} />
      <div style={styles.glow} />
      <div style={styles.card}>
        <div style={styles.badge}>Distributed AI Research Platform</div>
        <div style={styles.logo}>
          Orche<span style={styles.logoAccent}>strix</span>
        </div>
        <p style={styles.tagline}>
          Multi-agent research intelligence.<br />
          Discover, analyze, summarize, and cite — at scale.
        </p>

        <div style={styles.sectionTitle}>Select Execution Mode</div>
        <div style={styles.modeGrid}>
          {['single', 'multi'].map(mode => (
            <button
              key={mode}
              style={styles.modeBtn(selectedMode === mode, hoveredMode === mode)}
              onClick={() => setSelectedMode(mode)}
              onMouseEnter={() => setHoveredMode(mode)}
              onMouseLeave={() => setHoveredMode(null)}
            >
              <span style={styles.modeBtnIcon}>
                {mode === 'single' ? '🖥️' : '🌐'}
              </span>
              <div style={styles.modeBtnTitle}>
                {mode === 'single' ? 'Single Laptop Mode' : 'Multi Laptop Mode'}
              </div>
              <div style={styles.modeBtnDesc}>
                {mode === 'single'
                  ? 'All agents run locally on localhost. Perfect for demos and offline use.'
                  : 'Each agent runs on a separate machine. Fully distributed execution across your network.'}
              </div>
            </button>
          ))}
        </div>

        {selectedMode === 'multi' && (
          <div style={styles.multiConfig}>
            <div style={styles.configTitle}>⚙️ Configure Agent IP Addresses</div>
            {AGENT_NAMES.map(name => (
              <div key={name} style={styles.inputRow}>
                <span style={styles.inputLabel}>{name}</span>
                <input
                  style={styles.input}
                  value={agentUrls[name]}
                  onChange={e => setAgentUrls(prev => ({ ...prev, [name]: e.target.value }))}
                  placeholder={`http://127.0.0.1:800${AGENT_NAMES.indexOf(name) + 1}`}
                />
              </div>
            ))}
          </div>
        )}

        <button
          style={styles.launchBtn(!selectedMode)}
          onClick={handleLaunch}
          disabled={!selectedMode}
        >
          {selectedMode ? `Launch in ${selectedMode === 'single' ? 'Single Laptop' : 'Multi Laptop'} Mode →` : 'Select a mode to continue'}
        </button>
      </div>
    </div>
  );
}
