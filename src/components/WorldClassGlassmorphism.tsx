import React from 'react';

export const WorldClassGlassmorphism: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative">
      {/* Ultra-Modern Glassmorphism Container */}
      <div className="relative rounded-[2rem] backdrop-blur-[40px] bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.02] border border-white/[0.25] shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden">
        
        {/* Floating Gradient Orbs Inside */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/30 to-blue-500/30 blur-[60px] animate-pulse"></div>
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-[60px] animate-bounce"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-r from-green-400/20 to-cyan-400/20 blur-[50px] animate-ping"></div>
        </div>

        {/* Inner Glass Layer */}
        <div className="relative z-10 p-1 rounded-[1.8rem] backdrop-blur-sm bg-gradient-to-br from-white/[0.05] to-transparent">
          
          {/* Premium Border Highlight */}
          <div className="absolute inset-0 rounded-[1.8rem] bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20 animate-pulse" style={{
            background: 'linear-gradient(45deg, rgba(34,211,238,0.2) 0%, rgba(147,51,234,0.2) 25%, rgba(236,72,153,0.2) 50%, rgba(34,197,94,0.2) 75%, rgba(34,211,238,0.2) 100%)',
            backgroundSize: '400% 400%',
            animation: 'gradient 8s ease infinite'
          }}></div>
          
          {/* Content Container */}
          <div className="relative z-20 rounded-[1.7rem] backdrop-blur-[20px] bg-black/20 p-8">
            {children}
          </div>
        </div>

        {/* Floating Light Reflections */}
        <div className="absolute top-4 left-4 w-32 h-0.5 bg-gradient-to-r from-white/60 via-white/20 to-transparent rounded-full"></div>
        <div className="absolute top-6 left-6 w-24 h-0.5 bg-gradient-to-r from-cyan-400/40 via-blue-500/20 to-transparent rounded-full"></div>
      </div>

      {/* External Glow Effect */}
      <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-cyan-400/10 via-purple-500/10 to-pink-500/10 blur-xl scale-105 animate-pulse"></div>
    </div>
  );
};

// Global CSS pro animace (přidej do App.css)
export const glassmorphismStyles = `
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.glass-card {
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(255,255,255,0.25);
  box-shadow: 
    0 32px 64px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.3),
    0 0 80px rgba(34,211,238,0.1);
}

.glass-card:hover {
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 100%);
  box-shadow: 
    0 40px 80px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.4),
    0 0 120px rgba(34,211,238,0.2);
  transform: translateY(-2px);
}

.world-class-blur {
  backdrop-filter: blur(60px) saturate(180%) brightness(110%);
  -webkit-backdrop-filter: blur(60px) saturate(180%) brightness(110%);
}
`;
