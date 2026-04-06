import React, { useState } from 'react';
import { ExternalLink, User, Calendar, BookOpen, Quote, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PapersList({ papers = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!papers || papers.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <BookOpen className="mx-auto mb-4 opacity-50" size={48} />
        <p>No papers discovered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {papers.map((paper, idx) => {
        const id = paper.paperId || paper.id || idx;
        const isExpanded = expandedId === id;
        
        return (
          <motion.div 
            key={id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`bg-white border rounded-xl overflow-hidden transition-all duration-300
              ${isExpanded ? 'border-accent shadow-md' : 'border-slate-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300'}
            `}
          >
            <div 
              className="p-5 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-start gap-4"
              onClick={() => setExpandedId(isExpanded ? null : id)}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                    {paper.source || 'Scholar'}
                  </span>
                  
                  {paper.citationCount !== undefined && (
                    <span className="px-2.5 py-1 bg-accent/10 text-accent-deep rounded-md text-[10px] font-bold uppercase tracking-wider border border-accent/20 flex items-center gap-1">
                      <Quote size={10} /> {paper.citationCount} Citations
                    </span>
                  )}

                  {paper.year && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                      <Calendar size={12} /> {paper.year}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-primary mb-2 leading-snug pr-8">
                  {paper.title}
                </h3>
                
                {paper.authors && (
                  <div className="flex items-start gap-1.5 text-sm font-medium text-slate-500 mb-1">
                    <User size={16} className="shrink-0 mt-0.5 opacity-70" />
                    <span className="line-clamp-1">{paper.authors}</span>
                  </div>
                )}
              </div>

              <button className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-primary transition-colors shrink-0">
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-slate-100 bg-slate-50/50"
                >
                  <div className="p-5 sm:p-6 text-sm text-secondary leading-relaxed">
                    <div className="mb-4">
                      <h4 className="font-bold text-primary mb-2 text-xs uppercase tracking-wider">Abstract</h4>
                      <p>{paper.abstract || "No abstract available for this paper."}</p>
                    </div>
                    
                    {paper.url && (
                      <a 
                        href={paper.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg font-bold text-accent hover:border-accent hover:bg-accent hover:text-white transition-all text-xs"
                      >
                        <ExternalLink size={14} /> Read Full Paper
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
