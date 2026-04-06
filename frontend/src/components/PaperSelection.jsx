import React from 'react';
import { motion } from 'framer-motion';
import { Check, User, Calendar, FileText, ExternalLink } from 'lucide-react';

export default function PaperSelection({ papers, selectedIds, onToggle, onSelectAll, onDeselectAll }) {
  if (!papers || papers.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
          Select Papers for Analysis
          <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full">
            {selectedIds.length} / {papers.length} selected
          </span>
        </h3>
        <div className="flex gap-3">
          <button 
            onClick={onSelectAll}
            className="text-xs font-bold text-accent hover:underline uppercase tracking-wider"
          >
            Select All
          </button>
          <button 
            onClick={onDeselectAll}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 hover:underline uppercase tracking-wider"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {papers.map((paper) => {
          const isSelected = selectedIds.includes(paper.id);
          
          return (
            <motion.div
              key={paper.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.005 }}
              onClick={() => onToggle(paper.id)}
              className={`relative cursor-pointer p-5 rounded-2xl border-2 transition-all ${
                isSelected 
                  ? 'border-accent bg-accent/[0.02] shadow-md shadow-accent/5' 
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex gap-4">
                {/* Checkbox mechanism */}
                <div className={`mt-1 shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-accent border-accent text-white' : 'border-slate-200 bg-slate-50'
                }`}>
                  {isSelected && <Check size={16} strokeWidth={3} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className={`font-bold text-base leading-tight ${isSelected ? 'text-primary' : 'text-slate-700'}`}>
                      {paper.title}
                    </h4>
                    {paper.url && (
                      <a 
                        href={paper.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-slate-400 hover:text-accent transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <User size={14} className="text-slate-400" />
                      <span className="truncate max-w-[200px]">
                        {paper.authors?.slice(0, 3).join(', ')}
                        {paper.authors?.length > 3 ? ' et al.' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{paper.year}</span>
                    </div>
                    {paper.source && (
                      <div className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {paper.source}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                    {paper.abstract || 'No abstract available.'}
                  </p>
                </div>
              </div>

              {/* Selection overlay for visual feedback */}
              {isSelected && (
                <motion.div 
                  layoutId="selection-glow"
                  className="absolute inset-0 rounded-2xl ring-2 ring-accent/20 pointer-events-none"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
