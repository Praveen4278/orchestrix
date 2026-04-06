import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Download, Sparkles, BookOpen, 
  ChevronRight, ArrowLeft, Loader2, CheckCircle2,
  Share2, Printer, Bookmark, Copy, Hash
} from 'lucide-react';

export default function SynthesisDashboard({ paper, pdfBase64, loading, onGenerate }) {
  const [activeSection, setActiveSection] = useState('abstract');

  const sections = [
    { id: 'abstract', label: 'Abstract' },
    { id: 'introduction', label: 'Introduction' },
    { id: 'literature_review', label: 'Literature Review' },
    { id: 'methodology', label: 'Methodology' },
    { id: 'results', label: 'Results' },
    { id: 'discussion', label: 'Discussion' },
    { id: 'conclusion', label: 'Conclusion' },
    { id: 'references', label: 'References' }
  ];

  const handleDownload = () => {
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = `${paper.title.replace(/\s+/g, '_')}.pdf`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="mb-8 p-6 bg-accent/10 rounded-full text-accent"
        >
          <Sparkles size={48} />
        </motion.div>
        <h3 className="text-2xl font-black text-primary mb-2">Synthesizing Your Paper</h3>
        <p className="text-secondary font-medium max-w-sm text-center leading-relaxed">
          Our AI researchers are analyzing methodologies and combining findings into a cohesive scholarly document...
        </p>
        <div className="mt-12 w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 25, ease: "linear" }}
            className="h-full bg-accent"
          />
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="bg-slate-900 rounded-[3rem] p-16 text-center text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <FileText size={200} />
        </div>
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-accent/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-8 border border-accent/30">
            <BookOpen size={40} className="text-accent" />
          </div>
          <h3 className="text-4xl font-black mb-6 leading-tight">Generate a New Scholarly Paper</h3>
          <p className="text-slate-400 text-lg mb-12 leading-relaxed font-medium">
            Combine the insights, methodologies, and conclusions of your selected research into a 
            completely new, professionally structured academic document.
          </p>
          <button 
            onClick={onGenerate}
            className="px-12 py-5 bg-white text-slate-900 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-2xl shadow-white/10 flex items-center gap-3 mx-auto"
          >
            <Sparkles size={24} className="text-accent" />
            Synthesize Full Paper
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-10">
      {/* Sidebar Navigation */}
      <div className="lg:w-72 shrink-0">
        <div className="sticky top-8 space-y-2">
          <div className="mb-8 p-6 bg-accent/5 border border-accent/10 rounded-3xl">
            <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4">Paper Structure</h4>
            <div className="space-y-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeSection === section.id 
                      ? 'bg-white text-accent shadow-md shadow-accent/5 translate-x-2' 
                      : 'text-slate-500 hover:text-primary hover:bg-white/50'
                  }`}
                >
                  {section.label}
                  {activeSection === section.id && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleDownload}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-xl shadow-primary/10"
          >
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      {/* Paper Content */}
      <div className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden min-h-[800px] flex flex-col">
        {/* Paper Header */}
        <div className="p-12 border-b border-slate-100 bg-slate-50/30">
          <div className="flex justify-between items-start mb-8">
            <div className="px-4 py-1.5 bg-accent/10 text-accent rounded-full text-[10px] font-black uppercase tracking-widest">
              Synthesized Research Paper
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all"><Share2 size={18} /></button>
              <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all"><Bookmark size={18} /></button>
              <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all"><Printer size={18} /></button>
            </div>
          </div>
          
          <h1 className="text-4xl font-black text-primary mb-6 leading-tight max-w-3xl">
            {paper.title}
          </h1>
          
          <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 text-[10px]">AI</div>
              {paper.authors.join(', ')}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Hash size={14} /> ID: {paper.paper_id.split('_')[1]}
            </div>
          </div>
        </div>

        {/* Paper Body */}
        <div className="p-16 flex-1 relative">
          <AnimatePresence mode='wait'>
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="prose prose-slate max-w-none"
            >
              <h2 className="text-2xl font-black text-primary mb-8 flex items-center gap-3">
                <div className="w-2 h-8 bg-accent rounded-full" />
                {sections.find(s => s.id === activeSection).label}
              </h2>
              
              <div className="text-lg text-slate-600 leading-loose space-y-6 font-serif">
                {activeSection === 'references' ? (
                  <div className="space-y-4 not-italic font-sans text-sm">
                    {paper.references.map((ref, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-accent font-black">[{i+1}]</span>
                        <span className="text-primary font-medium">{ref}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  paper[activeSection].split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-12 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Orchestrix Research Intelligence System</span>
          <span>© 2026 Academic Synthesis Engine</span>
        </div>
      </div>
    </div>
  );
}
