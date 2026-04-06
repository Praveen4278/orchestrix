import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Search, BarChart2, History, RotateCcw, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/', label: 'Search', icon: Search },
  { path: '/results', label: 'Results', icon: BarChart2 },
  { path: '/sessions', label: 'History', icon: History },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch, ACTIONS } = useApp();
  const [hoveredPath, setHoveredPath] = useState(null);

  const handleReset = () => {
    dispatch({ type: ACTIONS.SET_MODE, payload: null });
    dispatch({ type: ACTIONS.CLEAR_SESSION });
  };

  const isAllAgentsHealthy = Object.values(state.agentHealth || {}).every(a => a.status === 'ok');

  return (
    <div className="min-h-screen flex flex-col bg-light font-sans text-primary">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 inset-x-0 h-16 bg-primary border-b border-secondary/20 z-50 flex items-center justify-between px-6 shadow-sm">
        
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <div 
            className="font-display font-bold text-xl tracking-tight text-white cursor-pointer flex items-center gap-2"
            onClick={() => navigate('/')}
          >
            Orche<span className="text-accent">strix</span>
          </div>
          
          <div className="hidden md:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full bg-secondary/10 border border-secondary/20">
            <span className="text-[10px] uppercase tracking-wider font-bold text-secondary">Mode</span>
            <span className="text-xs font-medium text-white flex items-center gap-1">
              {state.executionMode === 'single' ? '🖥️ Single' : '🌐 Multi'}
            </span>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="hidden md:flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const isHovered = hoveredPath === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setHoveredPath(item.path)}
                onMouseLeave={() => setHoveredPath(null)}
                className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2
                  ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Icon size={16} />
                {item.label}
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-accent"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {/* Hover Background */}
                {isHovered && !isActive && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 bg-secondary/10 rounded-md -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 text-white">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/10 border border-secondary/20 shadow-sm" title="Agent Status">
            <Activity size={14} className={isAllAgentsHealthy ? 'text-green-400' : 'text-accent'} />
            <span className="hidden sm:inline text-xs font-medium text-slate-300">
              {Object.keys(state.agentHealth || {}).length > 0 ? (isAllAgentsHealthy ? 'System Optimal' : 'Degraded') : 'Idle'}
            </span>
          </div>
          
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-secondary/20 rounded-md transition-colors border border-transparent hover:border-secondary/30"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Change Mode</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 mt-16 overflow-auto bg-light">
        {children}
      </main>
    </div>
  );
}
