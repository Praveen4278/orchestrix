import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Zap, Info, CheckCircle2 } from 'lucide-react';

const SEVERITY_STYLES = {
  high:   { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    },
  medium: { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500'  },
  low:    { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400'   },
};

const TYPE_LABELS = {
  topic_disagreement: 'Topic Disagreement',
  gap_vs_emerging:    'Gap vs Emerging',
  trend_mismatch:     'Trend Mismatch',
};

function ConflictCard({ conflict, index }) {
  const [open, setOpen] = useState(index === 0);
  const sty = SEVERITY_STYLES[conflict.severity] || SEVERITY_STYLES.low;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`rounded-2xl border ${sty.border} overflow-hidden`}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left ${sty.bg}`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${sty.dot}`} />
        <span className="flex-1 font-bold text-sm text-slate-800 capitalize">{conflict.topic}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${sty.badge}`}>
          {conflict.severity}
        </span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">
          {TYPE_LABELS[conflict.type] || conflict.type}
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white"
          >
            <div className="p-5 space-y-4">
              {/* Two agent claims side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 flex items-center gap-1">
                    <Zap size={10} /> Analysis Agent says
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{conflict.analysis_claim}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2 flex items-center gap-1">
                    <Zap size={10} /> Summary Agent says
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{conflict.summary_claim}</p>
                </div>
              </div>

              {/* Resolution hint */}
              <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">Resolution Hint</div>
                  <p className="text-sm text-amber-800 leading-relaxed">{conflict.resolution_hint}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AgentConflictPanel({ conflicts = [] }) {
  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
        <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
        <p className="font-bold text-green-800">No Agent Conflicts Detected</p>
        <p className="text-sm text-green-600 mt-1">Analysis and Summary agents are in agreement on this paper set.</p>
      </div>
    );
  }

  const high   = conflicts.filter(c => c.severity === 'high').length;
  const medium = conflicts.filter(c => c.severity === 'medium').length;
  const low    = conflicts.filter(c => c.severity === 'low').length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          <span className="font-bold text-slate-800">
            {conflicts.length} Agent Conflict{conflicts.length !== 1 ? 's' : ''} Detected
          </span>
        </div>
        <div className="flex gap-3 text-sm">
          {high   > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">{high} High</span>}
          {medium > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">{medium} Medium</span>}
          {low    > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">{low} Low</span>}
        </div>
        <p className="text-xs text-slate-500 flex-1 min-w-[200px]">
          The Analysis and Summary agents produced differing insights on the same paper set. Review each conflict below.
        </p>
      </div>

      {conflicts.map((c, i) => (
        <ConflictCard key={i} conflict={c} index={i} />
      ))}
    </div>
  );
}
