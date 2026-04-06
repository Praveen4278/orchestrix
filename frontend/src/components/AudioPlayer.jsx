import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, 
  Headphones, Download, FileText, Sparkles, Loader2,
  Clock, Headphones as HeadphonesIcon, Info
} from 'lucide-react';

export default function AudioPlayer({ briefing, loading, onGenerate }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(briefing?.duration_seconds || 0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  const isLocalSpeech = !briefing?.audio_base64 && briefing?.script;

  useEffect(() => {
    if (briefing?.duration_seconds) {
      setDuration(briefing.duration_seconds);
    } else if (isLocalSpeech) {
      // Estimate duration for local speech: ~140 wpm
      const words = briefing.script.split(' ').length;
      setDuration((words / 140) * 60);
    }
  }, [briefing, isLocalSpeech]);

  useEffect(() => {
    if (isLocalSpeech) {
      if (isPlaying) {
        if (synthRef.current.paused) {
          synthRef.current.resume();
        } else {
          const utterance = new SpeechSynthesisUtterance(briefing.script);
          utterance.onend = () => setIsPlaying(false);
          utterance.onboundary = (event) => {
            if (event.name === 'word') {
              const currentWordIndex = briefing.script.substring(0, event.charIndex).split(' ').length;
              const totalWords = briefing.script.split(' ').length;
              const estimatedTime = (currentWordIndex / totalWords) * duration;
              setCurrentTime(estimatedTime);
              setProgress((currentWordIndex / totalWords) * 100);
            }
          };
          utteranceRef.current = utterance;
          synthRef.current.speak(utterance);
        }
      } else {
        synthRef.current.pause();
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }

    return () => {
      if (isLocalSpeech) {
        synthRef.current.cancel();
      }
    };
  }, [isPlaying, isLocalSpeech, briefing, duration]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      if (isFinite(audioDuration) && audioDuration > 0) {
        console.log("[AudioPlayer] Metadata loaded, duration:", audioDuration);
        setDuration(audioDuration);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const audioDuration = audioRef.current.duration;
      if (isFinite(current) && isFinite(audioDuration) && audioDuration > 0) {
        setCurrentTime(current);
        setProgress((current / audioDuration) * 100);
      }
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      if (isFinite(audioDuration) && audioDuration > 0) {
        const seekTime = (e.target.value / 100) * audioDuration;
        if (isFinite(seekTime)) {
          audioRef.current.currentTime = seekTime;
          setProgress(e.target.value);
        }
      }
    }
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-12 flex flex-col items-center justify-center shadow-sm">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6"
        >
          <HeadphonesIcon size={40} className="text-accent" />
        </motion.div>
        <h3 className="text-xl font-bold text-primary mb-2">Generating Audio Briefing</h3>
        <p className="text-secondary text-sm mb-8">Crafting your professional research narrative...</p>
        <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 15, ease: "linear" }}
            className="h-full bg-accent"
          />
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-12 text-center text-white shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-accent rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
            <HeadphonesIcon size={32} className="text-white" />
          </div>
          <h3 className="text-2xl font-black mb-4">Executive Research Briefing</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-10 leading-relaxed text-sm">
            Generate a professional 2-minute audio summary of your top research papers. Perfect for consuming insights on the go.
          </p>
          <button 
            onClick={onGenerate}
            className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl flex items-center gap-3 mx-auto"
          >
            <Sparkles size={18} className="text-accent" />
            Generate Audio Brief
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Audio Player Card */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <HeadphonesIcon size={120} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
              {isLocalSpeech ? 'Local Voice Engine' : 'AI Master Audio'}
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
              <Clock size={14} />
              {formatTime(duration)}
            </div>
          </div>

          <h3 className="text-2xl font-black mb-10 pr-20 leading-tight">
            Research Briefing: <span className="text-accent">Scientific Insights Summary</span>
          </h3>

          {isLocalSpeech && (
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 text-slate-400">
              <Info size={20} className="text-accent shrink-0" />
              <p className="text-[11px] font-medium leading-relaxed">
                You are in <strong>Local Voice Mode</strong>. Audio is being generated in real-time by your browser. 
                MP3 download requires an OpenAI API key. You can download the script below instead.
              </p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-4 mb-10">
            <input 
              type="range" 
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent"
              value={progress}
              onChange={handleSeek}
            />
            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button className="text-slate-400 hover:text-white transition-colors">
                <SkipBack size={24} />
              </button>
              <button 
                onClick={togglePlay}
                className="w-20 h-20 bg-white text-slate-900 rounded-3xl flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-white/5"
              >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>
              <button className="text-slate-400 hover:text-white transition-colors">
                <SkipForward size={24} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              
              {!isLocalSpeech ? (
                <a 
                  href={`data:audio/mp3;base64,${briefing.audio_base64}`}
                  download="research-briefing.mp3"
                  className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all flex items-center gap-2"
                  title="Download MP3"
                >
                  <Download size={20} />
                </a>
              ) : (
                <button 
                  onClick={() => {
                    const blob = new Blob([briefing.script], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'research-briefing-script.txt';
                    a.click();
                  }}
                  className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all flex items-center gap-2"
                  title="Download Script (Local Mode)"
                >
                  <FileText size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        <audio 
          ref={audioRef}
          src={`data:audio/mp3;base64,${briefing.audio_base64}`}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          muted={isMuted}
        />
      </div>

      {/* Script Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden">
        <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <FileText size={16} /> Narrator Script
          </h4>
        </div>
        <div className="p-10">
          <p className="text-primary leading-loose font-medium text-lg italic opacity-80">
            {briefing.script}
          </p>
        </div>
      </div>
    </div>
  );
}
