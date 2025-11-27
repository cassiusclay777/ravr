import { useEffect, useRef } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import Visualizer from './Visualizer';

interface AudioEngineProps {
  audioFile: string; // Path to audio file (relative to public directory)
}

export default function AudioEngine({ audioFile }: AudioEngineProps) {
  const {
    isPlaying,
    duration,
    currentTime,
    volume,
    isInitialized,
    error,
    setVolume,
    seek,
    togglePlay: togglePlayback,
    analyzerNode,
    loadAudio,
  } = useAudioPlayer();

  // Load the provided audio file once mounted or when it changes
  useEffect(() => {
    if (audioFile) {
      loadAudio(`/audio/${audioFile}`).catch(() => {/* ignore */});
    }
  }, [audioFile, loadAudio]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="bg-red-900 text-red-100 p-4 rounded-lg">
        <p className="font-bold">Audio Error:</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-gray-800 text-gray-300 p-4 rounded-lg text-center">
        Loading audio engine...
      </div>
    );
  }

  return (
    <div className="audio-engine bg-gray-900 p-6 rounded-lg max-w-2xl mx-auto">
      {/* Visualizer */}
      <div className="mb-4">
        <Visualizer analyzer={analyzerNode} />
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={togglePlayback}
          disabled={!isInitialized}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <div className="flex-1 mx-4">
          <div className="text-sm text-gray-400 mb-1 flex justify-between">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || 0)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div className="flex items-center w-32">
          <span className="text-gray-400 mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
      
      {/* DSP Controls (will be expanded) */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <h3 className="text-gray-400 text-sm font-medium mb-3">AUDIO PROCESSING</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Bass</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              defaultValue="0"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mid</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              defaultValue="0"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Treble</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              defaultValue="0"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

