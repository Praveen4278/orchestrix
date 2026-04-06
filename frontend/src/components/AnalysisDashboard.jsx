import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Users, Hash, PieChart as PieChartIcon, Target, Award, Calendar, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#ef233c', '#2b2d42', '#8d99ae', '#d90429', '#f8f9fa', '#ced4da', '#6bb3f2', '#415a77'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-xl rounded-lg p-3 text-sm">
      <div className="text-secondary font-medium mb-1 border-b border-slate-100 pb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="font-bold flex items-center gap-2" style={{ color: p.color || COLORS[0] }}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || COLORS[0] }}></div>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function AnalysisDashboard({ analysis }) {
  if (!analysis) {
    return (
      <div className="text-center py-16 text-slate-500">
        <Target className="mx-auto mb-4 opacity-50" size={48} />
        <p>No analysis data available yet.</p>
      </div>
    );
  }

  const {
    publication_trends = [],
    top_authors = [],
    keyword_frequency = [],
    citation_distribution = {},
    emerging_topics = [],
    total_papers = 0,
    avg_citations = 0,
    year_range = {},
  } = analysis;

  const maxAuthorCount = Math.max(...top_authors.map(a => a.paper_count), 1);
  const citDistData = Object.entries(citation_distribution).map(([k, v]) => ({ name: k, count: v }));
  const keywordData = keyword_frequency.slice(0, 8);

  const StatCard = ({ icon: Icon, value, label, delay }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
    >
      <div className="w-12 h-12 rounded-full bg-light flex items-center justify-center text-primary">
        <Icon size={24} />
      </div>
      <div>
        <div className="text-sm font-bold text-secondary uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-3xl font-display font-bold text-primary">{value}</div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target} value={total_papers} label="Papers Analyzed" delay={0.1} />
        <StatCard icon={Award} value={Math.round(avg_citations)} label="Avg Citations" delay={0.2} />
        <StatCard icon={Calendar} value={year_range.min || '—'} label="Earliest Year" delay={0.3} />
        <StatCard icon={TrendingUp} value={year_range.max || '—'} label="Latest Year" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Publication Trends */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white border border-slate-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-6 text-primary font-bold">
            <TrendingUp className="text-accent" size={20} /> Publication Trends
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={publication_trends} margin={{ left: -20, bottom: -5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" name="Papers" fill="#ef233c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Citation Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white border border-slate-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-6 text-primary font-bold">
            <PieChartIcon className="text-accent" size={20} /> Citation Distribution
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={citDistData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={5}
                >
                  {citDistData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {citDistData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs font-bold text-secondary bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                {d.name}: {d.count}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Keyword Frequency */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-white border border-slate-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-6 text-primary font-bold">
            <Hash className="text-accent" size={20} /> Top Keywords
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={keywordData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="keyword" width={100} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" name="Frequency" fill="#2b2d42" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Authors */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-6 text-primary font-bold">
            <Users className="text-accent" size={20} /> Top Authors
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {top_authors.slice(0, 7).map((author, i) => {
              const pct = (author.paper_count / maxAuthorCount) * 100;
              return (
                <div key={i} className="flex items-center gap-4 group">
                  <span className="w-6 text-xs font-bold text-slate-400 group-hover:text-accent transition-colors">#{i+1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-primary truncate max-w-[150px] sm:max-w-xs">{author.name}</span>
                      <span className="text-xs font-bold text-secondary bg-slate-100 px-2 rounded-full">{author.paper_count} papers</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                        className="h-full bg-accent rounded-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Emerging Topics */}
      {emerging_topics.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-primary border border-secondary/20 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4 text-white font-bold">
            <ExternalLink className="text-accent" size={20} /> Emerging Intersections
          </div>
          <div className="flex flex-wrap gap-2">
            {emerging_topics.map((topic, i) => (
              <span key={i} className="bg-white/10 border border-white/10 text-white hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-default">
                {topic}
              </span>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
}
