import React, { useRef } from 'react';
import { FiPlay, FiPause, FiZap, FiHeart } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { useAudioStore, Track } from '../store/audioStore';
import { useAutoPlayer } from '../hooks/useAutoPlayer';

export const WelcomeAudioDemo: React.FC = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    currentTrack,
    setCurrentTrack
  } = useAudioStore();

  const player = useAutoPlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePlay = async () => {
    if (!player) return;

    try {
      if (isPlaying) {
        player.pause();
      } else {
        await player.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    if (!player) {
      console.error('❌ Player not initialized!');
      return;
    }

    console.log('🎵 Loading audio file:', file.name);

    const track: Track = {
      id: Date.now().toString(),
      name: file.name,
      artist: 'Local File',
      album: 'Uploaded',
      duration: 0,
      url: URL.createObjectURL(file)
    };

    console.log('📝 Setting current track:', track);
    setCurrentTrack(track);

    try {
      console.log('📀 Loading file into player...');
      const loaded = await player.load(file);
      console.log('✅ File loaded:', loaded);

      if (loaded) {
        console.log('▶️ Starting playback...');
        await player.play();
        console.log('✅ Playback started!');
      } else {
        console.error('❌ Failed to load file');
      }
    } catch (error) {
      console.error('❌ Error during file upload:', error);
    }

    // Reset input value safely
    if (event.currentTarget) {
      event.currentTarget.value = '';
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const trackName = currentTrack?.name || 'Žádný track';
  const trackArtist = currentTrack?.artist || 'Stlač tlačítko a nahraj hudbu';

  return (
    <div className="glass-card rounded-[2rem] p-8 space-y-6 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-[40px] animate-pulse"></div>
        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-[50px] animate-bounce"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div
            className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            onClick={handleFileSelect}
            title="Nahraj hudbu"
          >
            <FiHeart className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
              {trackName}
            </h3>
            <p className="text-white/60 text-sm">{trackArtist}</p>
          </div>
          <HiSparkles className="text-yellow-400 text-xl animate-spin" />
        </div>
      </div>

      {/* Track Info */}
      <div className="relative z-10 text-center space-y-2">
        <h4 className="text-lg font-semibold text-white/90">
          {currentTrack ? `✨ ${currentTrack.name}` : "🎵 Nahraj hudbu"}
        </h4>
        <p className="text-white/60 text-sm">
          {currentTrack ? "Enhanced Audio · DSP Active" : "Klikni na ❤️ nebo na play tlačítko"}
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Playback Controls */}
      <div className="relative z-10 flex items-center justify-center gap-6">
        <button
          onClick={togglePlay}
          disabled={!currentTrack}
          className="group relative w-16 h-16 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-500 rounded-full shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
          {isPlaying ? (
            <FiPause className="relative z-10 text-white text-2xl mx-auto" />
          ) : (
            <FiPlay className="relative z-10 text-white text-2xl mx-auto ml-1" />
          )}

          {/* Pulsing ring when playing */}
          {isPlaying && (
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping"></div>
          )}
        </button>

        {/* Time Display */}
        <div className="text-center">
          <div className="text-white/90 font-mono text-lg">
            {formatTime(currentTime)}
          </div>
          <div className="text-white/50 text-xs">
            {isPlaying ? "Playing" : currentTrack ? "Ready" : "No track"}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 space-y-2">
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full transition-all duration-100"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-white/50">
          <span>{formatTime(currentTime)}</span>
          <span>{currentTrack ? 'Playing' : 'Nahraj track'}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Subtle Features Highlight */}
      <div className="relative z-10 grid grid-cols-3 gap-4 text-center opacity-60">
        <div className="space-y-2">
          <FiZap className="mx-auto text-cyan-400 text-lg" />
          <p className="text-xs text-white/50">Enhanced</p>
        </div>
        <div className="space-y-2">
          <FiHeart className="mx-auto text-pink-400 text-lg" />
          <p className="text-xs text-white/50">With Love</p>
        </div>
        <div className="space-y-2">
          <HiSparkles className="mx-auto text-yellow-400 text-lg" />
          <p className="text-xs text-white/50">Beautiful</p>
        </div>
      </div>

      {/* Call to Action */}
      {isPlaying && currentTrack && (
        <div className="relative z-10 text-center animate-fade-in">
          <p className="text-white/70 text-sm">
            🎧 Cítíš ten rozdíl?
          </p>
          <p className="text-cyan-400 text-xs mt-2">
            DSP efekty aktivní - equalizer, compressor a další!
          </p>
        </div>
      )}
      {!currentTrack && (
        <div className="relative z-10 text-center">
          <button
            onClick={handleFileSelect}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded-full shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105"
          >
            📁 Nahraj hudbu
          </button>
        </div>
      )}
    </div>
  );
};
