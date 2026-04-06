import React from 'react';
import { motion } from 'framer-motion';
import { Search, BarChart2, FileText, CheckCircle2, Bookmark, Clock, Loader2, Play } from 'lucide-react';

const AGENTS = [
  { id: 'discovery', label: 'Discovery', icon: Search, description: 'Finding relevant papers' },
  { id: 'analysis', label: 'Analysis', icon: BarChart2, description: 'Extracting data trends', parallel: true },
  { id: 'summary', label: 'Summary', icon: FileText, description: 'Generating insights', parallel: true },
  { id: 'citation', label: 'Citation', icon: Bookmark, description: 'Formatting references' },
];

export default function AgentTimeline({ trace = [], isLoading = false, totalMs = 0 }) {
  
  // Helper to determine status from trace
  const getAgentStatus = (agentId) => {
    // If not loading and we have a trace (usually meaning done)
    if (!isLoading && trace.length > 0) return 'done';
    
    // Check trace for specific agent events
    const agentStart = trace.find(t => t?.agent === agentId && (t?.event === 'start' || String(t?.status).includes('start')));
    const agentDone = trace.find(t => t?.agent === agentId && (t?.event === 'end' || t?.event === 'done' || String(t?.status).includes('done')));
    
    if (agentDone) return 'done';
    if (agentStart) return 'running';
    
    // In our orchestrator: Discovery -> (Analysis + Summary) -> Citation
    if (isLoading) {
      if (agentId === 'discovery') {
        return trace.length === 0 ? 'running' : 'done'; // Assuming discovery is first
      }
      
      const discDone = trace.find(t => t?.agent === 'discovery' && t?.event === 'end');
      if (discDone && (agentId === 'analysis' || agentId === 'summary')) {
        const myDone = trace.find(t => t?.agent === agentId && t?.event === 'end');
        return myDone ? 'done' : 'running';
      }
      
      const anaDone = trace.find(t => t?.agent === 'analysis' && t?.event === 'end');
      const sumDone = trace.find(t => t?.agent === 'summary' && t?.event === 'end');
      
      if (anaDone && sumDone && agentId === 'citation') {
        const myDone = trace.find(t => t?.agent === 'citation' && t?.event === 'end');
        return myDone ? 'done' : 'running';
      }
    }

    return 'idle';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 mt-2">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
            <Play size={18} className="text-accent" />
            Orchestration Pipeline
          </h2>
          <p className="text-sm text-secondary mt-1">Live visualization of agent execution</p>
        </div>
        
        {totalMs > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-light rounded-lg border border-slate-200">
            <Clock size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">
              Completed in {(totalMs / 1000).toFixed(2)}s
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        {/* Background connecting line */}
        <div className="absolute top-1/2 left-8 right-8 h-1 bg-slate-100 -translate-y-1/2 rounded-full z-0 hidden md:block"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          {AGENTS.map((agent, index) => {
            const status = getAgentStatus(agent.id);
            const Icon = agent.icon;
            
            const isRunning = status === 'running';
            const isDone = status === 'done';
            
            return (
              <motion.div 
                key={agent.id}
                className="relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Active connecting line fill */}
                {index > 0 && (isDone || isRunning) && (
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5 }}
                    className="absolute top-1/2 -left-1/2 w-full h-1 bg-accent/60 -translate-y-1/2 origin-left -z-10 hidden md:block"
                  />
                )}

                <div 
                  className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all duration-300 bg-white
                    ${isRunning 
                      ? 'border-accent shadow-[0_0_20px_rgba(239,35,60,0.15)] -translate-y-1' 
                      : isDone 
                        ? 'border-slate-200' 
                        : 'border-slate-100 opacity-60'
                    }
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-3 relative
                    ${isRunning ? 'bg-accent/10 text-accent' : isDone ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-300'}
                  `}>
                    {/* Pulsing ring for running state */}
                    {isRunning && (
                      <motion.div
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 rounded-full bg-accent"
                      />
                    )}
                    
                    {isDone ? <CheckCircle2 size={24} className="text-green-500" /> : <Icon size={24} />}
                  </div>
                  
                  <h3 className={`font-bold text-sm mb-1 ${isRunning ? 'text-accent' : 'text-primary'}`}>
                    {agent.label}
                  </h3>
                  
                  <div className="h-4 flex items-center justify-center">
                    {isRunning && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-wider">
                        <Loader2 size={10} className="animate-spin" /> Running
                      </div>
                    )}
                    {isDone && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>}
                    {status === 'idle' && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Queued</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Legend / Info */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-xs font-medium text-slate-400">
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-200"></span> Queued</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span> Running</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Completed</div>
      </div>
    </div>
  );
}
