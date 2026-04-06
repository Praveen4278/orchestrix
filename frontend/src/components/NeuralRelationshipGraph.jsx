import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, RefreshCw, Info, X, ExternalLink, MessageSquare, FileText, Zap } from 'lucide-react';
import { fetchGraphData, fetchClusterSummary } from '../utils/api';

const CLUSTER_COLORS = [
  '#ef233c', '#4361ee', '#4cc9f0', '#f72585', '#7209b7', 
  '#3a0ca3', '#f9c74f', '#90be6d', '#f94144', '#277da1'
];

export default function NeuralRelationshipGraph({ papers, onNodeClick, sessionId }) {
  const fgRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [clusterInfo, setClusterInfo] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  // 1. Fetch Advanced Graph Data from Backend
  useEffect(() => {
    const loadGraph = async () => {
      if (!papers || papers.length === 0) return;
      setLoading(true);
      try {
        const data = await fetchGraphData(papers);
        setGraphData(data);
      } catch (err) {
        console.error("Failed to load graph data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadGraph();
  }, [papers]);

  // 2. Physics Configuration
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      // Adjusted forces for more compact but clear layout
      const nodeCount = graphData.nodes.length;
      
      // Dynamic charge based on node count to keep density consistent
      const chargeStrength = nodeCount > 50 ? -200 : -150;
      fgRef.current.d3Force('charge').strength(chargeStrength);
      
      // Reduced link distance for closer grouping
      fgRef.current.d3Force('link').distance(70);
      
      // Compact collision force with 12px minimum gap
      fgRef.current.d3Force('collide', d3.forceCollide(node => {
        const citationBonus = Math.min(8, Math.log10((node.citations || 0) + 1) * 3);
        const nodeRadius = 8 + citationBonus;
        return nodeRadius + 12; // 12px padding between node boundaries
      }).iterations(2));

      // Add centering force to pull everything together
      fgRef.current.d3Force('center', d3.forceCenter(0, 0));
    }
  }, [graphData]);

  // 3. Interactions
  const updateHighlight = useCallback(() => {
    setHighlightNodes(new Set(highlightNodes));
    setHighlightLinks(new Set(highlightLinks));
  }, [highlightNodes, highlightLinks]);

  const handleNodeHover = node => {
    highlightNodes.clear();
    highlightLinks.clear();
    if (node) {
      highlightNodes.add(node.id);
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId === node.id || targetId === node.id) {
          highlightLinks.add(link);
          highlightNodes.add(sourceId);
          highlightNodes.add(targetId);
        }
      });
    }
    setHoverNode(node || null);
    updateHighlight();
  };

  const handleNodeClick = async (node, event) => {
    console.log(`[Graph] Node Clicked: ${node.title} (ID: ${node.id})`, { x: node.x, y: node.y });
    
    // Prevent event bubbling if necessary (though ForceGraph handles most of this)
    if (event) {
        event.stopPropagation();
    }

    setSelectedNode(node);
    setClusterInfo(null);
    // Fetch cluster summary when a node is clicked (showing context)
    try {
      const summary = await fetchClusterSummary(node.cluster_id, graphData.nodes, sessionId);
      setClusterInfo(summary);
    } catch (err) {
      console.error("Cluster summary failed:", err);
    }
  };

  const handleBackgroundClick = (event) => {
    console.log("[Graph] Background Clicked");
    setSelectedNode(null);
    setClusterInfo(null);
  };

  return (
    <div className="relative w-full h-[650px] bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl group">
      {loading && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full"
          />
        </div>
      )}

      {/* Graph Controls */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
        <button 
          onClick={() => fgRef.current.zoomToFit(400, 50)}
          className="p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 text-slate-500 hover:text-accent hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-sm"
          title="Zoom to Fit"
        >
          <Maximize2 size={18} />
        </button>
        <button 
          onClick={() => fgRef.current.centerAt(0, 0, 400)}
          className="p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 text-slate-500 hover:text-accent hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-sm"
          title="Recenter"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Legend & Stats */}
      <div className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-xl pointer-events-none max-w-[200px]">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Network Intelligence</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-accent shadow-sm shadow-accent/20" />
            <span className="text-[11px] font-bold text-primary">Research Paper</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-orange-400 ring-4 ring-orange-100" />
            <span className="text-[11px] font-bold text-primary">Bridge Paper</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-1 bg-slate-200 rounded-full" />
            <span className="text-[11px] font-bold text-primary">Semantic Link</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
          <div className="text-center">
            <div className="text-lg font-black text-primary leading-none">{graphData.nodes.length}</div>
            <div className="text-[8px] font-bold text-slate-400 uppercase mt-1">Nodes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-primary leading-none">{graphData.links.length}</div>
            <div className="text-[8px] font-bold text-slate-400 uppercase mt-1">Links</div>
          </div>
        </div>
      </div>

      {/* Selected Node Sidebar */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="absolute top-6 right-20 bottom-6 w-80 bg-white shadow-2xl rounded-[2rem] border border-slate-200 p-6 flex flex-col overflow-hidden pointer-events-auto"
            >
            <div className="flex justify-between items-start mb-4">
              <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase tracking-wider">
                Cluster #{selectedNode.cluster_id + 1}
              </div>
              <button onClick={handleBackgroundClick} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="text-lg font-bold text-primary mb-2 leading-tight">{selectedNode.title}</h3>
              <div className="flex items-center gap-2 text-xs text-secondary mb-4 font-medium">
                <span>{selectedNode.year}</span>
                <span>•</span>
                <span>{selectedNode.citations} citations</span>
                {selectedNode.is_bridge && (
                  <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-600 rounded-md flex items-center gap-1 font-bold">
                    <Zap size={10} fill="currentColor" /> Bridge
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-6 italic border-l-2 border-slate-100 pl-4">
                {selectedNode.abstract?.substring(0, 200)}...
              </p>

              {clusterInfo && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap size={12} className="text-accent" /> Cluster Insights
                  </h4>
                  <p className="text-xs text-primary font-medium mb-3">{clusterInfo.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {clusterInfo.key_themes.map(theme => (
                      <span key={theme} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-secondary uppercase">
                        {theme}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button 
                onClick={() => onNodeClick(selectedNode)}
                className="flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
              >
                <MessageSquare size={14} /> Interview
              </button>
              <button 
                className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-primary rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                onClick={() => window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(selectedNode.title)}`, '_blank')}
              >
                <ExternalLink size={14} /> Scholar
              </button>
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeRelSize={1}
        nodePointerAreaPaint={(node, color, ctx, globalScale) => {
          const isSelected = selectedNode?.id === node.id;
          const baseSize = 8;
          const citationBonus = Math.min(8, Math.log10((node.citations || 0) + 1) * 3);
          const size = (baseSize + citationBonus) * (isSelected ? 1.3 : 1);
          
          // Paint a slightly larger hit area for easier clicking
          const hitRadius = size + 4;
          
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, hitRadius, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const isSelected = selectedNode?.id === node.id;
          const isHighlighted = highlightNodes.size > 0 ? highlightNodes.has(node.id) : true;
          const isBridge = node.is_bridge;
          
          // Determine size based on citations
          const baseSize = 8;
          const citationBonus = Math.min(8, Math.log10((node.citations || 0) + 1) * 3);
          const size = (baseSize + citationBonus) * (isSelected ? 1.3 : 1);
          
          // Alpha based on highlight
          ctx.globalAlpha = isHighlighted ? 1 : 0.15;

          // Node Shadow
          if (isHighlighted) {
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 12 / globalScale;
          }

          // Node Outer Ring (for Bridge or Selection)
          if (isSelected || isBridge) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = isBridge ? 'rgba(251, 146, 60, 0.25)' : 'rgba(239, 35, 60, 0.15)';
            ctx.fill();
            if (isBridge) {
                ctx.strokeStyle = '#fb923c';
                ctx.lineWidth = 1.5 / globalScale;
                ctx.stroke();
            }
          }

          // Node Body
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
          ctx.fillStyle = CLUSTER_COLORS[node.cluster_id % CLUSTER_COLORS.length];
          ctx.fill();
          
          // Node Border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5 / globalScale;
          ctx.stroke();

          // Reset Shadow
          ctx.shadowBlur = 0;

          // Label
          if (globalScale > 1.2 || isSelected || hoverNode?.id === node.id) {
            const label = node.title;
            const fontSize = (isSelected ? 14 : 12) / globalScale;
            ctx.font = `${isSelected ? 'bold' : '500'} ${fontSize}px Inter, sans-serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.6);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
            ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y + size + 6, bckgDimensions[0], bckgDimensions[1], 6 / globalScale);
            ctx.fill();
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#1e293b';
            ctx.fillText(label, node.x, node.y + size + 6 + bckgDimensions[1] / 2);
          }
          
          ctx.globalAlpha = 1;
        }}
        nodeCanvasObjectMode={() => 'replace'}
        linkWidth={link => (highlightLinks.has(link) ? 3 : 1)}
        linkColor={link => {
          const isHighlighted = highlightLinks.size > 0 ? highlightLinks.has(link) : true;
          return isHighlighted ? 'rgba(43, 45, 66, 0.15)' : 'rgba(43, 45, 66, 0.02)';
        }}
        linkDirectionalParticles={link => highlightLinks.has(link) ? 4 : 0}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        cooldownTicks={100}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.3}
        onEngineStop={() => !selectedNode && fgRef.current.zoomToFit(600, 80)}
      />
    </div>
  );
}
