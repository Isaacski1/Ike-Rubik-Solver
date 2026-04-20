import React from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, ArrowLeft, Trophy, Clock, Zap, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface SolveRecord {
  date: string;
  time: number;
}

interface AnalyticsDashboardProps {
  onBack: () => void;
  solveHistory: SolveRecord[];
}

export default function AnalyticsDashboard({ onBack, solveHistory }: AnalyticsDashboardProps) {
  const data = solveHistory.map((s, i) => ({
    index: i + 1,
    time: s.time,
    date: new Date(s.date).toLocaleDateString()
  }));

  const bestTime = solveHistory.length > 0 ? Math.min(...solveHistory.map(s => s.time)) : 0;
  const averageTime = solveHistory.length > 0 
    ? (solveHistory.reduce((acc, s) => acc + s.time, 0) / solveHistory.length).toFixed(1) 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-6xl w-full bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col min-h-[70vh]"
    >
      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-indigo-500" />
              Solve Intelligence
            </h2>
            <p className="text-slate-400 text-sm font-medium">Data-driven performance tracking</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'PB Time', value: bestTime + 's', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            { label: 'Average', value: averageTime + 's', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Total Solves', value: solveHistory.length, icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { label: 'Progress', value: 'Trending Up', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
                <stat.icon className={stat.color} size={20} />
              </div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className="text-2xl font-black text-white">{stat.value}</h4>
            </div>
          ))}
        </div>

        {/* Main Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Solve Time Trend
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="index" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Solve #', position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="time" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTime)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent History Table */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Logs
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
              {solveHistory.slice().reverse().map((solve, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/20 transition-all">
                  <div>
                    <p className="text-xs font-black text-white">{solve.time}s</p>
                    <p className="text-[10px] text-slate-500 font-bold">{solve.date}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrendingUp size={14} className="text-indigo-400" />
                  </div>
                </div>
              ))}
              {solveHistory.length === 0 && (
                <p className="text-center text-slate-600 text-xs py-8">No session data yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
