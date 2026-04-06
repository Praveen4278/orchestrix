import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Laptop, Network, Zap, ArrowRight, Settings2, Globe } from 'lucide-react';

export default function ModeSelector() {
  const { dispatch, ACTIONS } = useApp();
  const [selectedMode, setSelectedMode] = useState('single');
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
    <div className="min-h-screen bg-light flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, #2b2d42 1px, transparent 0)',
            backgroundSize: '40px 40px' 
          }} 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-slate-100 p-8 md:p-12 relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 text-accent rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-6 border border-accent/20"
          >
            <Zap size={14} className="fill-accent/20" />
            Distributed AI Research Platform
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-3 tracking-tight">
            Orche<span className="text-accent">strix</span>
          </h1>
          <p className="text-secondary font-medium max-w-md mx-auto">
            Select your execution environment to begin high-speed autonomous research orchestration.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setSelectedMode('single')}
            className={`group relative p-6 rounded-3xl border-2 transition-all text-left overflow-hidden ${
              selectedMode === 'single' 
                ? 'border-accent bg-accent/[0.02] shadow-lg shadow-accent/5' 
                : 'border-slate-100 bg-slate-50 hover:border-slate-200'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              selectedMode === 'single' ? 'bg-accent text-white' : 'bg-white text-slate-400 group-hover:text-primary shadow-sm'
            }`}>
              <Laptop size={24} />
            </div>
            <h3 className={`font-bold text-lg mb-1 transition-colors ${selectedMode === 'single' ? 'text-primary' : 'text-slate-600'}`}>
              Single Machine
            </h3>
            <p className="text-xs text-secondary leading-relaxed font-medium">
              Run all agents locally on your workstation. Perfect for individual research.
            </p>
            {selectedMode === 'single' && (
              <motion.div layoutId="mode-check" className="absolute top-4 right-4 text-accent">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              </motion.div>
            )}
          </button>

          <button
            onClick={() => setSelectedMode('multi')}
            className={`group relative p-6 rounded-3xl border-2 transition-all text-left overflow-hidden ${
              selectedMode === 'multi' 
                ? 'border-accent bg-accent/[0.02] shadow-lg shadow-accent/5' 
                : 'border-slate-100 bg-slate-50 hover:border-slate-200'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              selectedMode === 'multi' ? 'bg-accent text-white' : 'bg-white text-slate-400 group-hover:text-primary shadow-sm'
            }`}>
              <Globe size={24} />
            </div>
            <h3 className={`font-bold text-lg mb-1 transition-colors ${selectedMode === 'multi' ? 'text-primary' : 'text-slate-600'}`}>
              Distributed Cluster
            </h3>
            <p className="text-xs text-secondary leading-relaxed font-medium">
              Distribute agents across multiple nodes for high-scale processing.
            </p>
            {selectedMode === 'multi' && (
              <motion.div layoutId="mode-check" className="absolute top-4 right-4 text-accent">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              </motion.div>
            )}
          </button>
        </div>

        {/* Configuration for Multi-Mode */}
        <AnimatePresence>
          {selectedMode === 'multi' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 mb-8 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 size={14} className="text-accent" />
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">Agent Node Configuration</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.keys(agentUrls).map((agent) => (
                    <div key={agent} className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                        {agent} endpoint
                      </label>
                      <input
                        type="text"
                        value={agentUrls[agent]}
                        onChange={(e) => setAgentUrls(prev => ({ ...prev, [agent]: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-primary outline-none focus:border-accent transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/10 transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
        >
          <span className="uppercase tracking-widest text-sm">Initialize Intelligence Engine</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
        
        <div className="mt-6 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Session data encrypted & processed locally
          </p>
        </div>
      </motion.div>
    </div>
  );
}
