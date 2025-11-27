import { create } from 'zustand';
import { AudioContextManager } from '../audio/AudioContextManager';

interface AudioNode {
  low: BiquadFilterNode | null;
  mid: BiquadFilterNode | null;
  high: BiquadFilterNode | null;
  comp: DynamicsCompressorNode | null;
  gain: GainNode | null;
  analyser: AnalyserNode | null;
}

interface AudioState {
  // Core audio objects
  audioElement: HTMLAudioElement | null;
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
  audioManager: AudioContextManager | null;

  // Audio nodes
  nodes: AudioNode;

  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;

  // Audio parameters
  eq: { low: number; mid: number; high: number };
  makeup: number;
  comp: { threshold: number };

  // Initialization state
  isInitialized: boolean;

  // Actions
  initializeAudio: () => Promise<void>;
  cleanupAudio: () => void;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (time: number) => void;
  loadFile: (file: File) => () => void;
  load: (url: string) => void;
  setVolume: (volume: number) => void;
  setEq: (band: keyof AudioState['eq'], value: number) => void;
  setMakeup: (value: number) => void;
  setComp: (updates: Partial<AudioState['comp']>) => void;
  updateCurrentTime: (time: number) => void;
  updateDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
}

const dbToGain = (db: number): number => Math.pow(10, db / 20);

export const useAudioStore = create<AudioState>((set, get) => ({
  // Initial state
  audioElement: null,
  audioContext: null,
  sourceNode: null,
  audioManager: null,
  nodes: {
    low: null,
    mid: null,
    high: null,
    comp: null,
    gain: null,
    analyser: null,
  },
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.9,
  eq: { low: 0, mid: 0, high: 0 },
  makeup: 0,
  comp: { threshold: -24 },
  isInitialized: false,

  // Initialize audio engine (singleton)
  initializeAudio: async () => {
    const state = get();

    // Prevent multiple initializations
    if (state.isInitialized) {
      console.log('Audio engine already initialized');
      return;
    }

    try {
      console.log('Initializing audio engine...');

      // Create or get audio element (singleton)
      let audioElement = document.getElementById('ravr-audio') as HTMLAudioElement;

      if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.id = 'ravr-audio';
        audioElement.className = 'hidden';
        audioElement.crossOrigin = 'anonymous';
        audioElement.preload = 'auto';
        document.body.appendChild(audioElement);
      }

      // Check if element is already connected to a source
      const existingSource = (audioElement as any).__mediaElementSource;
      if (existingSource) {
        console.log('Audio element already has a MediaElementSource, reusing...');
        return;
      }

      // Initialize audio context manager
      const audioManager = new AudioContextManager();
      const audioContext = audioManager.getContext();

      // Create audio nodes
      const low = audioContext.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 80;

      const mid = audioContext.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 0.7;

      const high = audioContext.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 10000;

      const comp = audioContext.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.ratio.value = 2;
      comp.attack.value = 0.003;
      comp.release.value = 0.1;

      const gain = audioContext.createGain();
      gain.gain.value = dbToGain(0);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      // Create MediaElementSource only once
      const sourceNode = audioContext.createMediaElementSource(audioElement);

      // Mark element as connected (prevent duplicate sources)
      (audioElement as any).__mediaElementSource = sourceNode;

      // Connect audio graph
      sourceNode.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(comp);
      comp.connect(gain);
      gain.connect(audioContext.destination);
      gain.connect(analyser);

      // Set up event listeners
      const handleTimeUpdate = () => {
        set({ currentTime: audioElement.currentTime });
      };

      const handleLoadedMetadata = () => {
        set({ duration: audioElement.duration });
      };

      const handlePlay = () => set({ isPlaying: true });
      const handlePause = () => set({ isPlaying: false });
      const handleEnded = () => set({ isPlaying: false });

      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('pause', handlePause);
      audioElement.addEventListener('ended', handleEnded);

      // Update state
      set({
        audioElement,
        audioContext,
        sourceNode,
        audioManager,
        nodes: { low, mid, high, comp, gain, analyser },
        isInitialized: true,
      });

      console.log('Audio engine initialized successfully');
    } catch (error) {
      console.error('Error initializing audio:', error);
      throw error;
    }
  },

  // Cleanup audio resources
  cleanupAudio: () => {
    const state = get();

    try {
      // Remove event listeners
      if (state.audioElement) {
        const audioElement = state.audioElement;
        audioElement.removeEventListener('timeupdate', () => {});
        audioElement.removeEventListener('loadedmetadata', () => {});
        audioElement.removeEventListener('play', () => {});
        audioElement.removeEventListener('pause', () => {});
        audioElement.removeEventListener('ended', () => {});
      }

      // Disconnect audio nodes
      // Disconnect all audio nodes
      Object.values(state.nodes).forEach((node) => {
        if (node) {
          try {
            node.disconnect();
          } catch (e) {
            console.warn('Error disconnecting node:', e);
          }
        }
      });

      // Disconnect source node if exists
      if (state.sourceNode) {
        try {
          state.sourceNode.disconnect();
        } catch (e) {
          console.warn('Error disconnecting source node:', e);
        }
      }

      // Cleanup audio manager
      if (state.audioManager) {
        state.audioManager.dispose?.().catch(console.error);
      }

      // Close audio context
      if (state.audioContext && state.audioContext.state !== 'closed') {
        state.audioContext.close().catch(console.error);
      }

      // Clear element connection marker
      if (state.audioElement) {
        delete (state.audioElement as any).__mediaElementSource;
      }

      // Reset state
      set({
        audioElement: null,
        audioContext: null,
        sourceNode: null,
        audioManager: null,
        nodes: {
          low: null,
          mid: null,
          high: null,
          comp: null,
          gain: null,
          analyser: null,
        },
        isInitialized: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      });

      console.log('Audio engine cleaned up');
    } catch (error) {
      console.error('Error cleaning up audio:', error);
    }
  },

  // Playback controls
  play: async () => {
    const { audioElement, audioContext } = get();
    if (!audioElement || !audioContext) return;

    try {
      await audioContext.resume();
      await audioElement.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  },

  pause: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
    }
  },

  toggle: async () => {
    const { audioElement, play, pause } = get();
    if (!audioElement) return;

    if (audioElement.paused) {
      await play();
    } else {
      pause();
    }
  },

  seek: (time: number) => {
    const { audioElement } = get();
    if (!audioElement) return;

    const duration = audioElement.duration;
    if (Number.isFinite(duration)) {
      audioElement.currentTime = Math.max(0, Math.min(time, duration));
    } else {
      audioElement.currentTime = Math.max(0, time);
    }
  },

  loadFile: (file: File) => {
    const { audioElement } = get();
    if (!audioElement) return () => {};

    const url = URL.createObjectURL(file);
    audioElement.src = url;
    audioElement.currentTime = 0;
    return () => URL.revokeObjectURL(url);
  },

  load: (url: string) => {
    const { audioElement } = get();
    if (!audioElement) return;

    if (audioElement.src !== url) {
      audioElement.src = url;
      audioElement.currentTime = 0;
    }
  },

  // Audio parameter controls
  setVolume: (volume: number) => {
    const { audioElement } = get();
    set({ volume });
    if (audioElement) {
      audioElement.volume = volume;
    }
  },

  setEq: (band: keyof AudioState['eq'], value: number) => {
    const { nodes, eq, audioContext } = get();
    const node = nodes[band];

    if (node && node.gain.value !== value) {
      // Smooth parameter change
      node.gain.setTargetAtTime(value, audioContext?.currentTime || 0, 0.01);
    }

    set({ eq: { ...eq, [band]: value } });
  },

  setMakeup: (value: number) => {
    const { nodes, audioContext } = get();
    set({ makeup: value });

    if (nodes.gain) {
      const gainValue = dbToGain(value);
      nodes.gain.gain.setTargetAtTime(gainValue, audioContext?.currentTime || 0, 0.01);
    }
  },

  setComp: (updates: Partial<AudioState['comp']>) => {
    const { nodes, comp, audioContext } = get();
    const newComp = { ...comp, ...updates };
    set({ comp: newComp });

    if (nodes.comp && updates.threshold !== undefined) {
      nodes.comp.threshold.setTargetAtTime(updates.threshold, audioContext?.currentTime || 0, 0.01);
    }
  },

  // Internal state updates (called by event listeners)
  updateCurrentTime: (time: number) => set({ currentTime: time }),
  updateDuration: (duration: number) => set({ duration }),
  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
}));
