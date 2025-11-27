import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import React, { useEffect, useRef, useState } from 'react';
import { BsMusicNoteBeamed } from 'react-icons/bs';
import {
  FiActivity,
  FiPause,
  FiPlay,
  FiRepeat,
  FiShuffle,
  FiSkipBack,
  FiSkipForward,
  FiUpload,
  FiVolume2,
  FiVolumeX,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { PresetName } from '../audio/presets';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useAudioPresets } from '../hooks/useAudioPresets';
import PresetSelector from './presets/PresetSelector';

const AudioControls: React.FC = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    loadFile,
    load,
    toggle: togglePlayback,
    analyser,
  } = useAudioEngine();

  const { currentPreset, presets, applyPreset, saveCustomPreset, deleteCustomPreset } =
    useAudioPresets();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [currentTrack, setCurrentTrack] = useState<{ name: string; artist: string } | null>(null);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Real-time waveform visualization
  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)');
        gradient.addColorStop(1, 'rgba(147, 51, 234, 0.4)');

        const barWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }
      }

      if (isPlaying) {
        requestAnimationFrame(draw);
      }
    };

    if (isPlaying) {
      draw();
    }
  }, [analyser, isPlaying]);

  const handleVolumeChange = (value: number | number[]) => {
    const vol = Array.isArray(value) ? value[0] : value;
    setVolume(vol);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      loadFile(file);
      setCurrentTrack({
        name: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
      });
      console.log('Loaded audio file:', file.name);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Ensure there is a source when user presses Play
  const DEFAULT_DEMO_URL =
    'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3';
  const handlePlayClick = async () => {
    const el = document.getElementById('ravr-audio') as HTMLAudioElement | null;
    const hasSrc = !!el?.src;
    if (!hasSrc) {
      await load(DEFAULT_DEMO_URL);
      setCurrentTrack({ name: 'Demo – Kalimba', artist: 'Public Domain' });
      return; // load() already attempts to autoplay
    }
    togglePlayback();
  };

  return (
    <div className="glass-card relative rounded-[2rem] p-8 overflow-hidden world-class-blur">
      {/* Ultra-Premium Glassmorphism Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/30 to-blue-500/30 blur-[60px] animate-pulse"></div>
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-[60px] animate-bounce"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-r from-green-400/20 to-cyan-400/20 blur-[50px] animate-ping"></div>
      </div>

      {/* Premium Border Animation */}
      <div
        className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20"
        style={{
          background:
            'linear-gradient(45deg, rgba(34,211,238,0.3) 0%, rgba(147,51,234,0.3) 25%, rgba(236,72,153,0.3) 50%, rgba(34,197,94,0.3) 75%, rgba(34,211,238,0.3) 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 8s ease infinite',
        }}
      ></div>

      {/* Floating Light Reflections */}
      <div className="absolute top-4 left-4 w-32 h-0.5 bg-gradient-to-r from-white/80 via-white/40 to-transparent rounded-full"></div>
      <div className="absolute top-6 left-6 w-24 h-0.5 bg-gradient-to-r from-cyan-400/60 via-blue-500/30 to-transparent rounded-full"></div>

      {/* Track Info Header */}
      {currentTrack && (
        <div className="mb-6 text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <BsMusicNoteBeamed className="text-cyan-400 text-xl" />
            <h2 className="text-xl font-bold text-white/90">{currentTrack.name}</h2>
            <HiSparkles className="text-yellow-400 text-lg" />
          </div>
          <p className="text-sm text-white/60">{currentTrack.artist}</p>
        </div>
      )}

      {/* Real-time Waveform Visualization */}
      <div className="mb-6 relative z-10">
        <canvas
          ref={canvasRef}
          width={400}
          height={80}
          className="w-full h-20 rounded-xl bg-black/20 border border-white/10"
        />
        <div className="absolute top-2 right-2 text-xs text-white/40 flex items-center gap-1">
          <FiActivity /> LIVE
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-6 mb-6 relative z-10">
        <button
          onClick={() => setIsShuffled(!isShuffled)}
          className={`h-12 w-12 rounded-full grid place-items-center transition-all transform hover:scale-110 active:scale-95 shadow-lg ${
            isShuffled
              ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/50'
              : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
          }`}
          aria-label="Shuffle"
          title="Shuffle"
        >
          <FiShuffle size={18} />
        </button>

        <button
          onClick={triggerFileUpload}
          className="h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 text-white shadow-xl hover:shadow-purple-500/50 hover:scale-110 active:scale-95 transition-all transform"
          aria-label="Upload Audio File"
          title="Upload Audio File"
        >
          <FiUpload size={20} />
        </button>

        <button
          className="h-12 w-12 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-lg"
          aria-label="Previous Track"
        >
          <FiSkipBack size={20} />
        </button>

        <button
          onClick={handlePlayClick}
          className="h-16 w-16 rounded-full grid place-items-center bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 text-white shadow-2xl hover:shadow-cyan-500/50 transform hover:scale-110 active:scale-95 transition-all duration-200 ring-2 ring-white/20 hover:ring-cyan-400/50"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <FiPause size={28} /> : <FiPlay size={28} className="ml-1" />}
        </button>

        <button
          className="h-12 w-12 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-lg"
          aria-label="Next Track"
        >
          <FiSkipForward size={20} />
        </button>

        <button
          onClick={() =>
            setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')
          }
          className={`h-12 w-12 rounded-full grid place-items-center transition-all transform hover:scale-110 active:scale-95 shadow-lg ${
            repeatMode !== 'off'
              ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-orange-500/50'
              : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
          }`}
          aria-label={`Repeat: ${repeatMode}`}
        >
          <FiRepeat size={18} />
          {repeatMode === 'one' && (
            <span className="absolute top-0 right-0 text-xs bg-white text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">
              1
            </span>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Enhanced Timeline */}
      <div className="mb-6 relative z-10">
        <div className="flex justify-between text-sm text-white/80 mb-3 tabular-nums font-mono">
          <span className="px-3 py-1 bg-black/30 rounded-full">{formatTime(currentTime)}</span>
          <div className="text-xs text-white/50 flex items-center gap-2">
            <span>Quality: Hi-Fi</span>
            <span>•</span>
            <span>48kHz/24bit</span>
          </div>
          <span className="px-3 py-1 bg-black/30 rounded-full">{formatTime(duration)}</span>
        </div>
        <div className="relative">
          <Slider
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(value) => {
              const seekTime = Array.isArray(value) ? value[0] : value;
              console.log('Seek requested:', seekTime);
              if (duration > 0) {
                const audio = document.getElementById('ravr-audio') as HTMLAudioElement;
                if (audio && audio.readyState >= 1) {
                  audio.currentTime = Math.max(0, Math.min(seekTime, duration));
                }
              }
            }}
            styles={{
              track: {
                height: 8,
                background: 'linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6)',
                borderRadius: 4,
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
              },
              handle: {
                borderColor: '#06b6d4',
                backgroundColor: '#ffffff',
                opacity: 1,
                height: 24,
                width: 24,
                marginTop: -8,
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.5)',
                border: '3px solid #06b6d4',
              },
              rail: {
                backgroundColor: 'rgba(255,255,255,0.08)',
                height: 8,
                borderRadius: 4,
              },
            }}
          />
          {/* Waveform overlay on timeline */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            <div
              className="h-full bg-gradient-to-r from-transparent via-white/10 to-transparent rounded"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Advanced Controls Row */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        {/* Volume Control */}
        <div className="flex items-center gap-3 w-64">
          <div className="text-cyan-400 text-xl">
            {volume === 0 ? <FiVolumeX size={22} /> : <FiVolume2 size={22} />}
          </div>
          <div className="flex-1 relative">
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              styles={{
                track: {
                  backgroundColor: 'rgb(34 197 94)',
                  height: 6,
                  borderRadius: 3,
                  boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)',
                },
                handle: {
                  borderColor: 'rgb(34 197 94)',
                  backgroundColor: '#ffffff',
                  opacity: 1,
                  height: 18,
                  width: 18,
                  marginTop: -6,
                  boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
                },
                rail: { backgroundColor: 'rgba(255,255,255,0.08)', height: 6, borderRadius: 3 },
              }}
            />
            <div className="absolute -top-8 left-0 text-xs text-white/60 font-mono">
              {Math.round(volume * 100)}%
            </div>
          </div>
        </div>

        {/* DSP Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            EQ ON
          </div>
          <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            DSP
          </div>
          <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-semibold">
            HI-FI
          </div>
        </div>
      </div>

      {/* Enhanced Presets & Meters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/20 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <HiSparkles className="text-cyan-400 text-lg" />
            <h3 className="text-lg font-semibold text-white/90">Audio Enhancement Presets</h3>
          </div>
          <PresetSelector
            presets={presets}
            currentPreset={presets[currentPreset]}
            onPresetSelect={(preset) => applyPreset(preset.id as PresetName)}
            onSavePreset={saveCustomPreset}
            onDeletePreset={deleteCustomPreset}
          />
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/20 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <FiActivity className="text-green-400 text-lg" />
            <h3 className="text-lg font-semibold text-white/90">Audio Levels</h3>
          </div>
          <div className="space-y-4">
            {/* Professional VU Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/70">
                <span>MASTER</span>
                <span className="font-mono">{Math.round(volume * 100 - 60)} dB</span>
              </div>
              <div className="h-3 w-full rounded-lg bg-black/50 overflow-hidden border border-white/10 relative">
                <div
                  className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-100"
                  style={{ width: `${Math.min(100, Math.round(volume * 100))}%` }}
                />
                {/* Peak indicators */}
                <div className="absolute inset-0 flex">
                  <div className="w-3/5 border-r border-black/50"></div>
                  <div className="w-1/5 border-r border-black/50"></div>
                  <div className="w-1/5"></div>
                </div>
              </div>
            </div>

            {/* LUFS Metering */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/70">
                <span>LUFS</span>
                <span className="font-mono">-14.2</span>
              </div>
              <div className="h-2 w-full rounded bg-blue-500/30 relative">
                <div className="absolute left-0 top-0 h-full w-4/5 bg-blue-400 rounded transition-all duration-200"></div>
              </div>
            </div>

            <div className="text-xs text-white/50 text-center mt-3">Professional Metering</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioControls;
