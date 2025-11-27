import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HybridDSPModule } from '../dsp/HybridDSPModule';
import { buildAutoSweetener } from '../dsp/autoSweetener';
import type { DeviceProfile } from '../utils/profiles';

// Types for DSP settings
export interface EQSettings {
  low: number;
  mid: number;
  high: number;
}

export interface CompressorSettings {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
  makeupGain: number;
}

export interface GainSettings {
  input: number;
  output: number;
}

export interface DSPState {
  eq: EQSettings;
  stereoWidth: number;
  compressor: CompressorSettings;
  gain: GainSettings;
  bypass: boolean;
}

// Type for DSP module methods - using type assertion to access private properties
interface DSPModule {
  setEQ: (eq: EQSettings) => void;
  setStereoWidth: (width: number) => void;
  setCompressor: (settings: CompressorSettings) => void;
  setGain: (gain: GainSettings) => void;
  setBypass: (bypass: boolean) => void;
  // Using type assertion to access private properties
  getInput: () => AudioNode;
  getOutput: () => AudioNode;
  disconnect: () => void;
}

// Type for DSP preset names
export type DSPPresetName = 'flat' | 'neutron' | 'ambient' | 'voice';

// Interface for DSP preset storage
export interface DSPPreset {
  id: string;
  name: string;
  settings: Omit<DSPState, 'bypass'>;
  createdAt: string;
  timestamp: number;
}

// Interface for DSP controls
export interface DSPControls {
  // DSP control methods
  setEQ: (eq: EQSettings) => void;
  setStereoWidth: (width: number) => void;
  setCompressor: (settings: CompressorSettings) => void;
  setGain: (gain: GainSettings) => void;
  toggleBypass: () => void;
  isBypassed: boolean;

  // Preset management
  savePreset: (name: string, settings: Omit<DSPState, 'bypass'>) => boolean;
  loadPreset: (name: string) => boolean;
  deletePreset: (name: string) => boolean;
  getSavedPresets: () => string[];
  getCurrentSettings: () => Omit<DSPState, 'bypass'>;

  // Current DSP state values
  eq: EQSettings;
  stereoWidth: number;
  compressor: CompressorSettings;
  gain: GainSettings;
}

interface AudioPlayerReturn {
  // Playback state
  isPlaying: boolean;
  isInitialized: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;

  // Playback controls
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  getProgress: () => number;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  loadAudio: (source: string | File | Blob, isBlob?: boolean) => Promise<boolean>;

  // DSP controls
  dspControls: DSPControls | null;
  // Device profile application
  applyDeviceProfile: (profile: DeviceProfile) => void;

  // Refs
  audioRef: React.RefObject<HTMLAudioElement | null>;
  analyzerNode: AnalyserNode | null;

  // Additional methods
  getCurrentTime: () => number;
  getDuration: () => number;
}

export const useAudioPlayer = (): AudioPlayerReturn => {
  // Refs for audio elements and nodes - declared first to avoid reference errors
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const sourceNode = useRef<MediaElementAudioSourceNode | null>(null);
  const analyzerNode = useRef<AnalyserNode | null>(null);
  const directGainNode = useRef<GainNode | null>(null);
  const dspModule = useRef<HybridDSPModule | null>(null);
  const sweetenerRef = useRef<ReturnType<typeof buildAutoSweetener> | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const targetLUFSRef = useRef<number>(-14);
  const dspSettingsRef = useRef<Omit<DSPState, 'bypass'>>({
    eq: { low: 0, mid: 0, high: 0 },
    stereoWidth: 1.0,
    compressor: {
      threshold: -24,
      ratio: 12,
      attack: 0.003,
      release: 0.25,
      knee: 30,
      makeupGain: 0,
    },
    gain: { input: 1, output: 1 },
  });
  // Removed unused animationFrameId ref
  const [volumeState, setVolumeState] = useState(1.0);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DSP state and controls with proper typing
  const [dspState, setDspState] = useState<DSPState>({
    eq: { low: 0, mid: 0, high: 0 },
    stereoWidth: 1.0,
    compressor: {
      threshold: -24,
      ratio: 12,
      attack: 0.003,
      release: 0.25,
      knee: 30,
      makeupGain: 0,
    },
    gain: { input: 1, output: 1 },
    bypass: false,
  });

  // Update the dspSettings ref whenever dspState changes
  useEffect(() => {
    const { bypass, ...settings } = dspState;
    dspSettingsRef.current = settings;
  }, [dspState]);

  // Volume setter with proper typing
  const setVolume = useCallback((newVolume: number) => {
    const volume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(volume);
    const now = audioContext.current?.currentTime ?? 0;
    if (directGainNode.current) {
      try {
        directGainNode.current.gain.setTargetAtTime(volume, now, 0.02);
      } catch {
        directGainNode.current.gain.value = volume;
      }
    } else if (audioElement.current) {
      // Fallback when graph not initialized yet
      audioElement.current.volume = volume;
    }
  }, []);

  // Get current time in seconds
  const getCurrentTime = useCallback((): number => {
    return audioElement.current?.currentTime || 0;
  }, []);

  // Get duration in seconds
  const getDuration = useCallback((): number => {
    return audioElement.current?.duration || 0;
  }, []);

  // Initialize default methods
  const play = useCallback(async () => {
    if (audioElement.current) {
      try {
        await audioElement.current.play();
        setIsPlaying(true);
      } catch (err) {
        const error = err as Error;
        console.error('Error playing audio:', error);
        setError(`Playback error: ${error.message}`);
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (audioElement.current) {
      audioElement.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioElement.current) {
      audioElement.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const getProgress = useCallback((): number => {
    if (
      !audioElement.current ||
      isNaN(audioElement.current.duration) ||
      !isFinite(audioElement.current.duration)
    ) {
      return 0;
    }
    return (audioElement.current.currentTime / audioElement.current.duration) * 100;
  }, []);

  // Helper function to prepare audio source URL
  const prepareAudioSource = useCallback(async (source: string | File | Blob): Promise<string> => {
    // Revoke previous object URL if any
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (source instanceof File || source instanceof Blob) {
      const urlToUse = URL.createObjectURL(source);
      objectUrlRef.current = urlToUse;
      return urlToUse;
    }
    return source;
  }, []);

  // Helper function to load audio metadata
  const loadAudioMetadata = useCallback(
    async (element: HTMLAudioElement, url: string): Promise<void> => {
      element.src = url;

      return new Promise<void>((resolve, reject) => {
        const onLoaded = () => {
          setDuration(element.duration || 0);
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('Failed to load audio'));
        };
        const cleanup = () => {
          element.removeEventListener('loadedmetadata', onLoaded);
          element.removeEventListener('error', onError);
        };

        element.addEventListener('loadedmetadata', onLoaded);
        element.addEventListener('error', onError);
        element.load();
      });
    },
    [],
  );

  // Helper function to initialize audio context and DSP chain
  const initializeAudioChain = useCallback(
    async (element: HTMLAudioElement): Promise<void> => {
      if (audioContext.current) return; // Already initialized

      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      sourceNode.current = audioContext.current.createMediaElementSource(element);

      // Prevent double output (element direct -> speakers AND processed graph)
      element.muted = true;
      element.volume = 0;

      // Create analyzer node for visualization
      analyzerNode.current = audioContext.current.createAnalyser();
      analyzerNode.current.fftSize = 256;

      // Create direct gain node
      directGainNode.current = audioContext.current.createGain();
      directGainNode.current.gain.value = 1.0;

      // Create DSP module
      dspModule.current = new HybridDSPModule(audioContext.current);

      // Initialize DSP module with current settings
      const initS = dspSettingsRef.current;
      try {
        dspModule.current.setEQ?.(initS.eq);
        dspModule.current.setStereoWidth?.(initS.stereoWidth);
        dspModule.current.setCompressor?.(initS.compressor);
        dspModule.current.setGain?.(initS.gain);
      } catch (dspError) {
        console.warn('Failed to initialize DSP settings:', dspError);
      }

      // Create AutoSweetener at end of chain
      sweetenerRef.current = buildAutoSweetener(audioContext.current);

      // Connect nodes: source -> DSP -> sweetener -> directGain -> analyzer -> destination
      sourceNode.current.connect(dspModule.current.getInput());
      dspModule.current.getOutput().connect(sweetenerRef.current.input);
      sweetenerRef.current.output.connect(directGainNode.current);
      directGainNode.current.connect(analyzerNode.current);
      analyzerNode.current.connect(audioContext.current.destination);

      // Set initial processed volume
      directGainNode.current.gain.value = volumeState;
      setIsInitialized(true);
    },
    [volumeState],
  );

  // Helper function to run AutoSweetener auto-gain
  const runAutoGain = useCallback(async (source: string | File | Blob): Promise<void> => {
    if (!audioContext.current || !sweetenerRef.current) return;

    try {
      let arrayBuf: ArrayBuffer | null = null;

      if (source instanceof File || source instanceof Blob) {
        arrayBuf = await source.arrayBuffer();
      } else if (typeof source === 'string') {
        try {
          const resp = await fetch(source);
          if (resp.ok) arrayBuf = await resp.arrayBuffer();
        } catch (fetchError) {
          console.warn('Failed to fetch audio data for auto-gain:', fetchError);
        }
      }

      if (arrayBuf) {
        const decoded = await audioContext.current.decodeAudioData(arrayBuf.slice(0));
        await sweetenerRef.current.autoGainForBuffer(decoded, targetLUFSRef.current);
      }
    } catch (e) {
      console.warn('AutoSweetener auto-gain failed:', e);
    }
  }, []);

  const loadAudio = useCallback(
    async (source: string | File | Blob, isBlob: boolean = false): Promise<boolean> => {
      try {
        if (!audioElement.current) return false;

        // Pause current playback
        pause();

        // Prepare audio source URL
        const urlToUse = await prepareAudioSource(source);

        // Load audio metadata
        await loadAudioMetadata(audioElement.current, urlToUse);

        // Initialize audio context and DSP chain if needed
        await initializeAudioChain(audioElement.current);

        // Run AutoSweetener auto-gain
        await runAutoGain(source);

        // Reset error state
        setError(null);
        return true;
      } catch (err) {
        const error = err as Error;
        console.error('Error loading audio:', error);
        setError(`Failed to load audio: ${error.message}`);
        return false;
      }
    },
    [pause, prepareAudioSource, loadAudioMetadata, initializeAudioChain, runAutoGain],
  );

  // Attach audio element event listeners
  useEffect(() => {
    const el = audioElement.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onMeta = () => setDuration(el.duration || 0);
    const onPlayEv = () => setIsPlaying(true);
    const onPauseEv = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => setError(el.error ? el.error.message : 'Audio error');
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('play', onPlayEv);
    el.addEventListener('pause', onPauseEv);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('play', onPlayEv);
      el.removeEventListener('pause', onPauseEv);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
    };
  }, []);

  // DSP control functions with proper type safety
  const dspControls: DSPControls | null = useMemo(() => {
    if (!audioContext.current) return null;

    return {
      setEQ: (eq: EQSettings) => {
        setDspState((prev) => ({ ...prev, eq }));
        dspModule.current?.setEQ?.(eq);
      },
      setStereoWidth: (width: number) => {
        setDspState((prev) => ({ ...prev, stereoWidth: width }));
        dspModule.current?.setStereoWidth?.(width);
      },
      setCompressor: (settings: CompressorSettings) => {
        setDspState((prev) => ({ ...prev, compressor: settings }));
        dspModule.current?.setCompressor?.(settings);
      },
      setGain: (gain: GainSettings) => {
        setDspState((prev) => ({ ...prev, gain }));
        dspModule.current?.setGain?.(gain);
      },
      toggleBypass: () => {
        setDspState((prev) => ({ ...prev, bypass: !prev.bypass }));
        dspModule.current?.setBypass?.(!dspState.bypass);
      },
      isBypassed: dspState.bypass,
      savePreset: (name: string, settings: Omit<DSPState, 'bypass'>) => {
        try {
          const presets = JSON.parse(localStorage.getItem('dspPresets') || '{}');
          const preset: DSPPreset = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            settings,
            createdAt: new Date().toISOString(),
            timestamp: Date.now(),
          };
          presets[preset.id] = preset;
          localStorage.setItem('dspPresets', JSON.stringify(presets));
          return true;
        } catch (err) {
          console.error('Failed to save preset:', err);
          return false;
        }
      },
      loadPreset: (name: string) => {
        try {
          const presets = JSON.parse(localStorage.getItem('dspPresets') || '{}');
          const preset = presets[name];
          if (preset) {
            setDspState((prev) => ({
              ...prev,
              ...preset.settings,
              bypass: prev.bypass,
            }));
            return true;
          }
          return false;
        } catch (err) {
          console.error('Failed to load preset:', err);
          return false;
        }
      },
      deletePreset: (name: string) => {
        try {
          const presets = JSON.parse(localStorage.getItem('dspPresets') || '{}');
          if (presets[name]) {
            delete presets[name];
            localStorage.setItem('dspPresets', JSON.stringify(presets));
            return true;
          }
          return false;
        } catch (err) {
          console.error('Failed to delete preset:', err);
          return false;
        }
      },
      getSavedPresets: () => {
        try {
          const presets = JSON.parse(localStorage.getItem('dspPresets') || '{}');
          return Object.keys(presets);
        } catch (err) {
          console.error('Failed to get saved presets:', err);
          return [];
        }
      },
      getCurrentSettings: () => ({
        eq: { ...dspState.eq },
        stereoWidth: dspState.stereoWidth,
        compressor: { ...dspState.compressor },
        gain: { ...dspState.gain },
      }),
      // Current state
      eq: { ...dspState.eq },
      stereoWidth: dspState.stereoWidth,
      compressor: { ...dspState.compressor },
      gain: { ...dspState.gain },
    };
  }, [dspState.bypass]);

  // Apply a device profile: map gentle tilt to our EQ, set stereo width and LUFS target
  const applyDeviceProfile = useCallback((profile: DeviceProfile) => {
    const dsp = profile?.dsp;
    if (!dsp) return;
    if (typeof dsp.stereoWidth === 'number') {
      setDspState((prev) => ({ ...prev, stereoWidth: dsp.stereoWidth! }));
      dspModule.current?.setStereoWidth?.(dsp.stereoWidth);
    }
    if (typeof dsp.eqTiltDbPerDecade === 'number') {
      const t = dsp.eqTiltDbPerDecade ?? 0;
      const eq = { low: t, mid: 0, high: -t };
      setDspState((prev) => ({ ...prev, eq }));
      dspModule.current?.setEQ?.(eq);
    }
    if (typeof dsp.sweetenerTargetLUFS === 'number') {
      targetLUFSRef.current = dsp.sweetenerTargetLUFS;
      // Attempt to re-run auto-gain on current track for immediate effect
      (async () => {
        try {
          if (!audioContext.current || !sweetenerRef.current || !audioElement.current) return;
          const src = audioElement.current.src;
          if (!src) return;
          const res = await fetch(src);
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          const decoded = await audioContext.current.decodeAudioData(buf.slice(0));
          await sweetenerRef.current.autoGainForBuffer(decoded, targetLUFSRef.current);
        } catch (autoGainError) {
          console.warn('Auto-gain re-application failed:', autoGainError);
        }
      })();
    }
  }, []);

  // Return the public API with proper typing
  return {
    // Playback state
    isPlaying,
    isInitialized,
    currentTime,
    duration,
    volume: volumeState,
    isMuted,
    error,

    // Playback controls
    play,
    pause,
    togglePlay,
    seek,
    getProgress,
    setVolume,
    setMuted: (muted: boolean) => {
      if (audioElement.current) {
        audioElement.current.muted = muted;
        setIsMuted(muted);
      }
    },
    loadAudio,

    // DSP controls
    dspControls,
    // Device profile
    applyDeviceProfile,

    // Refs
    audioRef: audioElement,
    analyzerNode: analyzerNode.current,

    // Additional methods
    getCurrentTime,
    getDuration,
  };
};
