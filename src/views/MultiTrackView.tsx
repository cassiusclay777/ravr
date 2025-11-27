import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AudioContextManager } from '../audio/AudioContextManager';
import { FiUpload, FiPlus, FiPlay, FiPause, FiVolume2 } from 'react-icons/fi';
import TrackList from '../components/tracks/TrackList';
import TrackControls from '../components/tracks/TrackControls';
import { useMultitrack, TrackInfo } from '../hooks/useMultitrack';

interface MultiTrackViewProps {
  audioContextManager: AudioContextManager;
  onLoadFile?: (file: File) => void | Promise<void>;
  className?: string;
}

const MultiTrackView: React.FC<MultiTrackViewProps> = (props) => {
  const { audioContextManager, className = '' } = props;
  const {
    tracks,
    activeTrackId,
    masterVolume,
    isPlaying,
    currentTime,
    duration,
    createTrack,
    removeTrack,
    setTrackVolume,
    setTrackMute,
    setTrackSolo,
    setActiveTrack,
    play,
    pause,
    loadAudio: loadAudioToTrack,
    seek,
    setMasterVolume,
  } = useMultitrack(audioContextManager);

  // Handle file loading, either through the prop or directly to the track
  const handleLoadAudio = useCallback(async (file: File) => {
    if (props.onLoadFile) {
      return props.onLoadFile(file);
    }
    
    // Default behavior if no onLoadFile prop provided
    try {
      await loadAudioToTrack(file);
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  }, [props.onLoadFile, loadAudioToTrack]);

  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const activeTrack = tracks.find(track => track.id === activeTrackId) || tracks[0];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsDragging(false);
    if (acceptedFiles.length > 0) {
      try {
        await handleLoadAudio(acceptedFiles[0]);
      } catch (error) {
        console.error('Error loading audio file:', error);
      }
    }
  }, [handleLoadAudio]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.flac']
    },
    noClick: true,
  });

  const handleAddTrack = useCallback(() => {
    createTrack(`Track ${tracks.length + 1}`);
  }, [createTrack, tracks.length]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, position * duration));
    seek(newTime);
  }, [duration, seek]);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`flex flex-col h-full ${className} ${isDragging ? 'bg-blue-900/20' : ''}`}
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Track List */}
        <div className="w-64 border-r border-gray-700 bg-gray-900/50 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Tracks</h2>
            <button
              onClick={handleAddTrack}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              <span>Add Track</span>
            </button>
          </div>
          
          <TrackList
            tracks={tracks}
            activeTrackId={activeTrackId || ''}
            onTrackSelect={setActiveTrack}
            onTrackMute={setTrackMute}
            onTrackSolo={setTrackSolo}
            onTrackRemove={removeTrack}
            onTrackAdd={handleAddTrack}
          />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Track Controls */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold mb-4">
              {activeTrack?.name || 'No Track Selected'}
            </h2>
            
            {activeTrack ? (
              <TrackControls
                track={activeTrack}
                isActive={true}
                onVolumeChange={setTrackVolume}
                onMuteToggle={setTrackMute}
                onSoloToggle={setTrackSolo}
                onPanChange={(trackId, pan) => {
                  // Update track pan in state if needed
                  console.log(`Pan track ${trackId} to ${pan}`);
                }}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No track selected or create a new track to get started</p>
              </div>
            )}
          </div>
          
          {/* Timeline/Arrangement View (Placeholder) */}
          <div className="flex-1 bg-gray-900/50 p-4 overflow-auto">
            <div className="text-center text-gray-500 py-12">
              <FiUpload className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Drag and drop audio files here or use the track list to manage your project</p>
            </div>
          </div>
          
          {/* Transport Controls */}
          <div className="border-t border-gray-700 p-4 bg-gray-900/70">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-400 w-16">
                {formatTime(currentTime)}
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlayPause}
                  className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white"
                >
                  {isPlaying ? <FiPause className="w-6 h-6" /> : <FiPlay className="w-6 h-6 ml-1" />}
                </button>
              </div>
              
              <div className="text-sm text-gray-400 w-16 text-right">
                {formatTime(duration)}
              </div>
            </div>
            
            <div 
              ref={progressBarRef}
              onClick={handleSeek}
              className="h-2 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
            >
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                <FiVolume2 className="text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-400 w-10">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
              
              <div className="text-xs text-gray-500">
                {tracks.length} track{tracks.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {isDragActive && (
        <div className="fixed inset-0 bg-blue-900/30 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gray-900/90 border-2 border-dashed border-blue-400 rounded-xl p-8 text-center max-w-md">
            <FiUpload className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <h3 className="text-xl font-semibold mb-2">Drop Audio File</h3>
            <p className="text-gray-300">
              Drop your audio file here to add it to the current track
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiTrackView;
