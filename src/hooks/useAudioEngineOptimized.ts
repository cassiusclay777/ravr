import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { AudioContextManager } from '../audio/AudioContextManager';

type Eq = { low: number; mid: number; high: number };
type Comp = { threshold: number };

export function useAudioEngine() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const src = useRef<MediaElementAudioSourceNode | null>(null);
  const audioManager = useRef<AudioContextManager | null>(null);

  // Audio nodes refs
  const nodes = useRef<{
    low: BiquadFilterNode | null;
    mid: BiquadFilterNode | null;
    high: BiquadFilterNode | null;
    comp: DynamicsCompressorNode | null;
    gain: GainNode | null;
    analyser: AnalyserNode | null;
  }>({
    low: null,
    mid: null,
    high: null,
    comp: null,
    gain: null,
    analyser: null
  });

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrent] = useState(0);
  const [volume, setVol] = useState(0.9);
  const [eq, setEqState] = useState<Eq>({ low: 0, mid: 0, high: 0 });
  const [makeup, setMakeup] = useState(0);
  const [compState, setCompState] = useState<Comp>({ threshold: -24 });

  // Performance: Throttle time updates
  const timeUpdateRef = useRef<number>();
  const throttleTimeUpdate = useCallback((time: number) => {
    if (timeUpdateRef.current) {
      cancelAnimationFrame(timeUpdateRef.current);
    }
    timeUpdateRef.current = requestAnimationFrame(() => {
      setCurrent(time);
    });
  }, []);

  // Initialize audio engine once
  const initializeAudio = useCallback(() => {
    // Create or get audio element
    let audioElement = document.getElementById('ravr-audio') as HTMLAudioElement;

    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = 'ravr-audio';
      audioElement.className = 'hidden';
      audioElement.crossOrigin = 'anonymous';
      audioElement.preload = 'auto';
      document.body.appendChild(audioElement);
    }

    audio.current = audioElement;

    // Initialize audio context and nodes only once
    if (!audioManager.current) {
      try {
        audioManager.current = new AudioContextManager();
        const audioContext = audioManager.current.getContext();
        ctx.current = audioContext;

        // Create audio nodes with optimized settings
        nodes.current.low = audioContext.createBiquadFilter();
        nodes.current.low.type = 'lowshelf';
        nodes.current.low.frequency.value = 80;

        nodes.current.mid = audioContext.createBiquadFilter();
        nodes.current.mid.type = 'peaking';
        nodes.current.mid.frequency.value = 1000;
        nodes.current.mid.Q.value = 0.7;

        nodes.current.high = audioContext.createBiquadFilter();
        nodes.current.high.type = 'highshelf';
        nodes.current.high.frequency.value = 10000;

        nodes.current.comp = audioContext.createDynamicsCompressor();
        nodes.current.comp.threshold.value = -24;
        nodes.current.comp.ratio.value = 2;
        nodes.current.comp.attack.value = 0.003;
        nodes.current.comp.release.value = 0.1;

        nodes.current.gain = audioContext.createGain();
        nodes.current.gain.gain.value = dbToGain(0);

        // Visual analyzer with optimized settings
        nodes.current.analyser = audioContext.createAnalyser();
        nodes.current.analyser.fftSize = 2048;
        nodes.current.analyser.smoothingTimeConstant = 0.8;
        nodes.current.analyser.minDecibels = -90;
        nodes.current.analyser.maxDecibels = -10;

        // Create the MediaElementSource only once
        if (audioElement && !src.current) {
          src.current = audioContext.createMediaElementSource(audioElement);

          // Connect the audio graph efficiently
          src.current.connect(nodes.current.low);
          nodes.current.low.connect(nodes.current.mid);
          nodes.current.mid.connect(nodes.current.high);
          nodes.current.high.connect(nodes.current.comp);
          nodes.current.comp.connect(nodes.current.gain);
          
          // Fan-out to destination and analyser
          nodes.current.gain.connect(audioContext.destination);
          nodes.current.gain.connect(nodes.current.analyser);
        }

        console.log('Audio engine initialized successfully');
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    }
  }, []);

  // Event handlers with throttling/debouncing
  const handleTimeUpdate = useCallback(() => {
    if (audio.current) {
      throttleTimeUpdate(audio.current.currentTime);
    }
  }, [throttleTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (audio.current) {
      setDuration(audio.current.duration);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeAudio();

    if (audio.current) {
      audio.current.addEventListener('timeupdate', handleTimeUpdate);
      audio.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      if (audio.current) {
        audio.current.removeEventListener('timeupdate', handleTimeUpdate);
        audio.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [initializeAudio, handleTimeUpdate, handleLoadedMetadata]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending animations
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }

      // Disconnect all nodes efficiently
      Object.values(nodes.current).forEach(node => {
        if (node) {
          try {
            node.disconnect();
          } catch (e) {
            // Node might already be disconnected
          }
        }
      });

      if (src.current) {
        try {
          src.current.disconnect();
        } catch (e) {
          // Source might already be disconnected
        }
      }

      // Clean up audio manager
      if (audioManager.current) {
        audioManager.current.dispose().catch(console.error);
        audioManager.current = null;
      }

      // Close audio context
      if (ctx.current && ctx.current.state !== 'closed') {
        ctx.current.close().catch(console.error);
        ctx.current = null;
      }

      // Clear references
      src.current = null;
      Object.keys(nodes.current).forEach(key => {
        (nodes.current as any)[key] = null;
      });
    };
  }, []);

  // Optimized controls with memoization
  const play = useCallback(async () => {
    if (!audio.current || !ctx.current) return;
    try {
      await ctx.current.resume();
      await audio.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, []);

  const pause = useCallback(() => {
    if (audio.current) {
      audio.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (!audio.current) return;
    if (audio.current.paused) {
      await play();
    } else {
      pause();
    }
  }, [play, pause]);

  const seek = useCallback((time: number) => {
    if (!audio.current) return;
    const duration = audio.current.duration;
    if (Number.isFinite(duration)) {
      audio.current.currentTime = Math.max(0, Math.min(time, duration));
    } else {
      audio.current.currentTime = Math.max(0, time);
    }
  }, []);

  const loadFile = useCallback((file: File) => {
    if (!audio.current) return;
    const url = URL.createObjectURL(file);
    audio.current.src = url;
    audio.current.currentTime = 0;
    // Return cleanup function
    return () => URL.revokeObjectURL(url);
  }, []);

  const load = useCallback((url: string) => {
    if (!audio.current) return;
    if (audio.current.src !== url) {
      audio.current.src = url;
      audio.current.currentTime = 0;
    }
  }, []);

  // Optimized parameter updates with batch processing
  const updateEQBand = useCallback((band: keyof Eq, value: number) => {
    const node = nodes.current[band];
    if (node && node.gain.value !== value) {
      // Use setTargetAtTime for smooth parameter changes
      node.gain.setTargetAtTime(value, ctx.current?.currentTime || 0, 0.01);
    }
  }, []);

  const setEq = useCallback((band: keyof Eq, value: number) => {
    setEqState(prev => {
      if (prev[band] === value) return prev;
      updateEQBand(band, value);
      return { ...prev, [band]: value };
    });
  }, [updateEQBand]);

  // Volume control with audio element
  useEffect(() => {
    if (audio.current && audio.current.volume !== volume) {
      audio.current.volume = volume;
    }
  }, [volume]);

  // Makeup gain control
  useEffect(() => {
    if (nodes.current.gain && makeup !== undefined) {
      const gainValue = dbToGain(makeup);
      nodes.current.gain.gain.setTargetAtTime(
        gainValue,
        ctx.current?.currentTime || 0,
        0.01
      );
    }
  }, [makeup]);

  // Compressor control
  const setComp = useCallback((updates: Partial<Comp>) => {
    setCompState(prev => {
      const newState = { ...prev, ...updates };
      if (nodes.current.comp && newState.threshold !== prev.threshold) {
        nodes.current.comp.threshold.setTargetAtTime(
          newState.threshold,
          ctx.current?.currentTime || 0,
          0.01
        );
      }
      return newState;
    });
  }, []);

  // Memoized return object to prevent unnecessary re-renders
  return useMemo(() => ({
    // Playback state
    isPlaying,
    currentTime,
    duration,
    
    // Controls
    play,
    pause,
    toggle,
    seek,
    loadFile,
    load,
    
    // Audio parameters
    volume,
    setVolume: setVol,
    eq,
    setEq,
    makeup,
    setMakeup,
    comp: compState,
    setComp,
    
    // Advanced access
    audioManager: audioManager.current,
    ctx: ctx.current,
    outputNode: nodes.current.gain,
    analyser: nodes.current.analyser,
    
    // Performance helpers
    nodes: nodes.current,
  }), [
    isPlaying, currentTime, duration, play, pause, toggle, seek, loadFile, load,
    volume, setVol, eq, setEq, makeup, setMakeup, compState, setComp
  ]);
}

// Utility functions
function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export { dbToGain };
