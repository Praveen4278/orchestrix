import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Info, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ContradictionPanel({ contradictions, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mb-4"
        >
          <Scale size={40} />
        </motion.div>
        <p className="text-sm font-medium">Analyzing research claims for contradictions...</p>
      </div>
    );
  }

  if (!contradictions || !contradictions.conflicts || contradictions.conflicts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-[2rem] p-10 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-900 mb-2">High Consensus Detected</h3>
        <p className="text-green-700 max-w-md mx-auto">
          No significant contradictions were found across the analyzed papers. 
          The research findings appear to be consistent.
        </p>
      </div>
    );
  }

  const { conflicts, conflict_score } = contradictions;

  return (
    <div className="space-y-8">
      {/* Conflict Score Gauge */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64" cy="64" r="58"
              fill="none" stroke="#f1f5f9" strokeWidth="12"
            />
            <motion.circle
              cx="64" cy="64" r="58"
              fill="none" stroke={conflict_score > 50 ? "#ef4444" : "#f59e0b"}
              strokeWidth="12"
              strokeDasharray={364}
              initial={{ strokeDashoffset: 364 }}
              animate={{ strokeDashoffset: 364 - (364 * conflict_score) / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-primary">{conflict_score}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Conflict Score</span>
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={24} />
            Contradiction Analysis
          </h3>
          <p className="text-secondary text-sm leading-relaxed max-w-2xl">
            Our engine detected <strong>{conflicts.length} significant disagreements</strong> across 
            {contradictions.total_papers_analyzed} papers. High conflict scores indicate areas where 
            the scientific community has not yet reached a consensus.
          </p>
        </div>
      </div>

      {/* Conflict Cards */}
      <div className="grid grid-cols-1 gap-6">
        {conflicts.map((conflict, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="bg-red-50/50 px-8 py-4 border-b border-red-100/50 flex justify-between items-center">
              <h4 className="text-sm font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle size={16} />
                Topic: {conflict.topic}
              </h4>
              <div className="px-3 py-1 bg-white rounded-full border border-red-100 text-[10px] font-bold text-red-600 uppercase tracking-wider">
                {Math.round(conflict.confidence * 100)}% Confidence
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative">
                {/* Visual vs separator */}
                <div className="hidden md:flex absolute inset-y-0 left-1/2 -ml-px w-px bg-slate-100 items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">VS</div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finding A</div>
                  <h5 className="font-bold text-primary text-sm leading-snug">{conflict.paper_1.title}</h5>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-secondary italic leading-relaxed">
                    "{conflict.paper_1.claim}"
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Finding B</div>
                  <h5 className="font-bold text-primary text-sm leading-snug text-right">{conflict.paper_2.title}</h5>
                  <div className="p-4 bg-red-50/30 rounded-2xl border border-red-100/30 text-sm text-secondary italic leading-relaxed text-right">
                    "{conflict.paper_2.claim}"
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Info size={20} className="text-amber-600" />
                </div>
                <div>
                  <h6 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Root Cause Reasoning</h6>
                  <p className="text-sm text-amber-800 leading-relaxed font-medium">
                    {conflict.reason}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
