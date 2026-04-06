import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Activity, AlertCircle } from 'lucide-react';

export default function LoadingScale({ progress, label, isError }) {
  // SVG constants
  const size = 160;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className="flex flex-col items-center justify-center p-8"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label={label || "Loading progress"}
    >
      <div className="relative w-[180px] h-[180px] flex items-center justify-center">
        {/* Outer Orbit (Dashed) */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/20 animate-[spin_20s_linear_infinite]" />

        {/* Orbiting Pulse Badge */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="absolute inset-0 pointer-events-none"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-accent z-20"
          >
            <Activity size={16} />
          </motion.div>
        </motion.div>

        {/* Progress Ring (SVG) */}
        <svg 
          width={size} 
          height={size} 
          className="rotate-[-90deg] z-10"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(239, 35, 60, 0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress Fill */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--accent-color, #EF233C)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeInOut" }}
            strokeLinecap="round"
          />
        </svg>

        {/* Inner Circle Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={false}
            animate={{ 
              scale: isError ? 0.9 : 1,
              backgroundColor: isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 35, 60, 0.05)'
            }}
            className={`w-[110px] h-[110px] rounded-full border-4 flex flex-col items-center justify-center transition-colors duration-500 ${
              isError ? 'border-red-500 bg-red-50' : 'border-accent bg-accent/5'
            }`}
          >
            {isError ? (
              <AlertCircle size={32} className="text-red-500 mb-1" />
            ) : (
              <Zap size={32} className={`text-accent fill-accent/10 mb-1 ${progress < 100 ? 'animate-pulse' : ''}`} />
            )}
            <div className={`text-xl font-black ${isError ? 'text-red-600' : 'text-primary'}`}>
              {isError ? 'ERR' : `${Math.round(progress)}%`}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Label and Status */}
      <div className="mt-8 space-y-2 max-w-xs text-center">
        <h3 className={`text-lg font-bold transition-colors ${isError ? 'text-red-600' : 'text-primary'}`}>
          {isError ? 'Processing Error' : label || 'Neural Processing'}
        </h3>
        <p className="text-xs text-secondary leading-relaxed font-medium">
          {isError 
            ? 'Something went wrong while analyzing the research. Please try refreshing or adjusting your selection.' 
            : 'Our AI agents are analyzing trends, identifying key findings, and synthesizing summaries from your selected papers.'
          }
        </p>
      </div>
    </div>
  );
}
