import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, BookOpen, ChevronRight, Check, Sparkles, Wand2, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

interface OnboardingProps {
  onComplete: (preferences: { language: string }) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

const TUTORIAL_STEPS = [
  {
    title: "The Golden Rule",
    description: "Always hold your cube with WHITE center on Top and GREEN center facing you.",
    icon: ShieldCheck,
    color: "text-blue-400"
  },
  {
    title: "Smart Scanning",
    description: "Use the camera to capture each face. Wait for the green lock before moving.",
    icon: Wand2,
    color: "text-purple-400"
  },
  {
    title: "Master the solve",
    description: "Follow the 3D steps. We'll track your time and help you become a pro.",
    icon: Sparkles,
    color: "text-yellow-400"
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<'language' | 'tutorial'>('language');
  const [selectedLang, setSelectedLang] = useState('en');
  const [tutorialIndex, setTutorialIndex] = useState(0);

  const handleNext = () => {
    if (step === 'language') {
      setStep('tutorial');
    } else {
      if (tutorialIndex < TUTORIAL_STEPS.length - 1) {
        setTutorialIndex(tutorialIndex + 1);
      } else {
        onComplete({ language: selectedLang });
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050b14] p-6 overflow-hidden"
    >
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[10%] left-[15%] w-64 h-64 bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[15%] w-64 h-64 bg-indigo-600 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        layout
        className="relative z-10 max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {step === 'language' ? (
            <motion.div
              key="lang"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Select Language</h2>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLang(lang.code)}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                      selectedLang === lang.code 
                        ? "bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    <span className="flex items-center gap-3 font-bold">
                      <span className="text-xl">{lang.flag}</span>
                      {lang.name}
                    </span>
                    {selectedLang === lang.code && <Check className="w-5 h-5 text-blue-400" />}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tutorial"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-full flex justify-between items-center mb-8">
                 <div className="flex gap-1">
                   {TUTORIAL_STEPS.map((_, i) => (
                     <div 
                       key={i} 
                       className={clsx(
                         "h-1 rounded-full transition-all duration-300",
                         i === tutorialIndex ? "w-6 bg-blue-500" : "w-2 bg-slate-700"
                       )} 
                     />
                   ))}
                 </div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tutorial {tutorialIndex + 1}/3</span>
              </div>

              <motion.div
                key={tutorialIndex}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-6"
              >
                <div className={clsx("w-20 h-20 mx-auto rounded-3xl bg-slate-800 flex items-center justify-center border border-white/5 shadow-inner", TUTORIAL_STEPS[tutorialIndex].color)}>
                   {React.createElement(TUTORIAL_STEPS[tutorialIndex].icon, { size: 40 })}
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-white mb-3">
                    {TUTORIAL_STEPS[tutorialIndex].title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {TUTORIAL_STEPS[tutorialIndex].description}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleNext}
          className="w-full mt-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
        >
          {step === 'language' ? 'Confirm Language' : tutorialIndex === TUTORIAL_STEPS.length - 1 ? 'Get Started' : 'Next Tip'}
          <ChevronRight size={20} />
        </button>
      </motion.div>
    </motion.div>
  );
}
