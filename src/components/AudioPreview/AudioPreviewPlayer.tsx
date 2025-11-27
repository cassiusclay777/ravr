import React, { useState, useRef, useEffect } from 'react';
import './styles/audioPreview.css';

interface AudioPreviewPlayerProps {
  audioBuffer: AudioBuffer | null;
  onSeek?: (time: number) => void;
  onVolumeChange?: (volume: number) => void;
  onPlayPause?: (isPlaying: boolean) => void;
  className?: string;
}

export default function AudioPreviewPlayer({
  audioBuffer,
  onSeek,
  onVolumeChange,
  onPlayPause,
  className = '',
}: AudioPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [volumeDb, setVolumeDb] = useState(0);
  const [useDbVolume, setUseDbVolume] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  // Update duration when audio buffer changes
  useEffect(() => {
    if (audioBuffer) {
      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      setSeekPosition(0);
    }
  }, [audioBuffer]);

  // Update seek position during playback
  useEffect(() => {
    if (isPlaying && audioContextRef.current) {
      const updateSeekPosition = () => {
        const currentTime = audioContextRef.current!.currentTime - startTimeRef.current + pauseTimeRef.current;
        setCurrentTime(currentTime);
        setSeekPosition((currentTime / duration) * 100);
        animationFrameRef.current = requestAnimationFrame(updateSeekPosition);
      };
      updateSeekPosition();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isPlaying, duration]);

  const handlePlayPause = () => {
    if (!audioBuffer || !audioContextRef.current || !gainNodeRef.current) return;

    if (isPlaying) {
      // Pause
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      pauseTimeRef.current = currentTime;
      setIsPlaying(false);
      onPlayPause?.(false);
    } else {
      // Play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNodeRef.current);
      
      source.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setSeekPosition(0);
        pauseTimeRef.current = 0;
        onPlayPause?.(false);
      };

      source.start(0, currentTime);
      sourceNodeRef.current = source;
      startTimeRef.current = audioContextRef.current.currentTime;
      setIsPlaying(true);
      onPlayPause?.(true);
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(event.target.value);
    const newTime = (newPosition / 100) * duration;
    
    setSeekPosition(newPosition);
    setCurrentTime(newTime);
    pauseTimeRef.current = newTime;
    
    onSeek?.(newTime);

    // If playing, restart from new position
    if (isPlaying && sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      
      if (audioBuffer && audioContextRef.current && gainNodeRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNodeRef.current);
        
        source.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
          setSeekPosition(0);
          pauseTimeRef.current = 0;
          onPlayPause?.(false);
        };

        source.start(0, newTime);
        sourceNodeRef.current = source;
        startTimeRef.current = audioContextRef.current.currentTime;
      }
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    
    if (useDbVolume) {
      const volumeDb = newVolume;
      const volumeLinear = volumeDb === -80 ? 0 : Math.pow(10, volumeDb / 20);
      setVolumeDb(volumeDb);
      setVolume(volumeLinear);
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = volumeLinear;
      }
    } else {
      const volumeLinear = newVolume / 100;
      setVolume(volumeLinear);
      setVolumeDb(volumeLinear === 0 ? -80 : 20 * Math.log10(volumeLinear));
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = volumeLinear;
      }
    }
    
    onVolumeChange?.(volume);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  return (
    <div className={`audio-preview-player ${className}`}>
      <div className="player-controls">
        <button 
          className="play-button"
          onClick={handlePlayPause}
          disabled={!audioBuffer}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <div className="volume-control">
          <div className="volume-text">
            {useDbVolume 
              ? `Volume ${volume === 0 ? 'Muted' : volumeDb.toFixed(1) + ' dB'}`
              : `Volume ${Math.round(volume * 100)}`
            }
          </div>
          <input
            type="range"
            className="volume-bar"
            min={useDbVolume ? -80 : 0}
            max={useDbVolume ? 0 : 100}
            step={useDbVolume ? 0.5 : 1}
            value={useDbVolume ? volumeDb : volume * 100}
            onChange={handleVolumeChange}
          />
        </div>

        <div className="seek-control">
          <div className="seek-position-text">
            Position {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <div className="seek-bar-container">
            <input
              type="range"
              className="seek-bar"
              min="0"
              max="100"
              step="0.1"
              value={seekPosition}
              onChange={handleSeek}
            />
          </div>
        </div>

        <div className="settings-control">
          <label>
            <input
              type="checkbox"
              checked={useDbVolume}
              onChange={(e) => setUseDbVolume(e.target.checked)}
            />
            Use dB Volume
          </label>
        </div>
      </div>
    </div>
  );
}

