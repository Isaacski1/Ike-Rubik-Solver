import React, { useState, useEffect, useRef } from 'react';
import Cube from 'cubejs';
import confetti from 'canvas-confetti';
import { 
  RotateCcw, Play, Pause, ChevronRight, ChevronLeft, CheckCircle2, 
  AlertCircle, Loader2, Camera, Dices, Music, Volume2, Compass, 
  Settings as SettingsIcon, Timer, Trophy, Eye, EyeOff, LayoutTemplate, 
  Moon, Sun, Sparkles, Globe, BookOpen, Palette, Grid3X3, Coins, 
  Users, HelpCircle, ArrowLeft, Hexagon, Zap, Target, Activity, Clock, X, Wand2
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import SolverWorker from './solver.worker?worker';
import CameraScanner from './components/CameraScanner';
import GalaxyBackground from './components/GalaxyBackground';
import SplashScreen from './components/SplashScreen';
import Onboarding from './components/Onboarding';
import AlgorithmLibrary from './components/AlgorithmLibrary';
import SkinsGallery from './components/SkinsGallery';
import PatternGallery from './components/PatternGallery';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { 
  ALGORITHMS, ACHIEVEMENTS, SKINS, PATTERNS, PERSONALITIES, 
  type Algorithm, type Skin, type Pattern, type Personality 
} from './data';
import { GoogleGenAI } from "@google/genai";

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
const CENTERS = [4, 13, 22, 31, 40, 49];

const AUDIO_TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3',
];

const COLOR_MAP: Record<string, string> = {
  U: 'bg-white',
  R: 'bg-red-500',
  F: 'bg-green-500',
  D: 'bg-yellow-400',
  L: 'bg-orange-500',
  B: 'bg-blue-600',
  empty: 'bg-slate-700',
};

const COLOR_NAMES: Record<string, string> = {
  U: 'White',
  R: 'Red',
  F: 'Green',
  D: 'Yellow',
  L: 'Orange',
  B: 'Blue',
};

function getHexColor(color: string, currentSkin?: Skin): string {
  if (currentSkin) {
    return (currentSkin.styles as any)[color] || (currentSkin.styles as any).empty;
  }
  switch (color) {
    case 'U': return '#ffffff';
    case 'R': return '#ef4444'; // red-500
    case 'F': return '#22c55e'; // green-500
    case 'D': return '#facc15'; // yellow-400
    case 'L': return '#f97316'; // orange-500
    case 'B': return '#2563eb'; // blue-600
    case 'empty': return '#94a3b8'; // slate-400
    default: return '#94a3b8';
  }
}

let audioCtx: AudioContext | null = null;

function playTurnSound() {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const ctx = audioCtx;
    
    // Plastic clack sound
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Add a tiny bit of noise for the sliding plastic sound
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
    noise.start();
    noise.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error("Audio play failed", e);
  }
}

export default function App() {
  const [cubeState, setCubeState] = useState<string[]>(() => {
    const state = Array(54).fill('empty');
    state[4] = 'U';
    state[13] = 'R';
    state[22] = 'F';
    state[31] = 'D';
    state[40] = 'L';
    state[49] = 'B';
    return state;
  });

  const [selectedColor, setSelectedColor] = useState<string>('U');
  const [solution, setSolution] = useState<string[] | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [view, setView] = useState<'home' | 'solve' | 'learn' | 'patterns' | 'stats'>('home');
  const [level, setLevel] = useState<number>(() => parseInt(localStorage.getItem('user_level') || '1'));
  const [xp, setXp] = useState<number>(() => parseInt(localStorage.getItem('user_xp') || '0'));
  const [coins, setCoins] = useState<number>(() => parseInt(localStorage.getItem('user_coins') || '100'));
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => JSON.parse(localStorage.getItem('unlocked_skins') || '["classic"]'));
  const [currentSkinId, setCurrentSkinId] = useState<string>(() => localStorage.getItem('current_skin') || 'classic');
  const [currentPersonalityId, setCurrentPersonalityId] = useState<string>(() => localStorage.getItem('current_personality') || 'coach');
  const [solveHistory, setSolveHistory] = useState<{date: string, time: number}[]>(() => JSON.parse(localStorage.getItem('solve_history') || '[]'));
  const [dailyScramble, setDailyScramble] = useState<string[]>(() => JSON.parse(localStorage.getItem('daily_scramble') || '[]'));
  const [lastChallengeDate, setLastChallengeDate] = useState<string>(() => localStorage.getItem('last_challenge_date') || '');
  
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('language') || 'en');
  const [lastMoveTime, setLastMoveTime] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [theme, setTheme] = useState<'galaxy' | 'minimal' | 'dark'>('galaxy');
  const [lowPowerMode, setLowPowerMode] = useState<boolean>(() => localStorage.getItem('low_power_mode') === 'true');
  const [solveTimerActive, setSolveTimerActive] = useState<boolean>(false);
  const [solveElapsedTime, setSolveElapsedTime] = useState<number>(0);

  const currentSkinData = SKINS.find(s => s.id === currentSkinId) || SKINS[0];
  const [bestSolveTime, setBestSolveTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('bestSolveTime');
    return saved ? parseInt(saved, 10) : null;
  });
  
  const timerIntervalRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const prevStepRef = useRef<number>(currentStep);

  const generateWCAScramble = () => {
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const moves = [];
    let lastFace = '';
    
    for (let i = 0; i < 20; i++) {
      let face;
      do {
        face = faces[Math.floor(Math.random() * faces.length)];
      } while (face === lastFace);
      
      const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
      moves.push(face + mod);
      lastFace = face;
    }
    return moves;
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastChallengeDate !== today) {
      setDailyScramble(generateWCAScramble());
      setLastChallengeDate(today);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('user_level', level.toString());
    localStorage.setItem('user_xp', xp.toString());
    localStorage.setItem('user_coins', coins.toString());
    localStorage.setItem('unlocked_skins', JSON.stringify(unlockedSkins));
    localStorage.setItem('current_skin', currentSkinId);
    localStorage.setItem('current_personality', currentPersonalityId);
    localStorage.setItem('solve_history', JSON.stringify(solveHistory));
    localStorage.setItem('daily_scramble', JSON.stringify(dailyScramble));
    localStorage.setItem('last_challenge_date', lastChallengeDate);
    localStorage.setItem('low_power_mode', lowPowerMode.toString());
  }, [level, xp, coins, unlockedSkins, currentSkinId, currentPersonalityId, solveHistory, dailyScramble, lastChallengeDate, lowPowerMode]);

  useEffect(() => {
    workerRef.current = new SolverWorker();
    
    // Initialize random track
    if (bgMusicRef.current) {
      bgMusicRef.current.src = AUDIO_TRACKS[Math.floor(Math.random() * AUDIO_TRACKS.length)];
      bgMusicRef.current.volume = 0.4;
    }
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Interaction-triggered Auto-play
  useEffect(() => {
    if (hasInteracted) return;

    const handleInteraction = () => {
      if (!hasInteracted && bgMusicRef.current) {
        const playPromise = bgMusicRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsMusicPlaying(true);
            setHasInteracted(true);
            console.log("Audio auto-played successfully!");
          }).catch(err => {
            console.warn("Audio start prevented even after interaction:", err);
          });
        }
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [hasInteracted]);

  const addXp = (amount: number) => {
    const newXp = xp + amount;
    const nextLevelXp = level * 1000;
    if (newXp >= nextLevelXp) {
      setLevel(prev => prev + 1);
      setXp(newXp - nextLevelXp);
      setCoins(prev => prev + 100); // Level up reward
    } else {
      setXp(newXp);
    }
  };

  const getAiTip = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiTip(null);
    
    const personality = PERSONALITIES.find(p => p.id === currentPersonalityId) || PERSONALITIES[0];

    // Check for "demo mode" if AI is not initialized
    if (!ai) {
      setTimeout(() => {
        const fallbackTips = [
          "This move helps align the corner pieces without disturbing the cross.",
          "We're positioning this edge piece to build the second layer.",
          "This sequence is part of the 'Sune' algorithm to orient top corners.",
          "Keep steady! You're almost done with the OLL stage.",
          "This move rotates the face to match the side colors."
        ];
        const baseTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
        setAiTip(`[${personality.name}] ${baseTip} (Training Mode)`);
        setIsAiLoading(false);
      }, 800);
      return;
    }

    try {
      const prompt = `${personality.prompt} The student is at step ${currentStep + 1} of the solve. The current move is "${solution?.[currentStep]}".
      Explain the logic behind this move for a beginner. Why are we doing this? 
      Keep it brief and encouraging. Maximum 2 sentences. Do not mention that you are an AI.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiTip(response.text || "Keep focusing on the target face!");
    } catch (err) {
      console.error("AI Error:", err);
      setAiTip("Focus on aligning the center pieces first!");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSongEnd = () => {
    if (bgMusicRef.current) {
      const currentSrc = bgMusicRef.current.src;
      const currentIndex = AUDIO_TRACKS.findIndex(s => currentSrc.includes(s));
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % AUDIO_TRACKS.length : 0;
      
      bgMusicRef.current.src = AUDIO_TRACKS[nextIndex];
      bgMusicRef.current.load(); // Ensure the new source is loaded
      
      if (isMusicPlaying) {
        const playPromise = bgMusicRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Auto-play prevented on new song:", error);
            setIsMusicPlaying(false);
          });
        }
      }
    }
  };

  const toggleMusic = () => {
    if (bgMusicRef.current) {
      if (isMusicPlaying) {
        bgMusicRef.current.pause();
      } else {
        const playPromise = bgMusicRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(console.error);
        }
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  useEffect(() => {
    if (solution && currentStep !== prevStepRef.current) {
      playTurnSound();
      setLastMoveTime(Date.now());
      prevStepRef.current = currentStep;
    }
  }, [currentStep, solution]);

  // Solve Timer Effect
  useEffect(() => {
    if (solveTimerActive) {
      timerIntervalRef.current = window.setInterval(() => {
        setSolveElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [solveTimerActive]);

  // Start timer when solution begins
  useEffect(() => {
    if (solution && solution.length > 0 && currentStep === 1 && !solveTimerActive && solveElapsedTime === 0) {
      setSolveTimerActive(true);
    }
  }, [currentStep, solution, solveTimerActive, solveElapsedTime]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoPlaying && solution && currentStep < solution.length) {
      timer = setTimeout(() => {
        setCurrentStep(s => s + 1);
      }, 2800);
    } else if (isAutoPlaying && solution && currentStep >= solution.length) {
      setIsAutoPlaying(false);
    }
    
    // Confetti on solve completion
    if (solution && currentStep === solution.length && solution.length > 0 && prevStepRef.current !== currentStep) {
      // Stop timer
      setSolveTimerActive(false);
      
      // Award XP and Coins
      addXp(250);
      setCoins(c => c + 50);
      
      // Update best time
      if (!bestSolveTime || solveElapsedTime < bestSolveTime) {
        setBestSolveTime(solveElapsedTime);
        localStorage.setItem('bestSolveTime', solveElapsedTime.toString());
      }

      // Record to history
      setSolveHistory(prev => [...prev, { date: new Date().toISOString(), time: solveElapsedTime }]);
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#ef4444', '#22c55e', '#facc15', '#f97316', '#2563eb']
      });
    }

    return () => clearTimeout(timer);
  }, [isAutoPlaying, currentStep, solution, solveElapsedTime, bestSolveTime]);

  const handleSquareClick = (index: number) => {
    if (CENTERS.includes(index)) return;
    
    setCubeState((prev) => {
      const newState = [...prev];
      newState[index] = selectedColor;
      return newState;
    });
    setError(null);
    setSolution(null);
    setIsAutoPlaying(false);
  };

  const validateCube = () => {
    const counts: Record<string, number> = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0, empty: 0 };
    cubeState.forEach((c) => counts[c]++);

    if (counts.empty > 0) {
      setError(`Please fill all squares. ${counts.empty} remaining.`);
      return false;
    }

    for (const color of ['U', 'R', 'F', 'D', 'L', 'B']) {
      if (counts[color] !== 9) {
        setError(`Invalid cube: Each color must appear exactly 9 times. ${COLOR_NAMES[color]} appears ${counts[color]} times.`);
        return false;
      }
    }

    setIsSolving(true);
    setError(null);

    const worker = workerRef.current;
    if (!worker) {
      setError('Solver is initializing. Please try again in a moment.');
      setIsSolving(false);
      return;
    }
    
    // Safety timeout in case the solver hangs on an invalid cube
    const timeout = setTimeout(() => {
      // If it times out, we need to terminate and recreate the worker
      worker.terminate();
      workerRef.current = new SolverWorker();
      setIsSolving(false);
      setError('Solver timed out. The cube configuration is likely invalid or unsolvable.');
    }, 10000);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      setIsSolving(false);
      const { success, solveStr, isSolved, error } = e.data;
      
      if (success) {
        if (isSolved) {
          setSolution([]);
          setIsAutoPlaying(false);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ffffff', '#ef4444', '#22c55e', '#facc15', '#f97316', '#2563eb']
          });
        } else {
          const moves = solveStr.split(' ').filter(Boolean);
          setSolution(moves);
          setCurrentStep(0);
          setIsAutoPlaying(true);
        }
      } else {
        setError(error || 'Invalid cube configuration. Please check your colors.');
      }
    };

    worker.postMessage({ cubeStr: cubeState.join('') });
  };

  const handleSolve = () => {
    validateCube();
  };

  const handleScramble = () => {
    // @ts-ignore - The types for cubejs are sometimes missing methods, but randomize exists
    const c = new Cube();
    c.randomize();
    setCubeState(c.asString().split(''));
    setSolution(null);
    setCurrentStep(0);
    setError(null);
    setIsAutoPlaying(false);
  };

  const handleReset = () => {
    setCubeState(() => {
      const state = Array(54).fill('empty');
      state[4] = 'U';
      state[13] = 'R';
      state[22] = 'F';
      state[31] = 'D';
      state[40] = 'L';
      state[49] = 'B';
      return state;
    });
    setSolution(null);
    setCurrentStep(0);
    setError(null);
    setIsAutoPlaying(false);
    setSolveTimerActive(false);
    setSolveElapsedTime(0);
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => {
          const hasDoneOnboarding = localStorage.getItem('onboarding_complete');
          if (hasDoneOnboarding) {
            setShowSplash(false);
          } else {
            setShowSplash(false);
            setShowOnboarding(true);
          }
        }} />}
      </AnimatePresence>

      <AnimatePresence>
        {showOnboarding && (
          <Onboarding 
            onComplete={(prefs) => {
              setLanguage(prefs.language);
              localStorage.setItem('language', prefs.language);
              localStorage.setItem('onboarding_complete', 'true');
              setShowOnboarding(false);
            }} 
          />
        )}
      </AnimatePresence>

      <div className={clsx(
        "min-h-screen transition-all duration-700 flex flex-col items-center py-8 px-4 font-sans text-slate-100 relative overflow-hidden",
        theme === 'galaxy' && "bg-transparent",
        theme === 'minimal' && "bg-slate-50 text-slate-900",
        theme === 'dark' && "bg-black text-slate-100"
      )}>
        <div className="noise-bg" />
        
        {/* Hidden audio element for background music - Persists across all views */}
        <audio 
          ref={bgMusicRef} 
          onEnded={handleSongEnd}
          onPlay={() => setIsMusicPlaying(true)}
          onPause={() => setIsMusicPlaying(false)}
          className="hidden" 
          preload="auto" 
        />
        
        {theme === 'galaxy' && <GalaxyBackground />}

        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl flex flex-col items-center flex-1 pb-10"
            >
              {/* Header with Glass Pill */}
              <div className="w-full flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Zap className="text-white w-5 h-5 fill-current" />
                   </div>
                   <div>
                     <h2 className="text-xl font-black text-white tracking-tighter leading-none mb-1">ISAACSKI RUBIK SOLVER</h2>
                     <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest opacity-60">System Ready</p>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl px-3 py-1.5 rounded-2xl border border-white/10 shadow-inner relative overflow-hidden group">
                    <div 
                      className="absolute bottom-0 left-0 h-[2px] bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${(xp / (level * 1000)) * 100}%` }}
                    />
                    <Hexagon className="w-4 h-4 text-yellow-500 fill-yellow-500/20 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-slate-300">Lvl {level}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-500/10 backdrop-blur-xl px-3 py-1.5 rounded-2xl border border-emerald-500/20 shadow-inner">
                    <Coins className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                    <span className="text-xs font-black text-emerald-400">{coins}</span>
                  </div>
                </div>
              </div>

              {/* Bento Layout */}
              <motion.div 
                variants={{
                  show: {
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-6 grid-rows-6 gap-4 w-full aspect-square sm:aspect-auto"
              >
                
                {/* 1. MAIN HERO: Live Cube Hub (3x4) */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -5 }}
                  className="col-span-6 sm:col-span-4 row-span-4 bg-gradient-to-br from-slate-900/80 to-slate-800/40 rounded-[2.5rem] border border-white/10 p-8 flex flex-col relative overflow-hidden group shadow-2xl backdrop-blur-md"
                >
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700" />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-3xl font-black text-white tracking-tighter mb-2">SOLVE ENGINE</h3>
                        <p className="text-sm text-slate-400 font-medium max-w-[180px] leading-snug">The world's fastest interactive cube recognizer.</p>
                      </div>
                      <div className="bg-white/5 p-2 rounded-xl border border-white/5 self-start">
                         <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center -my-8 group-hover:scale-105 transition-transform duration-500">
                       <div className="scale-[0.8] sm:scale-[0.95] md:scale-110 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                         <Cube3D 
                           cubeState={cubeState} 
                           solution={null} 
                           currentStep={0} 
                           handleSquareClick={() => {}} 
                           isDashboard={true}
                           currentSkin={SKINS.find(s => s.id === currentSkinId)}
                           lowPowerMode={lowPowerMode}
                         />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button 
                        onClick={() => { setIsScanning(true); setView('solve'); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Camera size={14} /> Scan
                      </button>
                      <button 
                        onClick={() => setView('solve')}
                        className="bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black text-[10px] border border-white/10 uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                         <Grid3X3 size={14} /> Manual
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* 2. STATS: Best Time (2x2) */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setView('stats')}
                  className="col-span-3 sm:col-span-2 row-span-2 bg-indigo-600/10 rounded-[2rem] border border-indigo-500/20 p-6 flex flex-col justify-between group overflow-hidden backdrop-blur-md relative cursor-pointer"
                >
                  <div className="absolute top-2 right-2 text-indigo-400/30 group-hover:text-indigo-400/60 transition-colors">
                     <Timer size={40} strokeWidth={1} />
                  </div>
                  <div className="relative z-10">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Record</span>
                    <h4 className="text-2xl font-black text-white font-mono">
                      {bestSolveTime ? `${Math.floor(bestSolveTime/60)}:${(bestSolveTime%60).toString().padStart(2, '0')}` : '--:--'}
                    </h4>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest relative z-10">PB Solve TIME</div>
                </motion.div>

                {/* 3. TRAINING: Learn (2x2) */}
                <motion.button 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setView('learn')}
                  className="col-span-3 sm:col-span-2 row-span-2 bg-emerald-600/10 rounded-[2.5rem] border border-emerald-500/20 p-6 flex flex-col items-center justify-center gap-3 transition-colors hover:bg-emerald-500/20 group relative overflow-hidden backdrop-blur-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <BookOpen size={32} className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Training</span>
                </motion.button>

                {/* 4. CHALLENGE: Daily Mission (3x2) */}
                <motion.div 
                   variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                   whileHover={{ y: -5 }}
                   className="col-span-6 sm:col-span-3 row-span-2 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-[2rem] border border-yellow-500/20 p-6 flex items-center justify-between group overflow-hidden backdrop-blur-md relative"
                >
                  <div className="flex-1 pr-4">
                     <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block mb-1">Challenge</span>
                     <h4 className="text-lg font-black text-white tracking-tight mb-0">DAILY MISSION</h4>
                     <p className="text-[10px] font-mono text-slate-500 mb-3 truncate max-w-[150px]">
                       {dailyScramble.join(' ')}
                     </p>
                     <button 
                        onClick={() => {
                          setCubeState(Array(54).fill('empty')); // Reset to empty for manual scramble from guide
                          setSolution(dailyScramble);
                          setCurrentStep(0);
                          setView('solve');
                        }}
                        className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                     >
                       Scramble Guide
                     </button>
                  </div>
                  <Target className="w-12 h-12 text-yellow-500/50 group-hover:text-yellow-500 transition-all rotate-12 group-hover:rotate-0" />
                </motion.div>

                {/* 5. GALAXY: Pro Features (3x2) */}
                <motion.div 
                   variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                   whileHover={{ y: -5 }}
                   className="col-span-6 sm:col-span-3 row-span-2 bg-slate-900/80 rounded-[2rem] border border-white/5 p-6 flex items-center justify-between group overflow-hidden backdrop-blur-md relative"
                >
                  <div className="flex-1 pr-4">
                     <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-1">Prestige</span>
                     <h4 className="text-lg font-black text-white tracking-tight mb-2">ART MUSEUM</h4>
                     <button 
                        onClick={() => setView('patterns')}
                        className="text-white/40 hover:text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all bg-white/5 border border-white/10"
                     >
                       Explore
                     </button>
                  </div>
                  <Palette className="w-12 h-12 text-pink-500/50 group-hover:text-pink-500 transition-all" />
                </motion.div>

              </motion.div>

              {/* Unique Bottom Navigation Bar (Floating) */}
              <div className="mt-12 flex justify-center">
                 <div className="glass-morphism bg-white/5 backdrop-blur-2xl border border-white/10 p-2 rounded-[2rem] flex items-center gap-1 shadow-2xl shadow-black/80">
                   <button 
                     onClick={() => setShowSettings(true)}
                     className="p-4 rounded-[1.5rem] bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-white transition-all group"
                   >
                     <SettingsIcon size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                   </button>
                   <button 
                     onClick={() => setView('patterns')}
                     className="p-4 rounded-[1.5rem] bg-white/5 hover:bg-pink-500/20 text-slate-400 hover:text-pink-400 transition-all"
                   >
                     <Palette size={20} />
                   </button>
                   <button 
                     onClick={() => setView('stats')}
                     className="p-4 rounded-[1.5rem] bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all"
                   >
                     <Activity size={20} />
                   </button>
                 </div>
              </div>
            </motion.div>
          ) : view === 'learn' ? (
            <AlgorithmLibrary 
              onBack={() => setView('home')}
              onExplore={(algo) => {
                const solved = [];
                for(let f of FACES) for(let i=0; i<9; i++) solved.push(f);
                setCubeState(solved);
                setSolution(algo.moves);
                setCurrentStep(0);
                setView('solve');
              }}
            />
          ) : view === 'patterns' ? (
            <PatternGallery 
              onBack={() => setView('home')}
              onApply={(pattern) => {
                const solved = [];
                for(let f of FACES) for(let i=0; i<9; i++) solved.push(f);
                setCubeState(solved);
                setSolution(pattern.moves);
                setCurrentStep(0);
                setView('solve');
              }}
            />
          ) : view === 'stats' ? (
            <AnalyticsDashboard 
              onBack={() => setView('home')}
              solveHistory={solveHistory}
            />
          ) : (
            <motion.div 
              key="solve"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={clsx(
                "max-w-5xl w-full rounded-4xl shadow-2xl overflow-hidden flex flex-col border transition-all duration-700",
                theme === 'galaxy' && "bg-slate-900/40 backdrop-blur-xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                theme === 'minimal' && "bg-white border-slate-200 shadow-xl",
                theme === 'dark' && "bg-zinc-900 border-zinc-800 shadow-2xl"
              )}
            >
              
              {/* Header */}
              <div className={clsx(
                "flex flex-col sm:flex-row justify-between items-center p-4 sm:p-6 md:p-8 border-b transition-colors duration-500 gap-4 sm:gap-0",
                theme === 'galaxy' && "border-white/10 bg-transparent",
                theme === 'minimal' && "border-slate-100 bg-slate-50/50",
                theme === 'dark' && "border-white/5 bg-zinc-900/50"
              )}>
                <button 
                  onClick={() => setView('home')}
                  className="flex items-center gap-2 group text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                  <span className="text-xs font-black uppercase tracking-widest">Back</span>
                </button>

                <h1 className="text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 text-center drop-shadow-sm">
                  ISAACSKI RUBIK ENGINE
                </h1>

                <div className="flex items-center gap-3">
                  <button onClick={toggleMusic} className="text-slate-400 hover:text-blue-400 p-2">
                    {isMusicPlaying ? <Volume2 size={20} /> : <Music size={20} />}
                  </button>
                  <button onClick={handleReset} className="text-slate-400 hover:text-red-400 p-2">
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>

              {/* Global Stats/Timer Bar */}
              {(solveElapsedTime > 0 || bestSolveTime) && (
                <div className={clsx(
                  "w-full px-8 py-2 border-b flex justify-between items-center text-xs font-bold uppercase tracking-widest transition-colors duration-500",
                  theme === 'galaxy' && "border-white/5 bg-white/5 backdrop-blur-sm text-slate-400",
                  theme === 'minimal' && "border-slate-100 bg-slate-50 text-slate-500",
                  theme === 'dark' && "border-white/5 bg-zinc-800/20 text-zinc-500"
                )}>
                  <div className="flex items-center gap-2">
                    <Timer size={14} className={clsx(solveTimerActive ? "text-blue-400 animate-pulse" : "text-slate-500")} />
                    <span>Time: <span className={clsx("font-mono", theme === 'minimal' ? "text-slate-900" : "text-white")}>{Math.floor(solveElapsedTime / 60)}:{(solveElapsedTime % 60).toString().padStart(2, '0')}</span></span>
                  </div>
                  {bestSolveTime && (
                    <div className="flex items-center gap-2">
                      <Trophy size={14} className="text-yellow-500" />
                      <span>Best: <span className={clsx("font-mono", theme === 'minimal' ? "text-slate-900" : "text-white")}>{Math.floor(bestSolveTime / 60)}:{(bestSolveTime % 60).toString().padStart(2, '0')}</span></span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row flex-1 relative">
                
                {/* Left Panel: Cube Input */}
                {!solution && (
                  <div className="flex-1 p-4 sm:p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 bg-transparent transition-colors duration-500 overflow-y-auto max-h-[70vh] md:max-h-full no-scrollbar">
              {/* 3D Cube */}
              <Cube3D 
                cubeState={cubeState} 
                solution={null}
                currentStep={0}
                handleSquareClick={handleSquareClick}
                lastMoveTime={lastMoveTime}
                currentSkin={currentSkinData}
              />

              <>
                {/* Color Palette */}
                <div className="mb-6 mt-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider text-center">Select Color</h3>
                  <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                    {['U', 'L', 'F', 'R', 'B', 'D', 'empty'].map((c) => (
                      <motion.button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={clsx(
                          'w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 shadow-sm flex items-center justify-center relative overflow-hidden shrink-0',
                          COLOR_MAP[c],
                          selectedColor === c ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-110 border-transparent' : 'border-white/20'
                        )}
                        title={c === 'empty' ? 'Eraser' : COLOR_NAMES[c]}
                      >
                        {c === 'empty' && <div className="absolute inset-0 flex items-center justify-center text-slate-300 bg-white/10"><RotateCcw size={16} /></div>}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-900/40 border-l-4 border-red-500 text-red-100 flex items-start rounded-r-md backdrop-blur-sm">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-left">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSolve}
                  disabled={isSolving}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center text-lg"
                >
                  {isSolving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Solving...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Solve Cube
                    </>
                  )}
                </button>
              </>
            </div>
          )}

          {/* Right Panel: Solution Guide */}
          <div className={clsx("p-4 sm:p-6 md:p-8 flex flex-col transition-colors duration-500", (solution) ? "flex-1 items-center bg-transparent" : "w-full md:w-[450px] lg:w-[500px] bg-transparent")}>
            {!solution ? (
              <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-3xl p-6 mb-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
                  {/* Decorative background flare */}
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                  
                  <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2 drop-shadow-md">
                    <Compass className="w-6 h-6 text-blue-400" />
                    How to hold your cube
                  </h3>
                  
                  <p className="text-sm text-slate-300 mb-6 font-medium leading-relaxed">
                    To solve your cube successfully, you <strong className="text-white bg-white/10 px-1 py-0.5 rounded">MUST</strong> keep it facing the exact same way while painting colors and following the moves:
                  </p>
                  
                  <ul className="space-y-3">
                    <li className="flex items-center gap-4 bg-black/40 p-3.5 rounded-2xl border border-white/5 shadow-inner">
                      <div className="w-8 h-8 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)] shrink-0 border border-slate-200" />
                      <div>
                        <span className="block text-sm font-black text-white tracking-wide uppercase">Top Face</span>
                        <span className="block text-xs text-slate-400 font-medium">White center points to the Ceiling</span>
                      </div>
                    </li>
                    
                    <li className="flex items-center gap-4 bg-black/40 p-3.5 rounded-2xl border border-white/5 shadow-inner">
                      <div className="w-8 h-8 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] shrink-0 border border-green-400" />
                      <div>
                        <span className="block text-sm font-black text-green-400 tracking-wide uppercase">Front Face</span>
                        <span className="block text-xs text-slate-400 font-medium">Green center points directly at You</span>
                      </div>
                    </li>
                    
                    <li className="flex items-center gap-4 bg-black/40 p-3.5 rounded-2xl border border-white/5 shadow-inner">
                      <div className="w-8 h-8 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] shrink-0 border border-red-400" />
                      <div>
                        <span className="block text-sm font-black text-red-400 tracking-wide uppercase">Right Face</span>
                        <span className="block text-xs text-slate-400 font-medium">Red center points to your Right hand</span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center bg-white/5 rounded-3xl border border-white/10 p-6 border-dashed backdrop-blur-sm">
                  <Dices className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium px-4">Input your cube colors manually or use the <strong className="text-white">Scan Cube</strong> camera up top to begin.</p>
                </div>
              </div>
            ) : solution.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-green-400 text-center drop-shadow-sm">
                <CheckCircle2 className="w-16 h-16 mb-4" />
                <h3 className="text-xl font-bold mb-2">Cube is already solved!</h3>
                <p className="text-slate-600 dark:text-slate-400">Great job!</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col w-full max-w-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-100 mb-2 drop-shadow-sm">Interactive Solution Guide</h2>
                  <p className="text-slate-300 drop-shadow-sm">Follow the 3D cube to solve your physical cube.</p>
                </div>

                {/* 3D Cube as the Guide */}
                <div className="bg-transparent p-4 sm:p-6 rounded-2xl shadow-sm border border-white/10 mb-8 transition-colors duration-500">
                  <Cube3D 
                    cubeState={cubeState} 
                    solution={solution}
                    currentStep={currentStep}
                    handleSquareClick={handleSquareClick}
                    lastMoveTime={lastMoveTime}
                    currentSkin={currentSkinData}
                    lowPowerMode={lowPowerMode}
                  />
                  
                  {currentStep < solution.length ? (
                    <div className="text-center mt-4">
                      <span className="inline-block px-4 py-1 bg-blue-900/60 text-blue-300 rounded-full text-sm font-bold mb-3 uppercase tracking-wider backdrop-blur-sm shadow-sm">
                        Step {currentStep + 1} of {solution.length}
                      </span>
                      <div className="text-3xl font-black text-white mb-1 tracking-tighter drop-shadow-md">
                        {solution[currentStep]}
                      </div>
                      <p className="text-slate-300 font-medium drop-shadow-sm">
                        {getMoveDescription(solution[currentStep])}
                      </p>
                      
                      {/* AI Tip Section */}
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <button
                          onClick={getAiTip}
                          disabled={isAiLoading}
                          className="flex items-center gap-2 mx-auto text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors disabled:opacity-50"
                        >
                          {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          Get Logic Hint
                        </button>
                        <AnimatePresence>
                          {aiTip && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 text-[11px] text-slate-400 italic bg-blue-500/5 p-3 rounded-xl border border-blue-500/10"
                            >
                              "{aiTip}"
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center mt-4 text-green-400 drop-shadow-sm">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                      <h3 className="text-xl font-bold">Cube Solved!</h3>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center gap-2 sm:gap-4 max-w-md mx-auto w-full">
                  <button
                    onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                    disabled={currentStep === 0 || isAutoPlaying}
                    className="flex-1 py-3 sm:py-4 px-2 sm:px-4 bg-slate-800/40 border border-slate-500/30 text-slate-200 font-bold rounded-xl hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center text-sm md:text-base"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 mr-1" />
                    Back
                  </button>
                  <button
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    disabled={currentStep === solution.length}
                    className="py-3 sm:py-4 px-6 sm:px-8 bg-blue-900/60 text-blue-300 font-bold rounded-xl hover:bg-blue-800/80 border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center shadow-sm"
                    title={isAutoPlaying ? "Pause Auto-Play" : "Start Auto-Play"}
                  >
                    {isAutoPlaying ? <Pause className="w-6 h-6 sm:w-8 sm:h-8" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8" />}
                  </button>
                  <button
                    onClick={() => setCurrentStep(s => Math.min(solution.length, s + 1))}
                    disabled={currentStep === solution.length || isAutoPlaying}
                    className="flex-1 py-3 sm:py-4 px-2 sm:px-4 bg-blue-600/90 text-white font-bold rounded-xl hover:bg-blue-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center shadow-md hover:shadow-lg text-sm md:text-base"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 ml-1" />
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-8 w-full max-w-md mx-auto bg-slate-800/50 rounded-full h-3 overflow-hidden border border-white/5">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
                    style={{ width: `${(currentStep / solution.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
    
    <AnimatePresence>
      {isScanning && (
        <motion.div 
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[9999] bg-black overflow-hidden"
        >
          <CameraScanner 
            initialState={cubeState}
            onCancel={() => setIsScanning(false)}
            onScanComplete={(newState) => {
              setCubeState(newState);
              setIsScanning(false);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showSettings && (
        <SettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)} 
          theme={theme}
          setTheme={setTheme}
          language={language}
          setLanguage={setLanguage}
          resetOnboarding={() => {
            localStorage.removeItem('onboarding_complete');
            setShowOnboarding(true);
            setShowSettings(false);
          }}
          currentSkinId={currentSkinId}
          unlockedSkins={unlockedSkins}
          coins={coins}
          onSelectSkin={setCurrentSkinId}
          onUnlockSkin={(skin) => {
            if (coins >= skin.cost) {
              setCoins(prev => prev - skin.cost);
              setUnlockedSkins(prev => [...prev, skin.id]);
              setCurrentSkinId(skin.id);
            }
          }}
          currentPersonalityId={currentPersonalityId}
          onSelectPersonality={setCurrentPersonalityId}
          lowPowerMode={lowPowerMode}
          setLowPowerMode={setLowPowerMode}
        />
      )}
    </AnimatePresence>
    </>
  );
}

function SettingsModal({ 
  isOpen, 
  onClose, 
  theme, 
  setTheme,
  language,
  setLanguage,
  resetOnboarding,
  currentSkinId,
  unlockedSkins,
  coins,
  onSelectSkin,
  onUnlockSkin,
  currentPersonalityId,
  onSelectPersonality,
  lowPowerMode,
  setLowPowerMode
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  theme: string, 
  setTheme: (t: any) => void,
  language: string,
  setLanguage: (l: string) => void,
  resetOnboarding: () => void,
  currentSkinId: string,
  unlockedSkins: string[],
  coins: number,
  onSelectSkin: (id: string) => void,
  onUnlockSkin: (skin: Skin) => void,
  currentPersonalityId: string,
  onSelectPersonality: (id: string) => void,
  lowPowerMode: boolean,
  setLowPowerMode: (b: boolean) => void
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] relative no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-indigo-400" />
            Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Language Selection */}
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Language
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { code: 'en', name: 'English' },
                { code: 'es', name: 'Español' },
                { code: 'fr', name: 'Français' },
                { code: 'de', name: 'Deutsch' }
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code);
                    localStorage.setItem('language', l.code);
                  }}
                  className={clsx(
                    "px-4 py-3 rounded-xl border text-xs font-bold transition-all",
                    language === l.code 
                      ? "bg-blue-600/20 border-blue-500 text-white" 
                      : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Visual Theme
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'galaxy', name: 'Galaxy', icon: LayoutTemplate, color: 'bg-indigo-600' },
                { id: 'minimal', name: 'Clean', icon: Sun, color: 'bg-slate-200 text-slate-900' },
                { id: 'dark', name: 'OLED', icon: Moon, color: 'bg-black border border-white/20' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={clsx(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                    theme === t.id 
                      ? "bg-white/10 border-indigo-500 ring-2 ring-indigo-500/50" 
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                  )}
                >
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", t.color)}>
                    <t.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-300">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <SkinsGallery 
            currentSkinId={currentSkinId}
            unlockedSkins={unlockedSkins}
            coins={coins}
            onSelect={onSelectSkin}
            onUnlock={onUnlockSkin}
            onBack={() => {}}
          />

          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Coach Personality
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PERSONALITIES.map((p) => {
                const Icon = (p.icon === 'Brain' ? BookOpen : p.icon === 'Zap' ? Zap : p.icon === 'Shield' ? HelpCircle : Moon) as any;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectPersonality(p.id);
                      localStorage.setItem('current_personality', p.id);
                    }}
                    className={clsx(
                      "p-4 rounded-2xl border text-left transition-all relative overflow-hidden group",
                      currentPersonalityId === p.id 
                        ? "bg-indigo-600/20 border-indigo-500/50" 
                        : "bg-white/5 border-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={clsx(
                        "p-2 rounded-xl",
                        currentPersonalityId === p.id ? "bg-indigo-500 text-white" : "bg-white/5 text-slate-400"
                      )}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white leading-none mb-1">{p.name}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{p.id}</p>
                      </div>
                    </div>
                    {currentPersonalityId === p.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 size={12} className="text-indigo-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               Tutorials & help
            </h3>
            <button
              onClick={() => {
                resetOnboarding();
                onClose();
              }}
              className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Restart Tutorial</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">3 Quick Lessons</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               App Identity
            </h3>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
              <div className="flex items-center justify-between p-2 bg-black/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-blue-400" />
                  <span className="text-xs font-black text-white uppercase tracking-widest">Performance Mode</span>
                </div>
                <button 
                  onClick={() => setLowPowerMode(!lowPowerMode)}
                  className={clsx(
                    "relative w-12 h-6 rounded-full transition-all duration-300",
                    lowPowerMode ? "bg-blue-600" : "bg-slate-700"
                  )}
                >
                  <div className={clsx(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                    lowPowerMode ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <p className="text-[10px] text-slate-500 italic px-2">
                Enable "Low Power" to reduce background stars and animations for a smoother experience on older devices.
              </p>

              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  "Turning Rubik's cubes into solves since 2024."
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">Version 1.0.6</span>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Optimized Engine</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-10 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-colors shadow-lg"
        >
          Close Settings
        </button>
      </motion.div>
    </motion.div>
  );
}

function getMoveDescription(move: string): string {
  const face = move[0];
  const modifier = move[1] || '';
  
  const faceNames: Record<string, string> = {
    U: 'Up (White)',
    D: 'Down (Yellow)',
    R: 'Right (Red)',
    L: 'Left (Orange)',
    F: 'Front (Green)',
    B: 'Back (Blue)'
  };

  const direction = modifier === "'" ? 'counter-clockwise' : modifier === '2' ? '180 degrees (twice)' : 'clockwise';
  
  return `Turn the ${faceNames[face]} face ${direction}.`;
}

function getFaceletIndex(face: string, x: number, y: number, z: number): number {
  if (face === 'U' && y === -1) return 0 + (z + 1) * 3 + (x + 1);
  if (face === 'R' && x === 1) return 9 + (y + 1) * 3 + (1 - z);
  if (face === 'F' && z === 1) return 18 + (y + 1) * 3 + (x + 1);
  if (face === 'D' && y === 1) return 27 + (1 - z) * 3 + (x + 1);
  if (face === 'L' && x === -1) return 36 + (y + 1) * 3 + (z + 1);
  if (face === 'B' && z === -1) return 45 + (y + 1) * 3 + (1 - x);
  return -1;
}

function getMoveTransform(move: string) {
  const face = move[0];
  const modifier = move[1] || '';
  let axis = 'Y', sign = 1, filter = (c: any) => false;
  
  switch(face) {
    case 'U': axis = 'Y'; sign = -1; filter = (c: any) => c.y === -1; break;
    case 'D': axis = 'Y'; sign = 1; filter = (c: any) => c.y === 1; break;
    case 'R': axis = 'X'; sign = 1; filter = (c: any) => c.x === 1; break;
    case 'L': axis = 'X'; sign = -1; filter = (c: any) => c.x === -1; break;
    case 'F': axis = 'Z'; sign = 1; filter = (c: any) => c.z === 1; break;
    case 'B': axis = 'Z'; sign = -1; filter = (c: any) => c.z === -1; break;
  }
  
  let angle = 90;
  let turns = 1;
  if (modifier === "'") {
    angle = -90;
    turns = -1;
  } else if (modifier === '2') {
    angle = 180;
    turns = 2;
  }
  
  return { axis, angle: sign * angle, filter, turns: sign * turns };
}

function rotateCoords(x: number, y: number, z: number, axis: string, turns: number) {
  let nx = x, ny = y, nz = z;
  turns = ((turns % 4) + 4) % 4;
  
  for (let i = 0; i < turns; i++) {
    if (axis === 'X') {
      const ty = ny;
      ny = -nz;
      nz = ty;
    } else if (axis === 'Y') {
      const tx = nx;
      nx = nz;
      nz = -tx;
    } else if (axis === 'Z') {
      const tx = nx;
      nx = -ny;
      ny = tx;
    }
  }
  return { x: nx, y: ny, z: nz };
}

const CUBIE_SIZE = 56;
const SPACING = 2;
const OFFSET = CUBIE_SIZE + SPACING;

function initializeCubies(cubeState: string[]) {
  const data = [];
  for (let x of [-1, 0, 1]) {
    for (let y of [-1, 0, 1]) {
      for (let z of [-1, 0, 1]) {
        const colors: Record<string, string> = {};
        if (y === -1) colors.U = cubeState[getFaceletIndex('U', x, y, z)];
        if (y === 1) colors.D = cubeState[getFaceletIndex('D', x, y, z)];
        if (x === 1) colors.R = cubeState[getFaceletIndex('R', x, y, z)];
        if (x === -1) colors.L = cubeState[getFaceletIndex('L', x, y, z)];
        if (z === 1) colors.F = cubeState[getFaceletIndex('F', x, y, z)];
        if (z === -1) colors.B = cubeState[getFaceletIndex('B', x, y, z)];
        
        data.push({
          id: `${x},${y},${z}`,
          x, y, z,
          transform: `translate3d(${x * OFFSET}px, ${y * OFFSET}px, ${z * OFFSET}px)`,
          colors
        });
      }
    }
  }
  return data;
}

function getCubiesState(cubeState: string[], solution: string[] | null, currentStep: number) {
  let cubies = initializeCubies(cubeState);
  
  if (!solution || solution.length === 0) return cubies;
  
  const moveTransforms = solution.map(move => getMoveTransform(move));
  
  cubies = cubies.map(cubie => {
    let currentX = cubie.x;
    let currentY = cubie.y;
    let currentZ = cubie.z;
    
    const angles = moveTransforms.map((transform, index) => {
      let angle = 0;
      if (transform.filter({ x: currentX, y: currentY, z: currentZ })) {
        if (index < currentStep) {
          angle = transform.angle;
        }
        const newCoords = rotateCoords(currentX, currentY, currentZ, transform.axis, transform.turns);
        currentX = newCoords.x;
        currentY = newCoords.y;
        currentZ = newCoords.z;
      }
      return { axis: transform.axis, angle };
    });
    
    let transformStr = '';
    for (let i = angles.length - 1; i >= 0; i--) {
      transformStr += `rotate${angles[i].axis}(${angles[i].angle}deg) `;
    }
    transformStr += cubie.transform;
    
    return {
      ...cubie,
      transform: transformStr
    };
  });
  
  return cubies;
}

interface Cube3DProps {
  cubeState: string[];
  solution: string[] | null;
  currentStep: number;
  handleSquareClick: (index: number) => void;
  lastMoveTime?: number;
  isDashboard?: boolean;
  currentSkin?: Skin;
  lowPowerMode?: boolean;
}

function Cube3D({ cubeState, solution, currentStep, handleSquareClick, lastMoveTime, isDashboard, currentSkin, lowPowerMode }: Cube3DProps) {
  const [rotation, setRotation] = useState({ x: -30, y: -45 });
  const dragInfo = React.useRef({ startX: 0, startY: 0, currentX: -30, currentY: -45, isDragging: false, dragDistance: 0 });

  const [impact, setImpact] = useState({ x: 0, y: 0 });
  const cubeWrapperRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(rotation);
  const impactRef = useRef(impact);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    impactRef.current = impact;
  }, [impact]);

  useEffect(() => {
    let frameId: number;
    const startTime = Date.now();
    
    // Internal values for smooth continuous rotation
    let internalRotationY = rotationRef.current.y;
    
    const animate = () => {
      const time = (Date.now() - startTime) / 1000;
      
      if (isDashboard && !dragInfo.current.isDragging) {
        internalRotationY += 0.3;
      } else if (dragInfo.current.isDragging) {
        // Sync internal value with state if user is dragging
        internalRotationY = rotationRef.current.y;
      }

      let sX = 0;
      let sY = 0;

      if (!dragInfo.current.isDragging) {
        sX = Math.sin(time * 0.5) * 2;
        sY = Math.cos(time * 0.7) * 2;
      }
      
      if (cubeWrapperRef.current) {
        const currentRotY = isDashboard && !dragInfo.current.isDragging ? internalRotationY : rotationRef.current.y;
        cubeWrapperRef.current.style.transform = `rotateX(${rotationRef.current.x + impactRef.current.x + sX}deg) rotateY(${currentRotY + impactRef.current.y + sY}deg) translateZ(0)`;
      }
      if (auraRef.current) {
        if (lowPowerMode) {
          auraRef.current.style.transform = 'translate3d(-50%, -50%, 0) scale(1)';
        } else {
          auraRef.current.style.transform = `translate3d(-50%, -50%, 0) scale(${1 + Math.sin((rotationRef.current.x + internalRotationY) * 0.05) * 0.2})`;
        }
      }

      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isDashboard]);

  useEffect(() => {
    if (lastMoveTime) {
      // Subtle camera "kick" on move
      const intensity = 8;
      setImpact({ 
        x: (Math.random() - 0.5) * intensity, 
        y: (Math.random() - 0.5) * intensity 
      });
      const timer = setTimeout(() => setImpact({ x: 0, y: 0 }), 300);
      return () => clearTimeout(timer);
    }
  }, [lastMoveTime]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // We don't use setPointerCapture here to allow child onClick events to fire correctly
    dragInfo.current.isDragging = true;
    dragInfo.current.startX = e.clientX;
    dragInfo.current.startY = e.clientY;
    dragInfo.current.currentX = rotation.x;
    dragInfo.current.currentY = rotation.y;
    dragInfo.current.dragDistance = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo.current.isDragging) return;
    const deltaX = e.clientX - dragInfo.current.startX;
    const deltaY = e.clientY - dragInfo.current.startY;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    dragInfo.current.dragDistance = dist;
    
    // Only capture pointer if we've actually started dragging significantly
    if (dist > 5 && !e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    setRotation({
      x: dragInfo.current.currentX - deltaY * 0.5,
      y: dragInfo.current.currentY + deltaX * 0.5
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragInfo.current.isDragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const cubies = React.useMemo(() => getCubiesState(cubeState, solution, currentStep), [cubeState, solution, currentStep]);

  const snapToView = (x: number, y: number) => {
    setRotation({ x, y });
    dragInfo.current.currentX = x;
    dragInfo.current.currentY = y;
  };

  const rotateView = (dx: number, dy: number) => {
    setRotation(prev => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;
      dragInfo.current.currentX = newX;
      dragInfo.current.currentY = newY;
      return { x: newX, y: newY };
    });
  };

  return (
    <div className={clsx("flex flex-col items-center w-full", !isDashboard && "mb-8")}>
      {!isDashboard && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-sm font-medium text-blue-300 animate-pulse drop-shadow-md">Drag to rotate or use controls</p>
          
          {/* View Controls */}
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            <div className="flex bg-black/40 rounded-lg shadow-sm border border-white/10 p-1">
              <button onClick={() => snapToView(0, 0)} className="px-2 py-1 text-xs text-white font-bold hover:bg-white/10 rounded transition-colors">Front</button>
              <button onClick={() => snapToView(-90, 0)} className="px-2 py-1 text-xs text-white font-bold hover:bg-white/10 rounded transition-colors">Top</button>
              <button onClick={() => snapToView(0, -90)} className="px-2 py-1 text-xs text-white font-bold hover:bg-white/10 rounded transition-colors">Right</button>
              <button onClick={() => snapToView(-30, -45)} className="px-2 py-1 text-xs text-white font-bold hover:bg-white/10 rounded transition-colors">ISO</button>
            </div>
            
            <div className="flex bg-black/40 rounded-lg shadow-sm border border-white/10 p-1 gap-1 text-white">
              <button onClick={() => rotateView(90, 0)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Rotate View Up"><ChevronRight className="w-4 h-4 -rotate-90" /></button>
              <button onClick={() => rotateView(-90, 0)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Rotate View Down"><ChevronRight className="w-4 h-4 rotate-90" /></button>
              <button onClick={() => rotateView(0, 90)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Rotate View Left"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => rotateView(0, -90)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Rotate View Right"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      <div 
        className={clsx(
          "relative w-full flex items-center justify-center touch-none overflow-hidden",
          isDashboard ? "h-48 sm:h-56" : "h-64 sm:h-80 md:h-96 cursor-grab active:cursor-grabbing"
        )}
        style={{ perspective: '1200px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Dynamic Aura background */}
        <div 
          ref={auraRef}
          className="absolute top-1/2 left-1/2 w-64 h-64 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(59,130,246,0.15) 40%, rgba(0,0,0,0) 70%)',
            willChange: 'transform'
          }}
        />
        
        <div 
          className="relative w-0 h-0"
          style={{ 
            transformStyle: 'preserve-3d', 
          }}
        >
          <div
            ref={cubeWrapperRef}
            className="relative w-0 h-0 scale-95 sm:scale-110 md:scale-125 lg:scale-150"
            style={{
               transformStyle: 'preserve-3d',
            }}
          >
            {cubies.map(cubie => (
              <div
                key={cubie.id}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: CUBIE_SIZE,
                  height: CUBIE_SIZE,
                  marginLeft: -CUBIE_SIZE / 2,
                  marginTop: -CUBIE_SIZE / 2,
                  transform: cubie.transform,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 1.8s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {['U', 'D', 'L', 'R', 'F', 'B'].map(face => {
                  if (!cubie.colors[face]) return null;
                  
                  let faceTransform = '';
                  switch(face) {
                    case 'U': faceTransform = `rotateX(90deg) translateZ(${CUBIE_SIZE/2}px)`; break;
                    case 'D': faceTransform = `rotateX(-90deg) translateZ(${CUBIE_SIZE/2}px)`; break;
                    case 'R': faceTransform = `rotateY(90deg) translateZ(${CUBIE_SIZE/2}px)`; break;
                    case 'L': faceTransform = `rotateY(-90deg) translateZ(${CUBIE_SIZE/2}px)`; break;
                    case 'F': faceTransform = `rotateY(0deg) translateZ(${CUBIE_SIZE/2}px)`; break;
                    case 'B': faceTransform = `rotateY(180deg) translateZ(${CUBIE_SIZE/2}px)`; break;
                  }
                  
                  const color = cubie.colors[face];
                  const isCenter = cubie.id.split(',').filter(v => v === '0').length === 2;
                  
                  const originalX = parseInt(cubie.id.split(',')[0]);
                  const originalY = parseInt(cubie.id.split(',')[1]);
                  const originalZ = parseInt(cubie.id.split(',')[2]);
                  const index = getFaceletIndex(face, originalX, originalY, originalZ);

                  return (
                    <div
                      key={face}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Increase threshold slightly for better touch support
                        if (dragInfo.current.dragDistance < 15) {
                          handleSquareClick(index);
                        }
                      }}
                      className={clsx(
                        "absolute top-0 left-0 w-full h-full rounded-[4px] transition-opacity duration-200",
                        isCenter ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-90 active:scale-95'
                      )}
                      style={{ 
                        transform: faceTransform, 
                        backfaceVisibility: 'hidden',
                        backgroundColor: getHexColor(color, currentSkin),
                        // Premium stickerless plastic look: strong inner shade for rounded edge, specular highlight
                        backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 45%), linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.15) 100%)',
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.8), inset 0 0 4px 1px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.5), 0 0 1.5px rgba(0,0,0,0.9)'
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
