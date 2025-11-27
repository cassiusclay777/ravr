import React, { useCallback, useRef, useEffect } from 'react';
import { TrackInfo } from '../../hooks/useMultitrack';
import { FiVolume2, FiVolumeX, FiSliders } from 'react-icons/fi';
import { Knob } from '../controls/Knob';

interface TrackControlsProps {
  track: TrackInfo;
  isActive: boolean;
  onVolumeChange: (trackId: string, volume: number) => void;
  onMuteToggle: (trackId: string, isMuted: boolean) => void;
  onSoloToggle: (trackId: string, isSoloed: boolean) => void;
  onPanChange?: (trackId: string, pan: number) => void;
  className?: string;
}

const TrackControls: React.FC<TrackControlsProps> = ({
  track,
  isActive,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onPanChange,
  className = '',
}) => {
  const volumeKnobRef = useRef<HTMLDivElement>(null);
  const panKnobRef = useRef<HTMLDivElement>(null);

  const handleVolumeChange = useCallback((value: number) => {
    onVolumeChange(track.id, value);
  }, [onVolumeChange, track.id]);

  const handlePanChange = useCallback((value: number) => {
    if (onPanChange) {
      // Convert 0-1 range to -1 to 1 for panning
      onPanChange(track.id, (value * 2) - 1);
    }
  }, [onPanChange, track.id]);

  return (
    <div 
      className={`p-4 rounded-lg transition-colors ${isActive ? 'bg-gray-800/70' : 'bg-gray-800/30'} ${className}`}
      style={{ borderLeft: `4px solid ${track.color || '#3b82f6'}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium truncate">{track.name}</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSoloToggle(track.id, !track.isSoloed)}
            className={`p-1.5 rounded ${
              track.isSoloed
                ? 'bg-yellow-600/30 text-yellow-400'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title={track.isSoloed ? 'Unsolo track' : 'Solo track'}
          >
            S
          </button>
          <button
            onClick={() => onMuteToggle(track.id, !track.isMuted)}
            className={`p-1.5 rounded ${
              track.isMuted
                ? 'bg-red-600/30 text-red-400'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            title={track.isMuted ? 'Unmute track' : 'Mute track'}
          >
            {track.isMuted ? <FiVolumeX /> : <FiVolume2 />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Volume</span>
            <span>{Math.round(track.volume * 100)}%</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-16 h-16 flex-shrink-0" ref={volumeKnobRef}>
              <Knob
                value={track.volume}
                min={0}
                max={1}
                step={0.01}
                width={64}
                height={64}
                onChange={handleVolumeChange}
                fgColor={track.color || '#3b82f6'}
                bgColor="#1f2937"
              />
            </div>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={track.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {onPanChange && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Pan</span>
              <span>{track.pan < 0 ? 'L' : track.pan > 0 ? 'R' : 'C'}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 flex-shrink-0" ref={panKnobRef}>
                <Knob
                  value={(track.pan + 1) / 2} // Convert -1 to 1 range to 0-1
                  min={0}
                  max={1}
                  step={0.01}
                  width={64}
                  height={64}
                  onChange={handlePanChange}
                  fgColor="#94a3b8"
                  bgColor="#1f2937"
                />
              </div>
              <div className="flex-1">
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={track.pan}
                  onChange={(e) => handlePanChange((parseFloat(e.target.value) + 1) / 2)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Placeholder for effects/plugins */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <button className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white">
          <FiSliders className="w-4 h-4" />
          <span>Add Effect</span>
        </button>
      </div>
    </div>
  );
};

export default TrackControls;
