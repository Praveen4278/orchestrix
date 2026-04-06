import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Database, 
  BarChart3, 
  FileText, 
  Quote, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Zap,
  Activity,
  ListFilter
} from 'lucide-react';
import FetchDashboard from '../components/FetchDashboard';
import PaperSelection from '../components/PaperSelection';
import LoadingScale from '../components/LoadingScale';

const STEPS = [
  { id: 'discovery', label: 'Discovery', icon: Search, color: '#00D4FF' },
  { id: 'selection', label: 'Selection', icon: ListFilter, color: '#FF8A00' },
  { id: 'analysis', label: 'Analysis', icon: BarChart3, color: '#AA55FF' },
  { id: 'summary', label: 'Synthesis', icon: FileText, color: '#00FF88' },
  { id: 'citations', label: 'Citations', icon: Quote, color: '#FFD700' },
];

const ORCHESTRATOR_URL = process.env.REACT_APP_ORCHESTRATOR_URL || 'http://127.0.0.1:8000';

export default function PipelinePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch, ACTIONS } = useApp();
  const { 
    query = '', 
    maxResults = 15, 
    eli5 = false, 
    citations = true 
  } = location.state || {};

  const [currentStep, setCurrentStep] = useState('discovery');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [pipelineData, setPipelineData] = useState(null);
  const [error, setError] = useState(null);
  const [discoveredPapers, setDiscoveredPapers] = useState([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isResuming, setIsResuming] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const esRef = useRef(null);

  // Simulated progress for analysis/summary stages
  useEffect(() => {
    let interval;
    if (currentStep === 'analysis' || currentStep === 'summary' || currentStep === 'citations') {
      const target = currentStep === 'analysis' ? 45 : currentStep === 'summary' ? 85 : 98;
      
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev < target) return prev + (Math.random() * 2);
          return prev;
        });
      }, 500);
    } else if (currentStep === 'discovery') {
      setAnalysisProgress(0);
    }
    
    return () => clearInterval(interval);
  }, [currentStep]);

  useEffect(() => {
    if (!query) {
      navigate('/');
      return;
    }

    const params = new URLSearchParams({
      query,
      max_results: maxResults,
      execution_mode: state.executionMode || 'single',
      generate_citations: citations,
      eli5_mode: eli5,
    });

    const url = `${ORCHESTRATOR_URL}/query/stream?${params.toString()}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        handlePipelineEvent(ev);
      } catch (err) {
        console.error("Failed to parse SSE event", err);
      }
    };

    es.onerror = (err) => {
      // If we are already transitioning or waiting for selection, ignore
      if (currentStep === 'selection' || completedSteps.includes('discovery')) {
        es.close();
        return;
      }
      console.error("SSE Error:", err);
      setError("Connection to orchestrator lost. Retrying...");
      es.close();
    };

    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, [query]);

  const handlePipelineEvent = (ev) => {
    switch (ev.type) {
      case 'pipeline_start':
        console.log("Pipeline started:", ev.session_id);
        setSessionId(ev.session_id);
        break;

      case 'step_start':
        if (ev.step === 'analysis_summary') {
          setCurrentStep('analysis');
          // Start moving toward summary target after some time to simulate progress
          setTimeout(() => setCurrentStep('summary'), 3000);
        } else if (ev.step === 'citations') {
          setCurrentStep('citations');
        } else {
          setCurrentStep(ev.step);
        }
        break;

      case 'step_done':
        if (ev.step === 'discovery') {
          setCompletedSteps(prev => [...prev, 'discovery']);
          setDiscoveredPapers(ev.papers || []);
          setSelectedPaperIds((ev.papers || []).map(p => p.id));
        } else if (ev.step === 'analysis_summary') {
          setCompletedSteps(prev => [...prev, 'analysis', 'summary']);
        } else if (ev.step === 'citations') {
          setCompletedSteps(prev => [...prev, 'citations']);
        }
        break;

      case 'awaiting_selection':
        setCurrentStep('selection');
        setSessionId(ev.session_id);
        if (esRef.current) esRef.current.close();
        break;

      case 'pipeline_resumed':
        setIsResuming(false);
        setCompletedSteps(prev => [...prev, 'selection']);
        break;

      case 'pipeline_complete':
        if (esRef.current) esRef.current.close();
        setAnalysisProgress(100);
        setPipelineData(ev.data);
        dispatch({ type: ACTIONS.SET_SESSION, payload: ev.data });
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        // Small delay to show completion
        setTimeout(() => {
          navigate('/results');
        }, 1500);
        break;

      default:
        break;
    }
  };

  const getStepStatus = (stepId) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (currentStep === stepId) return 'active';
    if (stepId === 'summary' && currentStep === 'analysis') return 'active'; // Parallel
    return 'pending';
  };

  const handleResumePipeline = () => {
    if (selectedPaperIds.length === 0) {
      setError("Please select at least one paper to continue.");
      return;
    }

    setError(null);
    setIsResuming(true);
    
    // Connect to resume stream
    const params = new URLSearchParams({
      session_id: sessionId,
      selected_paper_ids: JSON.stringify(selectedPaperIds)
    });
    
    const url = `${ORCHESTRATOR_URL}/query/resume?${params.toString()}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        handlePipelineEvent(ev);
      } catch (err) {
        console.error("Failed to parse SSE event", err);
      }
    };

    es.onerror = (err) => {
      // If we've already completed the pipeline or are navigating, ignore the error
      if (completedSteps.includes('citations') || currentStep === 'selection') {
        es.close();
        return;
      }
      console.error("Resume SSE Error:", err);
      setError("Failed to resume pipeline. Please try again.");
      es.close();
      setIsResuming(false);
    };
  };

  const togglePaperSelection = (id) => {
    setSelectedPaperIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 min-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-bold tracking-wider uppercase mb-4 border border-accent/20"
        >
          <Activity size={16} className="animate-pulse" />
          Autonomous Pipeline Active
        </motion.div>
        <h1 className="text-3xl font-extrabold text-primary mb-2">
          Orchestrating Research: <span className="text-accent">"{query}"</span>
        </h1>
        <p className="text-secondary">
          Specialized agents are collaborating to process your request.
        </p>
      </div>

      {/* Pipeline Visualization */}
      <div className="relative mb-16">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        
        <div className="relative z-10 flex justify-between items-center">
          {STEPS.map((step, idx) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="flex flex-col items-center group">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: status === 'completed' ? step.color : status === 'active' ? '#fff' : '#f8fafc',
                    borderColor: status === 'active' || status === 'completed' ? step.color : '#e2e8f0',
                    scale: status === 'active' ? 1.2 : 1,
                    boxShadow: status === 'active' ? `0 0 20px ${step.color}40` : 'none'
                  }}
                  className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-colors duration-500`}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 size={24} className="text-white" />
                  ) : (
                    <Icon 
                      size={24} 
                      className={status === 'active' ? 'text-accent' : 'text-slate-400'} 
                      style={{ color: status === 'active' ? step.color : undefined }}
                    />
                  )}
                </motion.div>
                
                <div className="mt-4 text-center">
                  <span className={`text-xs font-bold uppercase tracking-widest ${
                    status === 'active' ? 'text-primary' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>

                {/* Connection line fill */}
                {idx < STEPS.length - 1 && (
                  <div className="absolute top-1/2 h-0.5 bg-accent transition-all duration-1000 z-[-1]" 
                    style={{ 
                      left: `${(idx * 33.33) + 5}%`, 
                      width: status === 'completed' ? '23%' : '0%',
                      backgroundColor: step.color
                    }} 
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              {currentStep === 'discovery' && <Search size={18} />}
              {currentStep === 'selection' && <ListFilter size={18} />}
              {currentStep === 'analysis' && <BarChart3 size={18} />}
              {currentStep === 'summary' && <FileText size={18} />}
              {currentStep === 'citations' && <Quote size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-primary capitalize">{currentStep} Stage</h3>
              <p className="text-xs text-secondary font-medium">
                {currentStep === 'selection' ? 'Review results and select papers' : 'Pipeline executing autonomously'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
            {currentStep === 'selection' ? (
              <span className="text-[10px] font-bold uppercase tracking-tighter text-accent">Waiting for Input</span>
            ) : (
              <>
                <Loader2 size={14} className="animate-spin text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-tighter text-secondary">Agent Processing</span>
              </>
            )}
          </div>
        </div>

        <div className="p-8 flex-1 overflow-y-auto min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === 'discovery' && (
              <motion.div
                key="discovery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <FetchDashboard query={query} isLoading={true} maxResults={maxResults} onDone={() => {
                  // The backend SSE will also trigger the step change
                }} />
              </motion.div>
            )}

            {currentStep === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col h-full"
              >
                <div className="flex-1">
                  <PaperSelection 
                    papers={discoveredPapers} 
                    selectedIds={selectedPaperIds} 
                    onToggle={togglePaperSelection}
                    onSelectAll={() => setSelectedPaperIds(discoveredPapers.map(p => p.id))}
                    onDeselectAll={() => setSelectedPaperIds([])}
                  />
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={handleResumePipeline}
                    disabled={selectedPaperIds.length === 0 || isResuming}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
                      selectedPaperIds.length === 0 || isResuming
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-accent text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5'
                    }`}
                  >
                    {isResuming ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Resuming Pipeline...</span>
                      </>
                    ) : (
                      <>
                        <span>Analyze {selectedPaperIds.length} Papers</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {(currentStep === 'analysis' || currentStep === 'summary' || currentStep === 'citations') && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex items-center justify-center"
              >
                <LoadingScale 
                  progress={analysisProgress} 
                  label={
                    currentStep === 'analysis' ? 'Analyzing Research Trends' : 
                    currentStep === 'summary' ? 'Synthesizing Literature' : 
                    'Finalizing Results'
                  }
                  isError={!!error}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Network OK</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Agents Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            Auto-transition enabled <ArrowRight size={10} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
          <Activity size={18} className="animate-pulse" />
          {error}
        </div>
      )}
    </div>
  );
}
