import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import AgentTimeline from '../components/AgentTimeline';
import AnalysisDashboard from '../components/AnalysisDashboard';
import PapersList from '../components/PapersList';
import SummaryPanel from '../components/SummaryPanel';
import CitationsPanel from '../components/CitationsPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, BarChart2, BrainCircuit, Bookmark, Plus, Network } from 'lucide-react';

const TABS = [
  { id: 'papers', label: 'Discovery', icon: FileText },
  { id: 'analysis', label: 'Analysis', icon: BarChart2 },
  { id: 'summary', label: 'Summary', icon: BrainCircuit },
  { id: 'citations', label: 'Citations', icon: Bookmark },
];

export default function ResultsPage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('papers');
  const session = state.currentSession;

  if (!session && !state.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Search size={32} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">No active orchestration</h2>
        <p className="text-secondary max-w-md mb-8">
          Run a search query to initialize the agent pipeline and view results here.
        </p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={18} /> New Search Session
        </button>
      </div>
    );
  }

  if (state.isLoading && !session) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <AgentTimeline trace={[]} isLoading={true} totalMs={0} />
        
        <div className="mt-16 flex flex-col items-center text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="mb-8 relative w-24 h-24 flex items-center justify-center"
          >
            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-accent/20 animate-spin" style={{ animationDuration: '3s' }}></div>
            <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-accent/40 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
            <Network size={32} className="text-accent" />
          </motion.div>
          
          <h3 className="text-xl font-bold text-primary mb-2 font-display flex items-center gap-2">
            Agents are working
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2 }}>...</motion.span>
          </h3>
          <p className="text-secondary text-sm">
            Discovering papers, analyzing trends, and synthesizing information.
          </p>
        </div>
      </div>
    );
  }

  const { query, papers = [], analysis, summaries, citations, trace = [], execution_mode, total_duration_ms } = session;

  const tabCounts = {
    papers: papers.length,
    analysis: analysis ? 'Done' : '—',
    summary: summaries?.individual_summaries?.length || (summaries ? 'Done' : '—'),
    citations: citations?.citations?.length || '—',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2">
            <Search size={12} /> Research Target
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-tight leading-tight">
            "{query}"
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {execution_mode} runtime
            </span>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-primary rounded-lg text-sm font-bold transition-colors"
          >
            <Plus size={16} /> New Form
          </button>
        </div>
      </div>

      <AgentTimeline trace={trace} totalMs={total_duration_ms} isLoading={false} />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200 overflow-x-auto hide-scrollbar pb-px">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors whitespace-nowrap
                ${isActive ? 'text-accent' : 'text-slate-500 hover:text-primary hover:bg-slate-50'}
                rounded-t-lg
              `}
            >
              <Icon size={16} className={isActive ? 'text-accent' : 'text-slate-400'} />
              {tab.label}
              
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-black
                ${isActive ? 'bg-accent/10 text-accent' : 'bg-slate-100 text-slate-400'}
              `}>
                {tabCounts[tab.id]}
              </span>

              {isActive && (
                <motion.div
                  layoutId="results-tab-indicator"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-accent"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content Panel */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'papers' && <PapersList papers={papers} />}
            {activeTab === 'analysis' && <AnalysisDashboard analysis={analysis} />}
            {activeTab === 'summary' && (
              <SummaryPanel 
                summaries={session.summaries} 
                sessionId={session.session_id}
                papers={session.papers}
              />
            )}
            {activeTab === 'citations' && <CitationsPanel citations={citations} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
