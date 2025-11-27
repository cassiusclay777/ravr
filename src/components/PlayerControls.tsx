import React, { useState, useEffect, useRef } from 'react';
import { AutoPlayer } from '../audio/player';
import { OutputDeviceSelector } from '../audio/OutputDeviceSelector';
import { PresetManager } from '../presets/PresetManager';
import { useHotkeys } from '../hooks/useHotkeys';

interface PlayerControlsProps {
  player: AutoPlayer | null;
  currentTrack: { name: string; duration: number } | null;
  onTrackEnd?: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({ 
  player, 
  currentTrack,
  onTrackEnd
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const seekRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!player) return;

    const updateTime = setInterval(() => {
      if (!isSeeking) {
        setCurrentTime(player.getCurrentTime());
        setDuration(player.getDuration());
      }
    }, 100);

    return () => clearInterval(updateTime);
  }, [player, isSeeking]);

  // Hotkeys
  useHotkeys([
    { key: ' ', handler: () => togglePlayPause() },
    { key: 'ArrowLeft', handler: () => seek(-5) },
    { key: 'ArrowRight', handler: () => seek(5) },
    { key: 'ArrowUp', handler: () => changeVolume(0.1) },
    { key: 'ArrowDown', handler: () => changeVolume(-0.1) },
    { key: 'm', handler: () => setVolume(v => v === 0 ? 1 : 0) },
    // Quick presets 1-9
    ...Array.from({ length: 9 }, (_, i) => ({
      key: String(i + 1),
      handler: () => loadQuickPreset(i + 1)
    }))
  ]);

  const togglePlayPause = () => {
    if (!player) return;
    
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (player) {
      player.seek(time);
    }
  };

  const seek = (delta: number) => {
    if (!player) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + delta));
    player.seek(newTime);
    setCurrentTime(newTime);
  };

  const changeVolume = (delta: number) => {
    setVolume(v => Math.max(0, Math.min(1, v + delta)));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (player) {
      player.setVolume(vol);
    }
  };

  const loadQuickPreset = (slot: number) => {
    const preset = PresetManager.getQuickPreset(slot);
    if (preset && player) {
      // Apply preset DSP settings
      const dspPrefs = {
        sweetenerTargetLUFS: preset.dsp.sweetenerTargetLUFS ?? -14,
        limiter: preset.dsp.limiter ?? { threshold: -0.1, release: 0.05, ratio: 20 },
        eqTiltDbPerDecade: preset.dsp.eqTiltDbPerDecade ?? 0,
        monoBelowHz: preset.dsp.monoBelowHz ?? 120,
        stereoWidth: preset.dsp.stereoWidth ?? 1,
      };
      player.applyDspPreferences(dspPrefs);
    }
  };

  const handleDeviceChange = async (deviceId: string) => {
    if (!player) return;
    
    await player.setSinkId(deviceId);
    
    // Auto-apply device preset if configured
    const preset = PresetManager.getDevicePreset(deviceId);
    if (preset && preset.dsp) {
      const dspPrefs = {
        sweetenerTargetLUFS: preset.dsp.sweetenerTargetLUFS ?? -14,
        limiter: preset.dsp.limiter ?? { threshold: -0.1, release: 0.05, ratio: 20 },
        eqTiltDbPerDecade: preset.dsp.eqTiltDbPerDecade ?? 0,
        monoBelowHz: preset.dsp.monoBelowHz ?? 120,
        stereoWidth: preset.dsp.stereoWidth ?? 1,
      };
      player.applyDspPreferences(dspPrefs);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
      {/* Track Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-200">
          {currentTrack?.name || 'No track loaded'}
        </h3>
      </div>

      {/* Seek Bar */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-400 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            ref={seekRef}
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(currentTime / (duration || 100)) * 100}%, #374151 ${(currentTime / (duration || 100)) * 100}%, #374151 100%)`
            }}
          />
          <span className="text-xs text-gray-400 w-12">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={() => seek(-10)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Rewind 10s"
        >
          ⏪
        </button>
        
        <button
          onClick={togglePlayPause}
          className="p-3 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 transition-colors"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <button
          onClick={() => seek(10)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Forward 10s"
        >
          ⏩
        </button>
      </div>

      {/* Volume & Output */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-gray-400">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${volume * 100}%, #374151 ${volume * 100}%, #374151 100%)`
            }}
          />
          <span className="text-xs text-gray-400 w-10 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
        
        <OutputDeviceSelector onDeviceChange={handleDeviceChange} />
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          <span className="font-semibold">Hotkeys:</span> Space (play/pause), 
          ←→ (seek), ↑↓ (volume), M (mute), 1-9 (quick presets)
        </div>
      </div>
    </div>
  );
};
