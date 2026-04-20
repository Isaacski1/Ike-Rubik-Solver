
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Check, Lock, Coins, Sparkles, ShoppingBag } from 'lucide-react';
import { SKINS, type Skin } from '../data';
import clsx from 'clsx';

interface SkinsGalleryProps {
  currentSkinId: string;
  unlockedSkins: string[];
  coins: number;
  onSelect: (skinId: string) => void;
  onUnlock: (skin: Skin) => void;
  onBack: () => void;
}

export default function SkinsGallery({ 
  currentSkinId, 
  unlockedSkins, 
  coins, 
  onSelect, 
  onUnlock,
  onBack
}: SkinsGalleryProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
           <Palette className="text-pink-500" />
           PREMIUM <span className="text-pink-500">SKINS</span>
        </h3>
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-2xl">
           <Coins size={16} className="text-yellow-500" />
           <span className="text-sm font-black text-white">{coins}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {SKINS.map((skin) => {
          const isUnlocked = unlockedSkins.includes(skin.id);
          const isSelected = currentSkinId === skin.id;
          const canAfford = coins >= skin.cost;

          return (
            <motion.div
              key={skin.id}
              whileHover={{ x: isUnlocked ? 5 : 0 }}
              className={clsx(
                "relative group overflow-hidden rounded-3xl border transition-all p-5",
                isSelected ? "border-pink-500 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.2)]" : "border-white/5 bg-white/5"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="grid grid-cols-3 gap-0.5 w-12 h-12 rounded-lg overflow-hidden border border-white/10 rotate-12">
                      <div style={{ backgroundColor: skin.styles.U }} className="w-full h-full" />
                      <div style={{ backgroundColor: skin.styles.R }} className="w-full h-full" />
                      <div style={{ backgroundColor: skin.styles.F }} className="w-full h-full" />
                      <div style={{ backgroundColor: skin.styles.D }} className="w-full h-full" />
                      <div style={{ backgroundColor: skin.styles.L }} className="w-full h-full" />
                      <div style={{ backgroundColor: skin.styles.B }} className="w-full h-full" />
                   </div>
                   
                   <div>
                      <h4 className="font-black text-white text-lg tracking-tight">{skin.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{skin.description}</p>
                   </div>
                </div>

                <div className="flex items-center">
                  {isUnlocked ? (
                    isSelected ? (
                      <div className="bg-pink-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                         <Check size={14} /> Active
                      </div>
                    ) : (
                      <button 
                        onClick={() => onSelect(skin.id)}
                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
                      >
                        Equip
                      </button>
                    )
                  ) : (
                    <button 
                      onClick={() => onUnlock(skin)}
                      disabled={!canAfford}
                      className={clsx(
                        "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                        canAfford 
                          ? "bg-yellow-500 text-black hover:scale-105" 
                          : "bg-white/5 text-slate-500 cursor-not-allowed"
                      )}
                    >
                      <Lock size={14} /> {skin.cost}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <p className="text-[10px] text-slate-600 font-bold text-center uppercase tracking-widest mt-8">
        Solve cubes to earn more coins
      </p>
    </div>
  );
}
