import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Loader2, 
  User, 
  Bot, 
  Paperclip, 
  X, 
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Play,
  Pause,
  Settings2,
  Mic2,
  BookOpenCheck
} from 'lucide-react';
import { chatWithPapers } from '../utils/api';
import TypingEffect from './TypingEffect';

export default function PaperChatbot({ sessionId, papers, interviewPaper = null, onExitInterview }) {
  const [messages, setMessages] = useState([]);
  const [input, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [typingSpeed, setTypingSpeed] = useState(40);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Clear messages when switching to interview mode
  useEffect(() => {
    if (interviewPaper) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I am the lead author of "${interviewPaper.title}". I'm here to answer any specific questions you have about our study, methodology, or findings. How can I help you today?`,
        timestamp: new Date().toISOString()
      }]);
    } else {
      setMessages([]);
    }
  }, [interviewPaper]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q && attachments.length === 0) return;
    if (isLoading) return;

    const userMsg = {
      role: 'user',
      content: q,
      attachments: attachments.map(a => ({ name: a.name, type: a.type })),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const payload = {
        session_id: sessionId,
        query: q,
        history: messages,
        attachments: userMsg.attachments,
        interview_paper_id: interviewPaper?.id // Pass target paper for persona mode
      };

      const response = await chatWithPapers(payload);
      
      const assistantMsg = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat failed", err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error while processing your request. Please check if Ollama is running with llama3.2.",
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl bg-accent bg-opacity-10 flex items-center justify-center text-accent`}>
            {interviewPaper ? <Mic2 size={22} /> : <Bot size={22} />}
          </div>
          <div>
            <h3 className="font-bold text-primary text-sm">
              {interviewPaper ? 'Author Interview' : 'Research Assistant'}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                {interviewPaper ? 'Persona Mode' : 'llama3.2 Active'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {interviewPaper && (
            <button 
              onClick={onExitInterview}
              className="px-3 py-1.5 text-[10px] font-bold text-accent hover:bg-accent/5 transition-all bg-white rounded-xl border border-accent/20 flex items-center gap-1.5"
            >
              <X size={12} /> Exit Interview
            </button>
          )}
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 text-slate-400 hover:text-accent transition-colors bg-white rounded-lg border border-slate-200"
            title={isPaused ? "Resume Typing" : "Pause Typing"}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-slate-400 hover:text-accent transition-colors bg-white rounded-lg border border-slate-200"
              title="Typing Settings"
            >
              <Settings2 size={14} />
            </button>
            
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 min-w-[200px]"
                >
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Typing Speed</h4>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={typingSpeed}
                    onChange={(e) => setTypingSpeed(parseInt(e.target.value))}
                    className="w-full accent-accent mb-2"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Slow</span>
                    <span>{typingSpeed} cps</span>
                    <span>Fast</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-sm text-[10px] font-bold text-secondary uppercase tracking-widest">
            <Sparkles size={12} className="text-accent" />
            Context Aware
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
              <MessageSquare size={32} />
            </div>
            <h4 className="font-bold text-primary mb-2">Ask about your research</h4>
            <p className="text-sm text-secondary max-w-[280px]">
              Ask questions about methodologies, findings, or contradictions across the selected {papers?.length || ''} papers.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-xs">
              {[
                "What are the main findings?",
                "Compare the methodologies used.",
                "Are there any contradictions?"
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-xl p-2.5 hover:border-accent hover:text-accent transition-all text-left"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-accent'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="space-y-2">
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : msg.isError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-white border border-slate-200 text-primary shadow-sm rounded-tl-none'
                }`}>
                  {msg.role === 'assistant' && !msg.isError ? (
                    <TypingEffect 
                      text={msg.content} 
                      speed={typingSpeed} 
                      isPaused={isPaused}
                      onComplete={scrollToBottom}
                    />
                  ) : (
                    msg.content
                  )}
                  
                  {msg.attachments?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.attachments.map((at, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-black/10 rounded-lg text-[10px] font-medium">
                          <Paperclip size={10} />
                          {at.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-tighter ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center animate-pulse">
                <Bot size={16} className="text-accent" />
              </div>
              <div className="flex gap-1">
                <span className="animate-bounce inline-block">.</span>
                <span className="animate-bounce inline-block [animation-delay:0.2s]">.</span>
                <span className="animate-bounce inline-block [animation-delay:0.4s]">.</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 mb-3"
            >
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-primary group border border-slate-200">
                  <div className="text-accent">
                    {file.type.startsWith('image/') ? <ImageIcon size={14} /> : <Paperclip size={14} />}
                  </div>
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-xl transition-all"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about the research papers..."
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-accent focus:outline-none transition-all pr-12 font-medium"
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                isLoading || (!input.trim() && attachments.length === 0)
                  ? 'text-slate-300'
                  : 'bg-accent text-white shadow-lg shadow-accent/20 hover:shadow-accent/40'
              }`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </form>
        <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
          Answers restricted to provided research context
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
