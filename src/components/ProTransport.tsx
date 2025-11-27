import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { FiPause, FiPlay, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { useAudioEngine } from '@/hooks/useAudioEngine';

function formatTime(time: number) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const ProTransport: React.FC = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    toggle: togglePlayback,
  } = useAudioEngine();

  const handleVolumeChange = (value: number | number[]) => {
    const vol = Array.isArray(value) ? value[0] : value;
    setVolume(vol);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-30">
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl shadow-neon">
          <div className="px-4 py-3 flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlayback}
              className="h-11 w-11 rounded-full grid place-items-center bg-gradient-to-b from-cyan-500 to-cyan-600 text-black shadow-lg hover:from-cyan-400 hover:to-cyan-500 active:scale-95 transition"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} className="ml-0.5" />}
            </button>

            {/* Timeline */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[11px] text-white/70 mb-1 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <Slider
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(value) => {
                  // Hook does not expose seek yet
                  // Add when available
                  console.log('Seek requested:', value);
                }}
                styles={{
                  track: { height: 6, backgroundColor: 'rgb(34 197 94)' },
                  handle: {
                    borderColor: 'rgb(34 197 94)',
                    backgroundColor: '#111827',
                    opacity: 1,
                    height: 18,
                    width: 18,
                    marginTop: -6,
                  },
                  rail: { backgroundColor: 'rgba(255,255,255,0.12)', height: 6 },
                }}
              />
            </div>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-2 w-44">
              <div className="text-white/80">
                {volume === 0 ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
              </div>
              <div className="flex-1">
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={handleVolumeChange}
                  styles={{
                    track: { backgroundColor: 'rgb(56 189 248)' },
                    handle: {
                      borderColor: 'rgb(56 189 248)',
                      backgroundColor: '#111827',
                      opacity: 1,
                      height: 14,
                      width: 14,
                      marginTop: -5,
                    },
                    rail: { backgroundColor: 'rgba(255,255,255,0.12)' },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProTransport;
