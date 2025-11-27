import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioContextManager } from '../audio/AudioContextManager';

// Helper function to generate random colors
const getRandomColor = () => {
  const colors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#f97316'  // orange-500
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export interface TrackInfo {
  id: string;
  name: string;
  isMuted: boolean;
  isSoloed: boolean;
  volume: number;
  pan: number;
  color?: string;
}

export const useMultitrack = (audioContextManager: AudioContextManager) => {
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [masterVolume, setMasterVolumeState] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  // Initialize with a default track
  useEffect(() => {
    if (audioContextManager) {
      const defaultTrack = audioContextManager.getActiveTrack();
      if (defaultTrack) {
        setTracks([{
          id: 'track-1',
          name: 'Track 1',
          isMuted: false,
          isSoloed: false,
          volume: 0.8,
          pan: 0,
          color: '#3b82f6' // blue-500
        }]);
        setActiveTrackId('track-1');
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioContextManager]);

  // Update current time
  const updateCurrentTime = useCallback(() => {
    if (!audioContextManager) return;
    
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 16) { // ~60fps
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
      return;
    }
    
    lastUpdateTimeRef.current = now;
    setCurrentTime(audioContextManager.getCurrentTime());
    animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
  }, [audioContextManager]);

  // Start/stop time update loop
  useEffect(() => {
    if (isPlaying) {
      lastUpdateTimeRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateCurrentTime]);

  const createTrack = useCallback((name?: string, file?: File) => {
    const trackId = `track-${Date.now()}`;
    const trackName = name || (file ? file.name.replace(/\.[^/.]+$/, '') : `Track ${tracks.length + 1}`);
    
    const newTrack: TrackInfo = {
      id: trackId,
      name: trackName,
      isMuted: false,
      isSoloed: false,
      volume: 0.8,
      pan: 0,
      color: getRandomColor()
    };
    
    setTracks(prev => [...prev, newTrack]);
    setActiveTrackId(trackId);
    
      // Create the track in the audio context with default values
    audioContextManager.createTrack(trackId, trackName, { volume: 0.8 });
    
    // Load the file if provided
    if (file) {
      const url = URL.createObjectURL(file);
      audioContextManager.loadAudio(url, trackId)
        .then((buffer: AudioBuffer) => {
          setDuration(buffer.duration);
        })
        .catch(console.error);
    }
    
    return trackId;
  }, [tracks.length, audioContextManager]);

  const removeTrack = useCallback((id: string) => {
    if (tracks.length <= 1) return; // Don't remove the last track
    
    audioContextManager.removeTrack(id);
    setTracks(prev => prev.filter(track => track.id !== id));
    
    if (activeTrackId === id) {
      const remainingTracks = tracks.filter(track => track.id !== id);
      setActiveTrackId(remainingTracks[0]?.id || null);
    }
  }, [activeTrackId, audioContextManager, tracks]);

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    audioContextManager.setVolume(volume, trackId);
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, volume } : track
    ));
  }, [audioContextManager]);

  const setTrackMute = useCallback((trackId: string, isMuted: boolean) => {
    const track = audioContextManager.getTrack(trackId);
    if (!track) return;
    
    if (isMuted) {
      track.mute();
    } else {
      track.unmute();
    }
    
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, isMuted } : t
    ));
  }, [audioContextManager]);

  const setTrackSolo = useCallback((trackId: string, isSoloed: boolean) => {
    const track = audioContextManager.getTrack(trackId);
    if (!track) return;
    
    if (isSoloed) {
      track.solo();
    } else {
      track.unsolo();
    }
    
    setTracks(prev => prev.map(t => ({
      ...t,
      isSoloed: t.id === trackId ? isSoloed : t.isSoloed
    })));
  }, [audioContextManager]);

  const setActiveTrack = useCallback((trackId: string) => {
    audioContextManager.setActiveTrack(trackId);
    setActiveTrackId(trackId);
  }, [audioContextManager]);

  const play = useCallback(async () => {
    if (!audioContextManager) return;
    
    try {
      await audioContextManager.resume();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, [audioContextManager]);

  const pause = useCallback(async () => {
    if (!audioContextManager) return;
    
    try {
      await audioContextManager.suspend();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  }, [audioContextManager]);

  const loadAudio = useCallback(async (file: File | string) => {
    if (!activeTrackId) return;
    
    try {
      let url: string;
      if (typeof file === 'string') {
        url = file;
      } else {
        url = URL.createObjectURL(file);
      }
      
      await audioContextManager.loadAudio(url, activeTrackId);
      
      // Get the duration from the audio context
      const context = audioContextManager.getContext();
      if (context) {
        // Get the duration from the audio buffer if available
        const track = audioContextManager.getTrack(activeTrackId);
        if (track && track.buffer) {
          setDuration(track.buffer.duration);
        }
      }
      
      // Update track name if it's a file
      if (file instanceof File) {
        setTracks(prevTracks => 
          prevTracks.map(track => 
            track.id === activeTrackId 
              ? { ...track, name: file.name.replace(/\.[^/.]+$/, '') } 
              : track
          )
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error loading audio file:', error);
      throw error;
    }
  }, [activeTrackId, audioContextManager]);

  const seek = useCallback((time: number) => {
    if (!audioContextManager) return;
    
    // @ts-ignore - We know this method exists
    audioContextManager.seek(time);
    setCurrentTime(time);
  }, [audioContextManager]);

  const updateMasterVolume = useCallback((volume: number) => {
    if (!audioContextManager) return;
    // @ts-ignore - We know this method exists
    audioContextManager.setVolume(volume);
    
    // Update the local state
    setMasterVolumeState(volume);
  }, [audioContextManager]);

  return {
    // State
    tracks,
    activeTrackId,
    masterVolume,
    setMasterVolume: updateMasterVolume,
    isPlaying,
    currentTime,
    duration,
    
    // Actions
    createTrack,
    removeTrack,
    setTrackVolume,
    setTrackMute,
    setTrackSolo,
    setActiveTrack,
    play,
    pause,
    loadAudio,
    seek: seek as (time: number) => void,
    updateMasterVolume,
  };
};

export default useMultitrack;
