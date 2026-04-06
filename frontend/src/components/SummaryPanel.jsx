import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitMerge, SearchX, Lightbulb, Zap, Map, FileText, 
  ChevronDown, ChevronUp, BrainCircuit, ShieldAlert, Sparkles,
  MessageSquare, Scale, Headphones
} from 'lucide-react';
import PaperChatbot from './PaperChatbot';
import NeuralRelationshipGraph from './NeuralRelationshipGraph';
import ContradictionPanel from './ContradictionPanel';
import AudioPlayer from './AudioPlayer';
import SynthesisDashboard from './SynthesisDashboard';
import { fetchContradictions, fetchAudioBriefing, fetchSynthesis } from '../utils/api';

import { useApp } from '../store/AppContext';

function SynthesisPanel({ synthesis }) {
  if (!synthesis) return null;
  const {
    common_themes = [],
    contradictions = [],
    research_gaps = [],
    research_roadmap = [],
    future_trends = [],
    overall_summary = '',
  } = synthesis;

  const InfoCard = ({ title, icon: Icon, items, colorClass, bgClass, borderClass }) => (
    <div className={`p-5 rounded-2xl border ${bgClass} ${borderClass}`}>
      <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${colorClass}`}>
        <Icon size={16} /> {title}
      </h4>
      {items && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-secondary leading-relaxed">
              <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${colorClass.replace('text-', 'bg-')}`}></span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm text-slate-400 italic">None identified.</span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {overall_summary && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-primary text-white p-6 rounded-2xl shadow-md border border-secondary/20"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2 mb-3">
            <BrainCircuit size={16} /> TL;DR Executive Summary
          </h3>
          <p className="text-secondary text-sm md:text-base leading-relaxed">{overall_summary}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard 
          title="Common Themes" icon={GitMerge} items={common_themes} 
          colorClass="text-accent" bgClass="bg-accent/5" borderClass="border-accent/10" 
        />
        <InfoCard 
          title="Research Gaps" icon={SearchX} items={research_gaps} 
          colorClass="text-orange-500" bgClass="bg-orange-50" borderClass="border-orange-100" 
        />
        <InfoCard 
          title="Future Trends" icon={Lightbulb} items={future_trends} 
          colorClass="text-purple-500" bgClass="bg-purple-50" borderClass="border-purple-100" 
        />
      </div>

      {contradictions.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-4 flex items-center gap-2">
            <ShieldAlert size={16} /> Contradictions Detected
          </h4>
          <div className="space-y-4">
            {contradictions.map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-red-100/50 shadow-sm">
                <div className="text-xs font-bold text-red-500 mb-1 font-mono">{c.papers}</div>
                <div className="text-sm text-slate-700">{c.issue}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {research_roadmap.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-primary mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Map size={18} className="text-accent" /> Recommended Research Roadmap
          </h4>
          <div className="space-y-4">
            {research_roadmap.map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center shrink-0 border border-slate-200 text-sm">
                  {step.step || i + 1}
                </div>
                <div>
                  <h5 className="font-bold text-primary text-sm mb-1">{step.title}</h5>
                  <p className="text-sm text-secondary leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IndividualSummaries({ summaries = [] }) {
  const [expanded, setExpanded] = useState(0);
  
  return (
    <div className="space-y-3">
      {summaries.map((s_, i) => (
        <div key={s_.paper_id} className="bg-white border text-primary border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
          <button 
            className="w-full flex items-center gap-3 p-4 sm:p-5 text-left focus:outline-none"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className={`p-1.5 rounded-lg ${expanded === i ? 'bg-accent/10 text-accent' : 'bg-slate-100 text-slate-400'}`}>
              <FileText size={18} />
            </div>
            <span className="flex-1 font-bold text-[15px] pr-4">{s_.title}</span>
            {expanded === i ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {expanded === i && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-slate-50 border-t border-slate-100 p-5 sm:p-6"
              >
                <div className="text-sm text-slate-600 leading-relaxed mb-5">
                  {s_.summary}
                </div>
                
                {s_.key_contributions?.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-2">Key Contributions</h5>
                    <ul className="space-y-1.5">
                      {s_.key_contributions.map((c, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-secondary">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {s_.methodology && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-purple-500 mb-1">Methodology</h5>
                      <span className="text-xs text-slate-600">{s_.methodology}</span>
                    </div>
                  )}
                  {s_.limitations?.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-1">Limitations</h5>
                      <span className="text-xs text-slate-600">{s_.limitations.join('; ')}</span>
                    </div>
                  )}
                </div>

                {s_.eli5_summary && (
                  <div className="mt-5 p-4 bg-accent/5 border border-accent/20 rounded-xl flex gap-3 items-start">
                    <Sparkles className="text-accent shrink-0 mt-0.5" size={18} />
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1">Explain Like I'm 5</h5>
                      <p className="text-sm text-primary font-medium">{s_.eli5_summary}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function SummaryPanel({ summaries, sessionId, papers }) {
  const { state } = useApp();
  const hasSynthesis = !!summaries?.synthesis;
  const hasIndividual = summaries?.individual_summaries?.length > 0;
  
  const [activeTab, setActiveTab] = useState(hasSynthesis ? 'synthesis' : (hasIndividual ? 'individual' : 'chat'));
  const [interviewPaper, setInterviewPaper] = useState(null);
  const [contradictionData, setContradictionData] = useState(null);
  const [loadingContradictions, setLoadingContradictions] = useState(false);
  const [audioBriefing, setAudioBriefing] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [synthesizedPaper, setSynthesizedPaper] = useState(null);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);

  useEffect(() => {
    // Check if session already has a synthesized paper in DB
    if (state.currentSession?.synthesized_papers?.length > 0 && !synthesizedPaper) {
      setSynthesizedPaper(state.currentSession.synthesized_papers[0]);
    }
  }, [state.currentSession, synthesizedPaper]);

  useEffect(() => {
    if (activeTab === 'contradictions' && !contradictionData && papers?.length > 1) {
      const loadContradictions = async () => {
        setLoadingContradictions(true);
        try {
          const data = await fetchContradictions(papers, sessionId);
          setContradictionData(data);
        } catch (err) {
          console.error("Failed to load contradictions:", err);
        } finally {
          setLoadingContradictions(false);
        }
      };
      loadContradictions();
    }
  }, [activeTab, papers, contradictionData, sessionId]);

  const handleGenerateAudio = async () => {
    if (!papers || papers.length === 0) return;
    setLoadingAudio(true);
    try {
      const query = state.currentSession?.query || "Research Papers";
      const data = await fetchAudioBriefing(papers, query, sessionId);
      setAudioBriefing(data);
    } catch (err) {
      console.error("Failed to load audio briefing:", err);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleGenerateSynthesis = async () => {
    if (!papers || papers.length === 0) return;
    setLoadingSynthesis(true);
    try {
      const query = state.currentSession?.query || "Research Papers";
      const data = await fetchSynthesis(papers, query, sessionId);
      setSynthesizedPaper(data.paper);
      setPdfBase64(data.pdf_base64);
    } catch (err) {
      console.error("Failed to load paper synthesis:", err);
    } finally {
      setLoadingSynthesis(false);
    }
  };
  
  if (!summaries) {
    return (
      <div className="text-center py-16 text-slate-500">
        <BrainCircuit className="mx-auto mb-4 opacity-50" size={48} />
        <p>No summary generated yet.</p>
      </div>
    );
  }

  const handleNodeClick = (paper) => {
    setInterviewPaper(paper);
    setActiveTab('chat');
  };

  return (
    <div className="max-w-5xl mx-auto">
      {(hasSynthesis || hasIndividual) && (
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-6 shadow-inner border border-slate-200/50">
          {hasSynthesis && (
            <button 
              className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'synthesis' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'
              }`}
              onClick={() => setActiveTab('synthesis')}
            >
              <BrainCircuit size={16} /> Global Synthesis
            </button>
          )}
          {hasIndividual && (
            <button 
              className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'individual' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'
              }`}
              onClick={() => setActiveTab('individual')}
            >
              <FileText size={16} /> Per-Paper Breakdowns
            </button>
          )}
          <button 
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'chat' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'
            }`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} /> Research Chat
          </button>
          <button 
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'graph' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'
            }`}
            onClick={() => setActiveTab('graph')}
          >
            <GitMerge size={16} /> Relationship Map
          </button>
          <button 
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'contradictions' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'
            }`}
            onClick={() => setActiveTab('contradictions')}
          >
            <Scale size={16} /> Contradiction Engine
          </button>
          <button 
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'audio' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'
            }`}
            onClick={() => setActiveTab('audio')}
          >
            <Headphones size={16} /> Audio Briefing
          </button>
          <button 
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'synthesis' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'
            }`}
            onClick={() => setActiveTab('synthesis')}
          >
            <Sparkles size={16} /> Paper Synthesizer
          </button>
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {activeTab === 'individual' && hasIndividual && (
          <IndividualSummaries summaries={summaries.individual_summaries} />
        )}
        {activeTab === 'synthesis' && (
          <SynthesisDashboard 
            paper={synthesizedPaper} 
            pdfBase64={pdfBase64}
            loading={loadingSynthesis} 
            onGenerate={handleGenerateSynthesis} 
          />
        )}
        {activeTab === 'chat' && (
          <PaperChatbot 
            sessionId={sessionId} 
            papers={papers} 
            interviewPaper={interviewPaper}
            onExitInterview={() => setInterviewPaper(null)}
          />
        )}
        {activeTab === 'graph' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                <GitMerge size={18} className="text-accent" />
                Neural Relationship Mapping
              </h3>
              <p className="text-xs text-secondary font-medium leading-relaxed">
                Explore connections between discovered papers based on shared authors, 
                keywords, and thematic similarity. <strong>Click a node to interview its lead author.</strong>
              </p>
            </div>
            <NeuralRelationshipGraph papers={papers} onNodeClick={handleNodeClick} sessionId={sessionId} />
          </div>
        )}
        {activeTab === 'contradictions' && (
          <ContradictionPanel contradictions={contradictionData} loading={loadingContradictions} />
        )}
        {activeTab === 'audio' && (
          <AudioPlayer 
            briefing={audioBriefing} 
            loading={loadingAudio} 
            onGenerate={handleGenerateAudio} 
          />
        )}
      </motion.div>
    </div>
  );
}
