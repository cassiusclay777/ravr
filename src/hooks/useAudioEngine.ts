import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioContextManager } from '../audio/AudioContextManager';
import { WasmDspManager } from '../audio/WasmDspManager';
import { RelativisticAudioProcessor } from '../vr/RelativisticEffects';
import { GPUAudioProcessor, GPUProcessingStats } from '../audio/GPUAudioProcessor';

type Eq = { low: number; mid: number; high: number };
type Comp = { threshold: number };

interface RelativisticParams {
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  gravitationalField: number;
  spacetimeCurvature: number;
  referenceFrame: 'inertial' | 'accelerating' | 'rotating';
}

export function useAudioEngine() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const src = useRef<MediaElementAudioSourceNode | null>(null);
  const audioManager = useRef<AudioContextManager | null>(null);

  // Web Audio API nodes (fallback)
  const low = useRef<BiquadFilterNode | null>(null);
  const mid = useRef<BiquadFilterNode | null>(null);
  const high = useRef<BiquadFilterNode | null>(null);
  const comp = useRef<DynamicsCompressorNode | null>(null);
  const gain = useRef<GainNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);

  // WASM DSP Engine (preferred)
  const wasmDsp = useRef<WasmDspManager | null>(null);
  const wasmEnabled = useRef<boolean>(false);

  // Relativistic Audio Effects
  const relativisticProcessor = useRef<RelativisticAudioProcessor | null>(null);
  const [relativisticEnabled, setRelativisticEnabled] = useState(false);
  const [relativisticParams, setRelativisticParams] = useState<RelativisticParams>({
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    gravitationalField: 0,
    spacetimeCurvature: 0,
    referenceFrame: 'inertial',
  });

  // GPU Acceleration
  const gpuProcessor = useRef<GPUAudioProcessor | null>(null);
  const [gpuEnabled, setGpuEnabled] = useState(false);
  const [gpuStats, setGpuStats] = useState<GPUProcessingStats>({
    gpuAvailable: false,
    gpuEnabled: false,
    processingTime: 0,
    speedupFactor: 1.0,
    lastUpdateTime: 0,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrent] = useState(0);
  const [volume, setVol] = useState(0.9);
  const [eq, setEqState] = useState<Eq>({ low: 0, mid: 0, high: 0 });
  const [makeup, setMakeup] = useState(0);
  const [compState, setCompState] = useState<Comp>({ threshold: -24 });
  const [useWasm, setUseWasm] = useState(true); // Toggle WASM usage

  // Initialize audio element and context
  useEffect(() => {
    // Create or get audio element
    let audioElement = document.getElementById('ravr-audio') as HTMLAudioElement;

    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = 'ravr-audio';
      audioElement.className = 'hidden';
      document.body.appendChild(audioElement);
    }

    audioElement.crossOrigin = 'anonymous';
    audioElement.preload = 'auto';
    audio.current = audioElement;

    // Initialize audio context and nodes only once
    if (!audioManager.current) {
      try {
        audioManager.current = new AudioContextManager();
        const audioContext = audioManager.current.getContext();
        ctx.current = audioContext;

        // Initialize WASM DSP Engine
        if (useWasm) {
          wasmDsp.current = new WasmDspManager(audioContext);
          
          wasmDsp.current.waitUntilReady().then(() => {
            wasmEnabled.current = true;
            console.log('🔥 WASM DSP Engine ready for use!');
          }).catch((error) => {
            console.warn('⚠️ WASM DSP failed to initialize, falling back to Web Audio API:', error);
            wasmEnabled.current = false;
          });
        }

        // Create Web Audio API nodes (always available as fallback)
        low.current = audioContext.createBiquadFilter();
        low.current.type = 'lowshelf';
        low.current.frequency.value = 80;

        mid.current = audioContext.createBiquadFilter();
        mid.current.type = 'peaking';
        mid.current.frequency.value = 1000;
        mid.current.Q.value = 0.7;

        high.current = audioContext.createBiquadFilter();
        high.current.type = 'highshelf';
        high.current.frequency.value = 10000;

        comp.current = audioContext.createDynamicsCompressor();
        comp.current.threshold.value = -24;
        comp.current.ratio.value = 2;

        gain.current = audioContext.createGain();
        gain.current.gain.value = dbToGain(0);

        // Visual analyzer
        analyser.current = audioContext.createAnalyser();
        analyser.current.fftSize = 2048;
        analyser.current.smoothingTimeConstant = 0.8;

        // Initialize Relativistic Audio Processor
        relativisticProcessor.current = new RelativisticAudioProcessor(audioContext);
        console.log('⚡ Relativistic Audio Processor initialized');

        // Initialize GPU Audio Processor
        gpuProcessor.current = new GPUAudioProcessor({ preferGPU: true, fallbackToCPU: true });
        gpuProcessor.current.initialize().then((success) => {
          if (success) {
            setGpuStats(gpuProcessor.current!.getStats());
            console.log('🎮 GPU Audio Processor initialized');
          } else {
            console.log('⚙️ GPU not available, using CPU fallback');
          }
        }).catch((error) => {
          console.error('GPU initialization error:', error);
        });

        // Create the MediaElementSource only once
        // Check if element already has a source to prevent double connection error
        if (audioElement && !src.current) {
          try {
            src.current = audioContext.createMediaElementSource(audioElement);
            // Setup audio routing based on WASM availability
            setupAudioRouting();
          } catch (error) {
            // If already connected, that's okay - just skip
            if ((error as Error).message.includes('already connected')) {
              console.log('📻 Audio element already has a source node, reusing...');
            } else {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    }

    // Set up event listeners
    const handleTimeUpdate = () => setCurrent(audioElement.currentTime);
    const handleLoadedMetadata = () => setDuration(audioElement.duration);

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Cleanup function
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [useWasm]);

  // Setup audio routing (WASM or Web Audio API)
  const setupAudioRouting = useCallback(() => {
    if (!src.current || !ctx.current) return;

    const audioContext = ctx.current;

    // Wait for WASM to be ready if enabled
    if (useWasm && wasmDsp.current) {
      wasmDsp.current.waitUntilReady().then(() => {
        const wasmNode = wasmDsp.current!.getNode();
        
        if (wasmNode) {
          // WASM routing: source → WASM processor → gain → destination + analyser
          src.current!.disconnect();
          src.current!.connect(wasmNode);
          wasmNode.connect(gain.current!);
          gain.current!.connect(audioContext.destination);
          
          if (analyser.current) {
            gain.current!.connect(analyser.current);
          }
          
          console.log('🚀 Audio routing: WASM DSP Engine active');
        } else {
          useFallbackRouting();
        }
      }).catch(() => {
        useFallbackRouting();
      });
    } else {
      useFallbackRouting();
    }

    function useFallbackRouting() {
      // Web Audio API routing: source → EQ → compressor → gain → destination + analyser
      if (!src.current || !low.current || !mid.current || !high.current || !comp.current || !gain.current) return;
      
      src.current.disconnect();
      src.current.connect(low.current);
      low.current.connect(mid.current);
      mid.current.connect(high.current);
      high.current.connect(comp.current);
      comp.current.connect(gain.current);
      gain.current.connect(ctx.current!.destination);
      
      if (analyser.current) {
        gain.current.connect(analyser.current);
      }
      
      console.log('📻 Audio routing: Web Audio API fallback active');
    }
  }, [useWasm]);

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      // Disconnect all nodes safely
      try {
        if (src.current) src.current.disconnect();
      } catch (e) { /* ignore */ }
      try {
        if (low.current) low.current.disconnect();
      } catch (e) { /* ignore */ }
      try {
        if (mid.current) mid.current.disconnect();
      } catch (e) { /* ignore */ }
      try {
        if (high.current) high.current.disconnect();
      } catch (e) { /* ignore */ }
      try {
        if (comp.current) comp.current.disconnect();
      } catch (e) { /* ignore */ }
      try {
        if (gain.current) gain.current.disconnect();
      } catch (e) { /* ignore */ }
      try {
        if (analyser.current) analyser.current.disconnect();
      } catch (e) { /* ignore */ }

      // Clean up WASM
      if (wasmDsp.current) {
        try {
          wasmDsp.current.disconnect();
        } catch (e) { /* ignore */ }
        wasmDsp.current = null;
      }

      // Note: Don't clean up audioManager or close context in StrictMode
      // as they might be shared between mounts
      // audioManager and ctx will persist across re-mounts
    };
  }, []);

  // controls
  const play = useCallback(async () => {
    try {
      await ctx.current?.resume();
      if (!audio.current) return;
      if (!audio.current.src) {
        console.warn('[RAVR] No audio source set on #ravr-audio');
        return;
      }
      await audio.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn('[RAVR] play() failed:', err);
    }
  }, []);

  const pause = useCallback(() => {
    audio.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => (audio.current?.paused ? play() : pause()), [play, pause]);

  const seek = useCallback((time: number) => {
    if (!audio.current) return;
    const d = Number.isFinite(audio.current.duration) ? audio.current.duration : undefined;
    if (d !== undefined) {
      audio.current.currentTime = Math.max(0, Math.min(time, d));
    } else {
      audio.current.currentTime = Math.max(0, time);
    }
    setCurrent(audio.current.currentTime);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!audio.current) return;
    const url = URL.createObjectURL(file);
    audio.current.src = url;
    audio.current.currentTime = 0;

    try {
      await ctx.current?.resume();
      await audio.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn('[RAVR] Auto-play after file load was blocked or failed:', err);
    }

    return () => URL.revokeObjectURL(url);
  }, []);

  const load = useCallback(async (url: string) => {
    if (!audio.current) return;
    if (url.startsWith('blob:')) {
      if (audio.current.src === url) return;
      audio.current.src = url;
    } else {
      audio.current.src = url;
    }
    audio.current.currentTime = 0;

    try {
      await ctx.current?.resume();
      await audio.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn('[RAVR] Auto-play after URL load was blocked or failed:', err);
    }
  }, []);

  // volume
  useEffect(() => {
    if (audio.current) {
      audio.current.volume = volume;
    }
  }, [volume]);

  // EQ - route to WASM or Web Audio API
  const setEq = useCallback((band: keyof Eq, value: number) => {
    setEqState((prev) => {
      const newEq = { ...prev, [band]: value };
      
      // Update WASM processor if enabled
      if (wasmEnabled.current && wasmDsp.current) {
        wasmDsp.current.setEq(newEq.low, newEq.mid, newEq.high);
      }
      
      return newEq;
    });
  }, []);

  useEffect(() => {
    // Fallback to Web Audio API nodes if WASM not available
    if (!wasmEnabled.current) {
      if (!low.current || !mid.current || !high.current) return;
      low.current.gain.value = eq.low;
      mid.current.gain.value = eq.mid;
      high.current.gain.value = eq.high;
    }
  }, [eq]);

  // Makeup gain (post comp)
  useEffect(() => {
    if (gain.current) gain.current.gain.value = dbToGain(makeup);
  }, [makeup]);

  // Compressor threshold
  const setComp = useCallback((c: Partial<Comp>) => {
    setCompState((prev) => {
      const newComp = { ...prev, ...c };
      
      // Update WASM processor if enabled
      if (wasmEnabled.current && wasmDsp.current && newComp.threshold !== undefined) {
        wasmDsp.current.setCompressor(newComp.threshold, 4.0, 5, 100);
      }
      
      return newComp;
    });
  }, []);

  useEffect(() => {
    // Fallback to Web Audio API
    if (!wasmEnabled.current && comp.current) {
      comp.current.threshold.value = compState.threshold;
    }
  }, [compState.threshold]);

  return {
    isPlaying,
    play,
    pause,
    toggle,
    seek,
    currentTime,
    duration,
    loadFile,
    load,
    volume,
    setVolume: setVol,
    eq,
    setEq,
    makeup,
    setMakeup,
    comp: compState,
    setComp,
    audioManager: audioManager.current,
    ctx: ctx.current,
    outputNode: gain.current,
    analyser: analyser.current,
    wasmDsp: wasmDsp.current,
    wasmEnabled: wasmEnabled.current,
    useWasm,
    setUseWasm,
    // Relativistic Audio Effects
    relativisticEnabled,
    setRelativisticEnabled,
    relativisticParams,
    setRelativisticParams,
    relativisticProcessor: relativisticProcessor.current,
    // GPU Acceleration
    gpuProcessor: gpuProcessor.current,
    gpuEnabled,
    setGpuEnabled: (enabled: boolean) => {
      setGpuEnabled(enabled);
      if (gpuProcessor.current) {
        gpuProcessor.current.setGPUEnabled(enabled);
        setGpuStats(gpuProcessor.current.getStats());
      }
    },
    gpuStats,
    refreshGpuStats: () => {
      if (gpuProcessor.current) {
        setGpuStats(gpuProcessor.current.getStats());
      }
    },
  };
}

function dbToGain(db: number) {
  return Math.pow(10, db / 20);
}
