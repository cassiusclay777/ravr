import React from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiVolume2 } from 'react-icons/fi';
import { useAudioEngine } from '../hooks/useAudioEngine';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

export const CompactPlayer: React.FC = () => {
  const { isPlaying, currentTime, duration, volume, setVolume, toggle } = useAudioEngine();

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg">🎵</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">Demo – Kalimba</div>
              <div className="text-xs text-white/60">Public Domain</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all flex items-center justify-center"
              aria-label="Previous"
            >
              <FiSkipBack size={14} />
            </button>
            
            <button
              onClick={toggle}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center justify-center"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} className="ml-0.5" />}
            </button>

            <button
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all flex items-center justify-center"
              aria-label="Next"
            >
              <FiSkipForward size={14} />
            </button>
          </div>

          {/* Progress */}
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md">
            <span className="text-xs text-white/60 font-mono w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-white/60 font-mono w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* Volume */}
          <div className="hidden lg:flex items-center gap-2 w-32">
            <FiVolume2 className="text-white/60 text-sm flex-shrink-0" size={16} />
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(value) => setVolume(Array.isArray(value) ? value[0] : value)}
              styles={{
                track: { backgroundColor: 'rgb(34 197 94)', height: 3 },
                handle: { 
                  borderColor: 'rgb(34 197 94)', 
                  backgroundColor: '#ffffff',
                  width: 12,
                  height: 12,
                  marginTop: -4.5,
                  opacity: 1,
                },
                rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 3 },
              }}
            />
          </div>

          {/* Status Badges */}
          <div className="hidden xl:flex items-center gap-2">
            <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              EQ
            </div>
            <div className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-semibold">
              HI-FI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const shouldShowCompactPlayer = (pathname: string): boolean => {
  return pathname === '/dsp' || pathname === '/settings' || pathname === '/tracks';
};
