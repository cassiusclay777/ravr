/**
 * AutoPlayer Hook
 * Global singleton hook for the main audio player with DSP integration
 */

import { useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { AutoPlayer } from '../audio/player';
import { useAudioStore } from '../store/audioStore';
import type { ReplayGainData } from '../audio/player';

// Global singleton instance
let globalPlayerInstance: AutoPlayer | null = null;
let instanceRefCount = 0;

/**
 * Hook for accessing the global AutoPlayer singleton instance.
 * Ensures only one AutoPlayer instance exists across the entire app.
 */
export function useAutoPlayer() {
  const {
    setIsPlaying,
    setCurrentTime,
    setDuration,
  } = useAudioStore();

  // Create global instance synchronously before first render
  if (!globalPlayerInstance) {
    console.log('🎵 Creating global AutoPlayer instance');
    globalPlayerInstance = new AutoPlayer();
  }

  const playerRef = useRef<AutoPlayer>(globalPlayerInstance);

  useLayoutEffect(() => {
    instanceRefCount++;

    // Set up event listeners
    const player = playerRef.current;
    const sourceEl = player.getSourceElement();

    const handleTimeUpdate = () => setCurrentTime(sourceEl.currentTime || 0);
    const handleLoadedMetadata = () => setDuration(sourceEl.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    sourceEl.addEventListener('timeupdate', handleTimeUpdate);
    sourceEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    sourceEl.addEventListener('play', handlePlay);
    sourceEl.addEventListener('pause', handlePause);
    sourceEl.addEventListener('ended', handleEnded);

    return () => {
      sourceEl.removeEventListener('timeupdate', handleTimeUpdate);
      sourceEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      sourceEl.removeEventListener('play', handlePlay);
      sourceEl.removeEventListener('pause', handlePause);
      sourceEl.removeEventListener('ended', handleEnded);

      instanceRefCount--;

      // Only dispose when no components are using it
      if (instanceRefCount === 0 && globalPlayerInstance) {
        console.log('🎵 Disposing global AutoPlayer instance');
        globalPlayerInstance.dispose();
        globalPlayerInstance = null;
      }
    };
  }, [setCurrentTime, setDuration, setIsPlaying]);

  return playerRef.current;
}

/**
 * Extended hook with additional player controls and DSP access
 */
export function useAutoPlayerControls() {
  const player = useAutoPlayer();
  
  // Player controls
  const play = useCallback(async () => {
    await player.play();
  }, [player]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const stop = useCallback(() => {
    player.stop();
  }, [player]);

  const seek = useCallback((time: number) => {
    player.seek(time);
  }, [player]);

  const setVolume = useCallback((volume: number) => {
    player.setVolume(volume);
  }, [player]);

  const load = useCallback(async (source: string | File | Blob, replayGain?: ReplayGainData) => {
    return await player.load(source, replayGain);
  }, [player]);

  // DSP controls
  const exportDspSettings = useCallback(() => {
    return player.exportDspSettings();
  }, [player]);

  const applyDspSettings = useCallback((settings: string | object) => {
    player.applyDspSettings(settings);
  }, [player]);

  // Context access
  const getContext = useCallback(() => {
    return player.getContext();
  }, [player]);

  const getSourceElement = useCallback(() => {
    return player.getSourceElement();
  }, [player]);

  const getSinkElement = useCallback(() => {
    return player.getSinkElement();
  }, [player]);

  const getCurrentTime = useCallback(() => {
    return player.getCurrentTime();
  }, [player]);

  const getDuration = useCallback(() => {
    return player.getDuration();
  }, [player]);

  return {
    player,
    // Playback controls
    play,
    pause,
    stop,
    seek,
    setVolume,
    load,
    // DSP controls
    exportDspSettings,
    applyDspSettings,
    // Getters
    getContext,
    getSourceElement,
    getSinkElement,
    getCurrentTime,
    getDuration
  };
}

/**
 * Get the global player instance directly (for non-React contexts)
 */
export function getGlobalPlayer(): AutoPlayer | null {
  return globalPlayerInstance;
}

export default useAutoPlayer;
