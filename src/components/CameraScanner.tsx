import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface CameraScannerProps {
  onScanComplete: (scannedState: string[]) => void;
  onCancel: () => void;
  initialState: string[];
}

const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
const FACE_NAMES: Record<string, string> = {
  U: 'Top (White Center)',
  R: 'Right (Red Center)',
  F: 'Front (Green Center)',
  D: 'Bottom (Yellow Center)',
  L: 'Left (Orange Center)',
  B: 'Back (Blue Center)'
};

// Based on standard RGB values used in the app, but optimized for camera capture
const CANONICAL_COLORS: Record<string, [number, number, number]> = {
  'U': [255, 255, 255], // White
  'R': [200, 30, 30],  // Red
  'F': [30, 160, 60],  // Green
  'D': [240, 220, 40], // Yellow
  'L': [240, 110, 20], // Orange
  'B': [30, 80, 200]   // Blue
};

function classifyColor(r: number, g: number, b: number): string {
  let minDistance = Infinity;
  let bestFace = 'empty';
  
  // Use HSL for better distinction in different lighting
  let r_norm = r / 255;
  let g_norm = g / 255;
  let b_norm = b / 255;
  let max = Math.max(r_norm, g_norm, b_norm), min = Math.min(r_norm, g_norm, b_norm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r_norm: h = (g_norm - b_norm) / d + (g_norm < b_norm ? 6 : 0); break;
      case g_norm: h = (b_norm - r_norm) / d + 2; break;
      case b_norm: h = (r_norm - g_norm) / d + 4; break;
    }
    h /= 6;
  }
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  // High lightness or very low saturation is usually White
  if (l > 75 || (s < 20 && l > 50)) return 'U';
  
  // Check against hue thresholds
  if (h >= 45 && h <= 80) return 'D'; // Yellow
  if (h >= 10 && h <= 44) return 'L'; // Orange
  if (h >= 340 || h <= 10) return 'R'; // Red
  if (h >= 80 && h <= 165) return 'F'; // Green
  if (h >= 165 && h <= 260) return 'B'; // Blue
  
  // Fallback to nearest neighbor if Hue is ambiguous
  for (const [face, [cr, cg, cb]] of Object.entries(CANONICAL_COLORS)) {
    // Weighted Euclidean distance
    const dist = Math.sqrt(
      (r - cr) * (r - cr) * 0.3 + 
      (g - cg) * (g - cg) * 0.59 + 
      (b - cb) * (b - cb) * 0.11
    );
    if (dist < minDistance) {
      minDistance = dist;
      bestFace = face;
    }
  }
  return bestFace;
}

const COLOR_BG: Record<string, string> = {
  U: 'bg-white',
  R: 'bg-red-600',
  F: 'bg-green-600',
  D: 'bg-yellow-400',
  L: 'bg-orange-500',
  B: 'bg-blue-600',
  empty: 'bg-slate-300'
};

export default function CameraScanner({ onScanComplete, onCancel, initialState }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  
  // Store the full cube state that we are building
  const [scannedState, setScannedState] = useState<string[]>([...initialState]);
  // Live preview of the 9 colors on the currently viewed face
  const [liveColors, setLiveColors] = useState<string[]>(Array(9).fill('empty'));
  const [stableProgress, setStableProgress] = useState(0);
  
  const [scanPhase, setScanPhase] = useState<'scanning' | 'review'>('scanning');
  const [isAutoCapture, setIsAutoCapture] = useState(false); // Defaulting to false for more manual control
  
  const autoCaptureRef = useRef({ lastColors: '', count: 0, faceIndex: 0 });
  const currentFace = FACES[currentFaceIndex];

  // Audio for capture
  const playCaptureSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
  };

  // Initialize camera
  useEffect(() => {
    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Your browser does not support accessing the camera, or you are not in a secure context (HTTPS).');
        }

        let mediaStream: MediaStream;
        try {
          // Attempt to get the rear/environment camera first
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } }
          });
        } catch (err: any) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
            throw err; // Do not fallback if it's explicitly a permission error
          }
          console.warn("Could not get environment camera, falling back to default.", err);
          // Fallback to any available camera (often fixes issues on laptops/desktops without 'environment' cameras)
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
          setError('Permission Denied: Your browser blocked access to the camera.');
          console.warn('Camera permission denied by user or browser.');
        } else {
          setError(`Camera access error: ${err.message || 'Denied or unavailable'}.`);
          console.error('Camera initialization error:', err);
        }
      }
    }
    
    initCamera();
    
    return () => {
      setStream(prevStream => {
        if (prevStream) {
          prevStream.getTracks().forEach(track => track.stop());
        }
        return null;
      });
    };
  }, []);

  // Set up the sampling loop
  useEffect(() => {
    let animationFrameId: number;
    let lastSampleTime = 0;

    const sampleColors = (timestamp: number) => {
      if (scanPhase === 'review') {
        // Just loop and wait, don't overwrite user's manual edits
        animationFrameId = requestAnimationFrame(sampleColors);
        return;
      }

      if (timestamp - lastSampleTime > 150) { // Sample every 150ms
        if (videoRef.current && canvasRef.current && stream && !error) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
            // Match canvas size to video size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw current frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Calculate grid bounds (assume a square grid in the center of the video)
            const minDim = Math.min(canvas.width, canvas.height);
            const gridWidth = minDim * 0.7; // Grid takes up 70% of the smallest dimension
            const startX = (canvas.width - gridWidth) / 2;
            const startY = (canvas.height - gridWidth) / 2;
            const cellSize = gridWidth / 3;
            
            const newColors = [];
            
            for (let i = 0; i < 9; i++) {
              if (i === 4) {
                // Center is always fixed for standard cubes based on face
                newColors.push(currentFace);
                continue;
              }
              
              const row = Math.floor(i / 3);
              const col = i % 3;
              
              // Sample from the center of each cell
              const sampleX = startX + (col * cellSize) + (cellSize / 2);
              const sampleY = startY + (row * cellSize) + (cellSize / 2);
              
              // Average a small 10x10 area to reduce noise
              const areaSize = 10;
              let rTotal = 0, gTotal = 0, bTotal = 0;
              const imgData = ctx.getImageData(sampleX - areaSize/2, sampleY - areaSize/2, areaSize, areaSize).data;
              
              for (let j = 0; j < imgData.length; j += 4) {
                rTotal += imgData[j];
                gTotal += imgData[j+1];
                bTotal += imgData[j+2];
              }
              
              const pixelCount = imgData.length / 4;
              const r = Math.round(rTotal / pixelCount);
              const g = Math.round(gTotal / pixelCount);
              const b = Math.round(bTotal / pixelCount);
              
              newColors.push(classifyColor(r, g, b));
            }
            
            setLiveColors(newColors);
            
            // Auto Capture logic
            if (isAutoCapture) {
              const colorsString = newColors.join(',');
              if (!newColors.includes('empty')) {
                // Same colors, same face
                if (colorsString === autoCaptureRef.current.lastColors && autoCaptureRef.current.faceIndex === currentFaceIndex) {
                  autoCaptureRef.current.count += 1;
                  // Update progress smoothly (target is 10 frames = ~1.5s)
                  setStableProgress(Math.min(100, (autoCaptureRef.current.count / 8) * 100));
                  
                  if (autoCaptureRef.current.count >= 8) {
                    // Capture triggered!
                    playCaptureSound();
                    autoCaptureRef.current.count = 0;
                    setStableProgress(0);
                    
                    if (videoRef.current) videoRef.current.pause();
                    setScanPhase('review');
                  }
                } else {
                  autoCaptureRef.current.lastColors = colorsString;
                  autoCaptureRef.current.count = 0;
                  autoCaptureRef.current.faceIndex = currentFaceIndex;
                  setStableProgress(0);
                }
              } else {
                autoCaptureRef.current.count = 0;
                setStableProgress(0);
              }
            } else {
              autoCaptureRef.current.count = 0;
              setStableProgress(0);
            }

            lastSampleTime = timestamp;
          }
        }
      }
      animationFrameId = requestAnimationFrame(sampleColors);
    };

    animationFrameId = requestAnimationFrame(sampleColors);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stream, error, currentFace, scanPhase, isAutoCapture]);

  const handleCapture = () => {
    playCaptureSound();
    if (videoRef.current) videoRef.current.pause();
    setScanPhase('review');
  };

  const handleRetake = () => {
    if (videoRef.current) videoRef.current.play();
    setScanPhase('scanning');
    setLiveColors(Array(9).fill('empty')); // Clear it out so it re-reads
    autoCaptureRef.current.count = 0;
    setStableProgress(0);
  };

  const handleConfirm = () => {
    const newState = [...scannedState];
    const startIndex = currentFaceIndex * 9;
    
    // Apply live colors (even if manually tweaked) to the scanned state
    for (let i = 0; i < 9; i++) {
      newState[startIndex + i] = liveColors[i];
    }
    
    setScannedState(newState);
    
    if (currentFaceIndex < 5) {
      setCurrentFaceIndex(prev => {
        autoCaptureRef.current.faceIndex = prev + 1;
        return prev + 1;
      });
      if (videoRef.current) videoRef.current.play();
      setScanPhase('scanning');
      setLiveColors(Array(9).fill('empty'));
      autoCaptureRef.current.count = 0;
      setStableProgress(0);
    } else {
      // Done scanning all 6 faces
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      onScanComplete(newState);
    }
  };

  const handleManualColorCycle = (index: number) => {
    if (index === 4) return; // Center is fixed
    if (scanPhase !== 'review') return; // Only allow editing during the review pause
    
    setLiveColors(prev => {
      const current = prev[index];
      const order = ['U', 'R', 'F', 'D', 'L', 'B'];
      const nextIndex = (order.indexOf(current) + 1) % order.length;
      const newColors = [...prev];
      newColors[index] = order[nextIndex];
      return newColors;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between">
      {/* Header */}
      <div className="w-full p-4 flex justify-between items-center text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 z-10">
        <div>
          <h2 className="text-xl font-bold mb-1">Scan Face {currentFaceIndex + 1} of 6</h2>
          <p className="text-blue-300 font-medium">Show {FACE_NAMES[currentFace]}</p>
        </div>
        <button 
          onClick={() => {
            if (stream) stream.getTracks().forEach(track => track.stop());
            onCancel();
          }}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Camera Area */}
      <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="p-6 bg-red-900/50 text-red-200 border border-red-500 rounded-xl max-w-md text-center m-4">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-bold text-white mb-2">Camera Unavailable</h3>
            <p className="font-medium text-sm mb-4">{error}</p>
            <div className="text-xs text-red-300 text-left bg-red-950/50 p-4 rounded-lg space-y-2">
              <p><strong>Troubleshooting:</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Make sure you allowed camera permissions when prompted.</li>
                <li>Check your browser's site settings (usually a lock icon in the URL bar) and ensure Camera is set to "Allow".</li>
                <li>If you are in an embedded view, click the button below to open in a new tab.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 mt-6">
              {window.self !== window.top && (
                <button 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors shadow-lg"
                >
                  Open in New Tab (Recommended)
                </button>
              )}
              <button 
                onClick={onCancel}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-[500px] aspect-square bg-slate-900 mx-auto rounded-3xl overflow-hidden shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Grid Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[70%] aspect-square grid grid-cols-3 grid-rows-3 gap-1 p-1 bg-black/40 rounded-xl backdrop-blur-sm">
                {liveColors.map((color, i) => (
                  <div 
                    key={i} 
                    className={clsx(
                      "w-full h-full rounded-md border-2 pointer-events-auto transition-colors duration-200",
                      i === 4 ? "border-white/80" : "border-white/30 cursor-pointer active:scale-95 hover:border-white/60",
                      COLOR_BG[color]
                    )}
                    onClick={() => handleManualColorCycle(i)}
                  >
                    {i === 4 && (
                      <div className="w-full h-full flex items-center justify-center opacity-80 mix-blend-difference text-white">
                        <Check className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Guide overlay texts */}
            {scanPhase === 'scanning' ? (
              <>
                {isAutoCapture && (
                  <div className="absolute top-6 left-0 right-0 text-center font-bold px-4">
                    <span className="bg-black/60 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg">
                      Hold still to auto-capture...
                    </span>
                  </div>
                )}
                <div className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm font-medium px-4">
                  Align cube face with the grid.
                </div>
              </>
            ) : (
              <div className="absolute top-6 left-0 right-0 text-center font-bold px-4">
                <span className="bg-blue-600/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg">
                  Review: Tap squares to fix colors
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="w-full p-8 pb-12 flex flex-col items-center gap-4 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="text-center mb-2">
          {currentFaceIndex === 0 && <p className="text-blue-300 font-bold mb-1">Look at the U (White) Face.</p>}
          {currentFaceIndex === 1 && <p className="text-orange-300 font-bold mb-1">Rotate cube RIGHT to show R (Red) Face.</p>}
          {currentFaceIndex === 2 && <p className="text-green-300 font-bold mb-1">Rotate cube LEFT to show F (Green) Face.</p>}
          {currentFaceIndex === 3 && <p className="text-yellow-300 font-bold mb-1">Rotate cube DOWN to show D (Yellow) Face.</p>}
          {currentFaceIndex === 4 && <p className="text-red-300 font-bold mb-1">Rotate cube RIGHT to show L (Orange) Face.</p>}
          {currentFaceIndex === 5 && <p className="text-blue-500 font-bold mb-1">Rotate cube RIGHT to show B (Blue) Face.</p>}
        </div>

        {scanPhase === 'review' ? (
          <div className="flex gap-4 w-full max-w-sm">
            <button
              onClick={handleRetake}
              className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl transition-colors"
            >
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> Confirm
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <button
              disabled={!!error}
              onClick={handleCapture}
              className="relative w-20 h-20 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              title="Manual Capture"
            >
              {/* Progress Ring for Auto Capture */}
              {isAutoCapture && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.5)" // blue-500 with opacity
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="#3b82f6" // blue-500
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="289"
                    strokeDashoffset={289 - (289 * stableProgress) / 100}
                    className="transition-all duration-150"
                  />
                </svg>
              )}
              <Camera className="w-8 h-8 text-slate-800" />
            </button>

            <label className="flex items-center cursor-pointer bg-white/10 px-4 py-2 rounded-full">
              <span className="mr-3 text-white text-sm font-medium">Auto-Capture</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={isAutoCapture} 
                  onChange={() => setIsAutoCapture(!isAutoCapture)} 
                />
                <div className={clsx("block w-10 h-6 rounded-full transition-colors", isAutoCapture ? "bg-blue-500" : "bg-slate-600")}></div>
                <div className={clsx("dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", isAutoCapture && "transform translate-x-4")}></div>
              </div>
            </label>
          </div>
        )}
        
        <div className="flex gap-2">
          {FACES.map((f, i) => (
            <div 
              key={f}
              className={clsx(
                "w-3 h-3 rounded-full transition-colors",
                i < currentFaceIndex ? "bg-green-500" : i === currentFaceIndex ? "bg-white" : "bg-white/30"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
