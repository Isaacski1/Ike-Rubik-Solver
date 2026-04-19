import React, { useEffect, useState, memo } from 'react';

const GalaxyBackground = memo(function GalaxyBackground() {
  const [stars, setStars] = useState<{x: number, y: number, r: number, delay: string, duration: string}[]>([]);
  const [shootingStars, setShootingStars] = useState<{id: number, top: string, left: string, delay: string}[]>([]);

  useEffect(() => {
    // Generate static twinkling stars
    const generatedStars = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: Math.random() * 1.5 + 0.5,
      delay: `${Math.random() * 3}s`,
      duration: `${Math.random() * 4 + 2}s`
    }));
    setStars(generatedStars);

    // Generate shooting stars
    const generatedShootingStars = Array.from({ length: 7 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 50 - 20}vh`, // Start in the top half
      left: `${Math.random() * 100 + 50}vw`, // Start in the right half (even offscreen)
      delay: `${Math.random() * 15}s`,
    }));
    setShootingStars(generatedShootingStars);
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-gradient-to-b from-[#0f111a] via-[#090a0f] to-[#04040a]">
      {/* Static rendering of small stars */}
      {stars.map((s, i) => (
        <div 
          key={i} 
          className="absolute rounded-full bg-white star-twinkle" 
          style={{ 
            top: `${s.y}%`, 
            left: `${s.x}%`, 
            width: `${s.r}px`, 
            height: `${s.r}px`, 
            boxShadow: `0 0 ${s.r*3}px #fff`,
            animationDelay: s.delay,
            animationDuration: s.duration
          }} 
        />
      ))}

      {/* Shooting stars */}
      {shootingStars.map((ss) => (
        <div
          key={ss.id}
          className="shooting-star absolute h-[2px] w-[150px] bg-gradient-to-r from-transparent via-blue-200 to-white"
          style={{
            top: ss.top,
            left: ss.left,
            animationDelay: ss.delay,
          }}
        >
          {/* Glowing head of shooting star */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[3px] bg-white rounded-full shadow-[0_0_15px_3px_#fff]"></div>
        </div>
      ))}
      
      {/* Nebulas/Glowing blobs */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0) 70%)' }}>
      </div>
      <div 
        className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, rgba(79,70,229,0) 70%)' }}>
      </div>
      <div 
        className="absolute top-[40%] left-[30%] w-[30%] h-[30%] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.1) 0%, rgba(147,51,234,0) 70%)' }}>
      </div>
    </div>
  );
});

export default GalaxyBackground;
