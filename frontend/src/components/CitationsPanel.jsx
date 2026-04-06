import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Copy, Check, Download, Layers } from 'lucide-react';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <button 
      onClick={copy}
      className={`absolute top-3 right-3 flex items-center justify-center p-2 rounded-lg transition-colors border ${
        copied 
          ? 'bg-green-50 text-green-600 border-green-200' 
          : 'bg-white text-slate-400 border-slate-200 hover:text-primary hover:border-slate-300 shadow-sm'
      }`}
      aria-label="Copy citation"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
            <Check size={14} strokeWidth={3} />
          </motion.div>
        ) : (
          <motion.div key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
            <Copy size={14} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export default function CitationsPanel({ citations }) {
  const [format, setFormat] = useState('apa');

  if (!citations?.citations?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Bookmark className="mx-auto mb-4 opacity-50" size={48} />
        <p>No citations generated yet.</p>
      </div>
    );
  }

  const downloadBulk = (fmt) => {
    const content = citations.bulk_export?.[fmt] || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citations_${fmt}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    const all = ['apa', 'mla', 'ieee'].map(f => `=== ${f.toUpperCase()} ===\n\n${citations.bulk_export?.[f] || ''}`).join('\n\n');
    const blob = new Blob([all], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_citations.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner border border-slate-200/50">
          {['apa', 'mla', 'ieee'].map(f => (
            <button 
              key={f} 
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all uppercase tracking-wider ${
                format === f ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'
              }`}
              onClick={() => setFormat(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={downloadAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#d90429] hover:bg-[#b00320] text-white rounded-xl shadow-md hover:shadow-lg transition-all font-bold text-sm w-fit group"
        >
          <Layers size={16} className="group-hover:-translate-y-0.5 transition-transform" />
          Download All Formats
        </button>
      </div>

      {/* Citations List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {citations.citations.map((c, i) => {
            const text = c[format];
            if (!text) return null;
            
            return (
              <motion.div 
                key={`${c.paper_id}-${format}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all relative group pr-16"
              >
                <div className="text-xs font-bold text-slate-400 mb-2 truncate max-w-[85%] uppercase tracking-wider">
                  {c.title}
                </div>
                <div className="text-secondary leading-relaxed text-[15px]">
                  {text}
                </div>
                <CopyButton text={text} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Export Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-12">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
          <Download size={16} className="text-accent" /> Export Citations
        </h4>
        <div className="flex flex-wrap gap-3">
          {['apa', 'mla', 'ieee'].map(f => (
            <button 
              key={f} 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-accent hover:text-accent rounded-lg text-sm font-bold text-secondary transition-colors shadow-sm"
              onClick={() => downloadBulk(f)}
            >
              <Download size={14} /> {f.toUpperCase()} Format (.txt)
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
