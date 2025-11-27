import React, { useState, useEffect } from 'react';
import { useAndroidGestures } from '@/hooks/useAndroidGestures';
import { useMobileDetection } from './MobileOptimizations';

interface AndroidPlayerProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
  trackTitle?: string;
  trackArtist?: string;
  albumArt?: string;
}

export const AndroidPlayer: React.FC<AndroidPlayerProps> = ({
  isPlaying,
  onPlayPause,
  onStop,
  onNext,
  onPrevious,
  volume,
  onVolumeChange,
  currentTime = 0,
  duration = 0,
  onSeek,
  trackTitle = 'No Track',
  trackArtist = 'Unknown Artist',
  albumArt,
}) => {
  const { isAndroid, isMobile } = useMobileDetection();
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  // Android gestures for the player
  useAndroidGestures({
    onSwipeLeft: () => onNext?.(),
    onSwipeRight: () => onPrevious?.(),
    onSwipeUp: () => setShowVolumeControl(true),
    onSwipeDown: () => setShowVolumeControl(false),
    onDoubleTap: () => onPlayPause(),
    onLongPress: () => onStop(),
  });

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isAndroid && !isMobile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-gray-900 to-transparent backdrop-blur-xl border-t border-white/10 pb-safe">
      {/* Album Art & Track Info */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-4">
          {/* Album Art */}
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-cyan-600 flex-shrink-0 shadow-lg">
            {albumArt ? (
              <img src={albumArt} alt="Album" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                🎵
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg truncate">{trackTitle}</h3>
            <p className="text-white/60 text-sm truncate">{trackArtist}</p>
          </div>

          {/* Stop Button */}
          <button
            onClick={onStop}
            className="w-12 h-12 bg-red-600/20 hover:bg-red-600/30 rounded-full flex items-center justify-center transition-all active:scale-95 touch-manipulation"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <span className="text-2xl">⏹️</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-2">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="w-12 text-right">{formatTime(currentTime)}</span>
          <div
            className="flex-1 h-10 flex items-center touch-manipulation"
            onTouchStart={() => setIsDraggingProgress(true)}
            onTouchEnd={() => setIsDraggingProgress(false)}
          >
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek?.(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #06b6d4 ${progress}%, rgba(255,255,255,0.1) ${progress}%)`,
                minHeight: '40px', // Large touch target
              }}
            />
          </div>
          <span className="w-12">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-center gap-4">
          {/* Previous Button */}
          <button
            onClick={onPrevious}
            disabled={!onPrevious}
            className="w-16 h-16 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-full flex items-center justify-center transition-all active:scale-95 touch-manipulation shadow-lg"
            style={{ minWidth: '64px', minHeight: '64px' }}
          >
            <span className="text-3xl">⏮️</span>
          </button>

          {/* Play/Pause Button - Extra Large */}
          <button
            onClick={onPlayPause}
            className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 rounded-full flex items-center justify-center transition-all active:scale-95 touch-manipulation shadow-2xl shadow-cyan-500/50"
            style={{ minWidth: '80px', minHeight: '80px' }}
          >
            <span className="text-4xl">{isPlaying ? '⏸️' : '▶️'}</span>
          </button>

          {/* Next Button */}
          <button
            onClick={onNext}
            disabled={!onNext}
            className="w-16 h-16 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-full flex items-center justify-center transition-all active:scale-95 touch-manipulation shadow-lg"
            style={{ minWidth: '64px', minHeight: '64px' }}
          >
            <span className="text-3xl">⏭️</span>
          </button>
        </div>
      </div>

      {/* Volume Control (Slide up to show) */}
      {showVolumeControl && (
        <div className="absolute bottom-full left-0 right-0 bg-black/90 backdrop-blur-xl p-6 border-t border-white/10">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🔇</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-3 bg-white/10 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #06b6d4 ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`,
                minHeight: '48px', // Large touch target
              }}
            />
            <span className="text-2xl">🔊</span>
          </div>
          <p className="text-center text-white/60 text-sm mt-2">
            Volume: {Math.round(volume * 100)}%
          </p>
        </div>
      )}

      {/* Gesture Hints */}
      <div className="px-6 pb-2">
        <div className="text-center text-white/40 text-xs">
          <p>👆 Swipe left/right: Next/Previous • Double tap: Play/Pause</p>
          <p>👆 Swipe up: Volume • Long press: Stop</p>
        </div>
      </div>
    </div>
  );
};

// Enhanced touch-friendly buttons for entire app
export const AndroidButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  icon?: string;
  className?: string;
}> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'lg', 
  disabled = false,
  icon,
  className = ''
}) => {
  const { isAndroid, isMobile } = useMobileDetection();

  const sizeClasses = {
    sm: 'min-h-[40px] min-w-[40px] px-3 py-2 text-sm',
    md: 'min-h-[48px] min-w-[48px] px-4 py-3 text-base',
    lg: 'min-h-[56px] min-w-[56px] px-6 py-4 text-lg',
    xl: 'min-h-[64px] min-w-[64px] px-8 py-5 text-xl',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-br from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white shadow-lg shadow-cyan-500/30',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30',
    ghost: 'bg-transparent hover:bg-white/10 text-white/80',
  };

  const baseSize = isAndroid || isMobile ? size : 'md';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[baseSize]}
        ${variantClasses[variant]}
        rounded-xl font-semibold
        transition-all active:scale-95 touch-manipulation
        disabled:opacity-40 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
      style={{ 
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {icon && <span className="text-xl">{icon}</span>}
      {children}
    </button>
  );
};
