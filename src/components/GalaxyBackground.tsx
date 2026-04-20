import React, { useEffect, useState, memo } from 'react';
import clsx from 'clsx';

const GalaxyBackground = memo(function GalaxyBackground() {
  const [stars, setStars] = useState<{x: number, y: number, r: number, delay: string, duration: string}[]>([]);
  const [shootingStars, setShootingStars] = useState<{id: number, top: string, left: string, delay: string}[]>([]);
  const [isLowPower, setIsLowPower] = useState(() => localStorage.getItem('low_power_mode') === 'true');

  useEffect(() => {
    // significantly fewer stars for performance
    const count = isLowPower ? 30 : 60;
    const generatedStars = Array.from({ length: count }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: Math.random() * 1.5 + 0.5,
      delay: `${Math.random() * 3}s`,
      duration: `${Math.random() * 4 + 2}s`
    }));
    setStars(generatedStars);

    if (!isLowPower) {
      const generatedShootingStars = Array.from({ length: 3 }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 50 - 20}vh`,
        left: `${Math.random() * 100 + 50}vw`,
        delay: `${Math.random() * 15}s`,
      }));
      setShootingStars(generatedShootingStars);
    } else {
      setShootingStars([]);
    }
  }, [isLowPower]);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-gradient-to-b from-[#0f111a] via-[#090a0f] to-[#04040a]">
      {/* Performance optimized background blobs */}
      <div className="absolute inset-0 opacity-40">
         <div 
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] pointer-events-none blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0) 70%)' }}>
        </div>
        <div 
          className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] pointer-events-none blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(79,70,229,0) 70%)' }}>
        </div>
      </div>

      {stars.map((s, i) => (
        <div 
          key={i} 
          className={clsx("absolute rounded-full bg-white", !isLowPower && "star-twinkle")} 
          style={{ 
            top: `${s.y}%`, 
            left: `${s.x}%`, 
            width: `${s.r}px`, 
            height: `${s.r}px`, 
            opacity: 0.6,
            animationDelay: s.delay,
            animationDuration: s.duration,
            willChange: isLowPower ? 'auto' : 'opacity'
          }} 
        />
      ))}

      {shootingStars.map((ss) => (
        <div
          key={ss.id}
          className="shooting-star absolute h-[2px] w-[100px] bg-gradient-to-r from-transparent via-blue-200 to-white opacity-50"
          style={{
            top: ss.top,
            left: ss.left,
            animationDelay: ss.delay,
            willChange: 'transform'
          }}
        />
      ))}
    </div>
  );
});

export default GalaxyBackground;
