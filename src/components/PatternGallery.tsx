import React from 'react';
import { motion } from 'motion/react';
import { Palette, Play, Info, ArrowLeft } from 'lucide-react';
import { PATTERNS, type Pattern } from '../data';
import clsx from 'clsx';

interface PatternGalleryProps {
  onBack: () => void;
  onApply: (pattern: Pattern) => void;
}

export default function PatternGallery({ onBack, onApply }: PatternGalleryProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl w-full bg-slate-900/60 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
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
              <Palette className="w-8 h-8 text-pink-500" />
              Pattern Museum
            </h2>
            <p className="text-slate-400 text-sm font-medium">Transform your solved cube into geometric art</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PATTERNS.map((pattern) => (
            <motion.div
              key={pattern.id}
              whileHover={{ scale: 1.02 }}
              className="group bg-white/5 border border-white/10 rounded-[2.5rem] p-6 hover:bg-white/10 transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-pink-500/20 rounded-2xl text-pink-400">
                  <Palette size={24} />
                </div>
                <div className="flex gap-2">
                   <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     {pattern.moves.length} MOVES
                   </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-white mb-2">{pattern.name}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {pattern.description}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onApply(pattern)}
                  className="flex-1 py-4 bg-pink-600 hover:bg-pink-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-pink-600/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play size={16} />
                  Animate Pattern
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="p-8 bg-black/20 border-t border-white/5 text-center">
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
          Cube must be in solved state to apply patterns correctly
        </p>
      </div>
    </motion.div>
  );
}
