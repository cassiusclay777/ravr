import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '../useAudioPlayer';
import Visualizer from './Visualizer';
import Playlist from './Playlist';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaRandom, FaRedo, FaVolumeUp, FaVolumeMute, FaExpand, FaCog } from 'react-icons/fa';

interface ModernPlayerProps {
  className?: string;
}

export const ModernPlayer: React.FC<ModernPlayerProps> = ({ className = '' }) => {
  const {
    play,
    pause,
    loadAudio,
    setVolume: setPlayerVolume,
    analyzerNode,
    dspControls,
    isPlaying,
    isInitialized,
    currentTime,
    duration,
    error,
  } = useAudioPlayer();

  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showDSP, setShowDSP] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{ name: string; artist: string } | null>(null);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    setPlayerVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, [setPlayerVolume]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      handleVolumeChange(0.8);
    } else {
      handleVolumeChange(0);
    }
  }, [isMuted, handleVolumeChange]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      try {
        await play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  }, [isPlaying, play, pause]);

  const handleTrackSelect = useCallback(async (file: File, url: string) => {
    try {
      const loaded = await loadAudio(file, true);
      if (loaded) {
        setCurrentTrack({ name: file.name, artist: 'Unknown Artist' });
        await play();
      }
    } catch (error) {
      console.error('Error loading track:', error);
    }
  }, [loadAudio, play]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    // Implement seek functionality through audio player
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`modern-player ${className}`}>
      {/* Glassmorphism Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-2xl"
      >
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-cyan-500/20 to-pink-500/20 animate-gradient-shift" />

        {/* Content */}
        <div className="relative z-10 p-8">
          {/* Visualizer Section */}
          <div className="mb-6 rounded-2xl overflow-hidden bg-black/20 backdrop-blur-sm border border-white/10">
            <div className="h-48 w-full">
              {analyzerNode ? (
                <Visualizer analyzer={analyzerNode} />
              ) : (
                <div className="flex items-center justify-center h-full text-white/40">
                  <span className="text-lg">No audio loaded</span>
                </div>
              )}
            </div>
          </div>

          {/* Track Info */}
          <div className="text-center mb-8">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-3xl font-bold text-white mb-2 tracking-tight"
            >
              {currentTrack?.name || 'No track playing'}
            </motion.h2>
            <p className="text-white/60 text-sm">{currentTrack?.artist || 'Select a track to play'}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div
              ref={progressBarRef}
              onClick={handleSeek}
              className="relative h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden group"
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              <div
                className="absolute inset-y-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/60 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Shuffle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShuffle(!shuffle)}
              className={`p-3 rounded-full transition-colors ${
                shuffle
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              <FaRandom className="w-4 h-4" />
            </motion.button>

            {/* Previous */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <FaStepBackward className="w-5 h-5" />
            </motion.button>

            {/* Play/Pause */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={togglePlay}
              className="p-6 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/70 transition-all"
            >
              {isPlaying ? (
                <FaPause className="w-6 h-6" />
              ) : (
                <FaPlay className="w-6 h-6 ml-1" />
              )}
            </motion.button>

            {/* Next */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <FaStepForward className="w-5 h-5" />
            </motion.button>

            {/* Repeat */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRepeat(!repeat)}
              className={`p-3 rounded-full transition-colors ${
                repeat
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              <FaRedo className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between">
            {/* Volume Control */}
            <div className="flex items-center gap-3 flex-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className="text-white/80 hover:text-white transition-colors"
              >
                {isMuted ? <FaVolumeMute className="w-5 h-5" /> : <FaVolumeUp className="w-5 h-5" />}
              </motion.button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-32 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-xs text-white/60 w-10">{Math.round(volume * 100)}%</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                title="Playlist"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowDSP(!showDSP)}
                className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                title="DSP Settings"
              >
                <FaCog className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                title="Fullscreen"
              >
                <FaExpand className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Playlist Panel */}
      <AnimatePresence>
        {showPlaylist && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            className="mt-4 rounded-2xl backdrop-blur-2xl bg-white/5 border border-white/20 overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Playlist</h3>
              <Playlist
                onTrackSelect={handleTrackSelect}
                currentTrackUrl={currentTrack?.name}
                onPlayPause={(url) => togglePlay()}
                onRemoveTrack={(id) => {
                  setPlaylist(playlist.filter((t) => t.id !== id));
                }}
                onReorderTracks={setPlaylist}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DSP Panel */}
      <AnimatePresence>
        {showDSP && dspControls && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            className="mt-4 rounded-2xl backdrop-blur-2xl bg-white/5 border border-white/20 overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">DSP Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* EQ Controls */}
                <div>
                  <h4 className="text-sm font-semibold text-white/80 mb-3">Equalizer</h4>
                  <div className="space-y-4">
                    {['low', 'mid', 'high'].map((band) => (
                      <div key={band} className="space-y-2">
                        <div className="flex justify-between text-xs text-white/60">
                          <span className="capitalize">{band}</span>
                          <span>{dspControls.eq[band as keyof typeof dspControls.eq]} dB</span>
                        </div>
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="0.5"
                          value={dspControls.eq[band as keyof typeof dspControls.eq]}
                          onChange={(e) => {
                            if (dspControls.setEQ) {
                              dspControls.setEQ({
                                ...dspControls.eq,
                                [band]: parseFloat(e.target.value),
                              });
                            }
                          }}
                          className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-purple-600 [&::-webkit-slider-thumb]:rounded-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stereo Width */}
                <div>
                  <h4 className="text-sm font-semibold text-white/80 mb-3">Stereo Width</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>Width</span>
                      <span>{dspControls.stereoWidth}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={dspControls.stereoWidth}
                      onChange={(e) => {
                        if (dspControls.setStereoWidth) {
                          dspControls.setStereoWidth(parseFloat(e.target.value));
                        }
                      }}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-purple-600 [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200"
        >
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-gradient-shift {
          animation: gradient-shift 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ModernPlayer;
