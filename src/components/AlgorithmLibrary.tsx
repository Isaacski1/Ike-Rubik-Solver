
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Play, ChevronRight, ArrowLeft, Hexagon, Zap } from 'lucide-react';
import { ALGORITHMS, type Algorithm } from '../data';
import clsx from 'clsx';

interface AlgorithmLibraryProps {
  onBack: () => void;
  onExplore: (algo: Algorithm) => void;
}

export default function AlgorithmLibrary({ onBack, onExplore }: AlgorithmLibraryProps) {
  const [filter, setFilter] = useState<string>('All');
  
  const categories = ['All', 'Basic', 'OLL', 'PLL'];
  const filtered = filter === 'All' ? ALGORITHMS : ALGORITHMS.filter(a => a.category === filter);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl w-full mx-auto p-4 md:p-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Back to Hub</span>
          </button>
          <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
             <BookOpen className="text-blue-500" />
             ALGORITHM <span className="text-blue-500">LAB</span>
          </h2>
          <p className="text-slate-400 font-medium mt-1">Master the moves used by the world's fastest solvers.</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={clsx(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                filter === cat ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-400 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((algo, i) => (
            <motion.div
              layout
              key={algo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
              className="group relative bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Hexagon size={80} strokeWidth={1} />
              </div>

              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {algo.category}
                  </span>
                  <div className="text-slate-600 font-mono text-[10px]">#{algo.id}</div>
                </div>
                
                <h3 className="text-xl font-black text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors">
                  {algo.name}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  {algo.description}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                   <div className="flex flex-wrap gap-2">
                      {algo.moves.map((move, idx) => (
                        <span key={idx} className="text-xs font-mono font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">
                          {move}
                        </span>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={() => onExplore(algo)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest group/btn transition-all"
                >
                  <Play size={14} className="fill-current group-hover/btn:scale-110 transition-transform" />
                  Explore Moves
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
