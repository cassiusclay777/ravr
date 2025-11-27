import { createAutoChain, type AutoChain } from '../utils/autoChain';
import type { DeviceProfile } from '../utils/profiles';
import type { DspPreferences } from '../dsp/types';
import { EUPHDecoder } from '../formats/EUPHDecoder';
import { DspSettingsManager, DSPChainConfig } from '../dsp/DspSettingsManager';
import { ModularDspChain } from '../dsp/ModularDspChain';

export type { DspPreferences };

export interface PlayerInitOptions {
  context?: AudioContext;
  profile?: DeviceProfile;
  targetLUFS?: number;
  crossfadeDuration?: number;
  gaplessMode?: boolean;
}

export interface ReplayGainData {
  trackGain?: number;
  trackPeak?: number;
  albumGain?: number;
  albumPeak?: number;
}

export class AutoPlayer {
  private ctx: AudioContext;
  private sourceEl: HTMLAudioElement;
  private sinkEl: HTMLAudioElement;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private seekTarget: number | null = null;
  private objectUrl: string | null = null;
  private targetLUFS: number;

  // Gapless & crossfade
  private nextSourceNode: MediaElementAudioSourceNode | null = null;
  private nextSourceEl: HTMLAudioElement | null = null;
  private crossfadeGain: GainNode;
  private nextCrossfadeGain: GainNode;
  private crossfadeDuration: number;
  private gaplessMode: boolean;
  private preloadBuffer: ArrayBuffer | null = null;

  // ReplayGain
  private replayGainNode: GainNode;
  private currentReplayGain: ReplayGainData = {};

  // Seek support
  // Audio graph nodes
  private analyzer: AnalyserNode;
  private chain: AutoChain;
  private dest: MediaStreamAudioDestinationNode;

  // Multiple instance coordination
  private broadcastChannel: BroadcastChannel | null = null;
  private instanceId: string;

  constructor(opts: PlayerInitOptions = {}) {
    this.ctx = opts.context ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    this.targetLUFS = opts.profile?.dsp?.sweetenerTargetLUFS ?? opts.targetLUFS ?? -14;
    this.crossfadeDuration = opts.crossfadeDuration ?? 2; // seconds
    this.gaplessMode = opts.gaplessMode ?? true;
    this.instanceId = `ravr-player-${Date.now()}-${Math.random()}`;

    // Set up broadcast channel for multi-instance coordination
    try {
      this.broadcastChannel = new BroadcastChannel('ravr-audio-player');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'play' && event.data?.instanceId !== this.instanceId) {
          // Another instance started playing, pause this one
          this.pause();
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    // Create audio elements
    this.sourceEl = this.createAudioElement();
    this.sinkEl = document.createElement('audio');
    this.sinkEl.autoplay = true;
    this.sinkEl.controls = false;
    this.sinkEl.style.display = 'none';
    document.body.appendChild(this.sinkEl);
    
    // Crossfade gains
    this.crossfadeGain = this.ctx.createGain();
    this.nextCrossfadeGain = this.ctx.createGain();
    this.nextCrossfadeGain.gain.value = 0;
    
    // ReplayGain
    this.replayGainNode = this.ctx.createGain();

    this.dest = this.ctx.createMediaStreamDestination();
    this.analyzer = this.ctx.createAnalyser();
    this.analyzer.fftSize = 2048;
    this.chain = createAutoChainPlaceholder();

    // Build DSP chain
    const dspPrefs: DspPreferences = {
      sweetenerTargetLUFS: opts.profile?.dsp?.sweetenerTargetLUFS ?? this.targetLUFS,
      limiter: opts.profile?.dsp?.limiter ?? { threshold: -0.1, release: 0.05, ratio: 20 },
      eqTiltDbPerDecade: opts.profile?.dsp?.eqTiltDbPerDecade ?? 0,
      monoBelowHz: opts.profile?.dsp?.monoBelowHz ?? 120,
      stereoWidth: opts.profile?.dsp?.stereoWidth ?? 1,
    };
    this.chain = createAutoChain(this.ctx, dspPrefs);

    // Wire graph: sources -> crossfade -> replayGain -> chain -> analyzer -> dest
    this.crossfadeGain.connect(this.replayGainNode);
    this.nextCrossfadeGain.connect(this.replayGainNode);
    this.replayGainNode.connect(this.chain.input);
    this.chain.output.connect(this.analyzer);
    this.analyzer.connect(this.dest);
    this.sinkEl.srcObject = this.dest.stream;
    
    // Set up seek check
    this.sourceEl.addEventListener('canplay', () => {
      if (this.seekTarget !== null && this.sourceEl.readyState >= 1) {
        this.sourceEl.currentTime = this.seekTarget;
        this.seekTarget = null;
      }
    });
  }
  
  private createAudioElement(): HTMLAudioElement {
    const el = document.createElement('audio');
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.muted = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  async setSinkId(id: string | null): Promise<boolean> {
    // Non-standard API; ignore if missing
    const anyEl = this.sinkEl as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
    if (!id || typeof anyEl.setSinkId !== 'function') return false;
    try {
      await anyEl.setSinkId(id);
      return true;
    } catch (e) {
      console.warn('setSinkId failed:', e);
      return false;
    }
  }

  /**
   * Load and decode EUPH format file
   */
  private async loadEuphFile(file: File): Promise<boolean> {
    try {
      console.log('[EUPH] Starting EUPH file decode:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new EUPHDecoder();

      const decoded = await decoder.decodeArrayBuffer(arrayBuffer, {
        validateIntegrity: true,
        loadAIData: true,
        loadDSPSettings: true,
        audioContext: this.ctx
      });

      console.log('[EUPH] Decode complete:', {
        duration: decoded.metadata.duration,
        sampleRate: decoded.metadata.sampleRate,
        channels: decoded.metadata.channels,
        integrity: decoded.integrity
      });

      // Create WAV blob from AudioBuffer
      const wavBlob = this.audioBufferToWav(decoded.audioBuffer);
      const audioUrl = URL.createObjectURL(wavBlob);

      // Apply DSP settings if present
      if (decoded.dspSettings) {
        console.log('[EUPH] Applying DSP settings:', decoded.dspSettings);
        this.applyDspSettings(decoded.dspSettings);
      }

      // Store AI data for future processing
      if (decoded.aiData) {
        console.log('[EUPH] AI enhancement data found:', decoded.aiData);
        // TODO: Apply AI enhancements when AI pipeline is ready
      }

      // Prepare ReplayGain data from metadata
      const replayGain = decoded.metadata.enhancementData?.aiProcessed ? {
        trackGain: 0,
        trackPeak: 1.0,
        albumGain: undefined,
        albumPeak: undefined
      } : undefined;

      // Clean up previous URL
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
      }
      this.objectUrl = audioUrl;

      // Load audio normally
      return await this.loadUrl(audioUrl, replayGain);
    } catch (error) {
      console.error('[EUPH] Failed to load EUPH file:', error);
      return false;
    }
  }

  /**
   * Convert AudioBuffer to WAV Blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // Write WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data (interleaved)
    let offset = 44;
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(buffer.getChannelData(ch));
    }
    
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Apply DSP settings from EUPH file or configuration
   */
  applyDspSettings(settings: string | object): void {
    try {
      const config: DSPChainConfig = typeof settings === 'string' 
        ? DspSettingsManager.deserialize(settings)
        : settings as DSPChainConfig;
      
      console.log('[DSP] Applying DSP chain config:', config);
      
      // Apply global settings if available
      if (config.globalSettings) {
        const gs = config.globalSettings;
        
        if (gs.eqTiltDbPerDecade !== undefined) {
          this.chain.controls.setEQ({
            low: gs.eqTiltDbPerDecade,
            mid: 0,
            high: -gs.eqTiltDbPerDecade
          });
        }
        
        if (gs.stereoWidth !== undefined) {
          this.chain.controls.setStereoWidth(gs.stereoWidth);
        }
        
        if (gs.targetLUFS !== undefined) {
          this.targetLUFS = gs.targetLUFS;
        }
      }
      
      // TODO: Import and apply modular DSP modules when ModularDspChain is ready (Task 2.1)
      // const modules = DspSettingsManager.importSettings(config, this.ctx);
      // modules.forEach(module => this.dspChain.addModule(module));
      
      console.log('[DSP] Settings applied successfully');
    } catch (error) {
      console.error('[DSP] Failed to apply DSP settings:', error);
    }
  }

  /**
   * Export current DSP settings as JSON
   */
  exportDspSettings(): string {
    // Create config with current settings
    const config = DspSettingsManager.exportSettings(
      [], // TODO: Get modules from ModularDspChain when ready (Task 2.1)
      true, // ReplayGain enabled
      0, // ReplayGain preamp
      {
        targetLUFS: this.targetLUFS,
        stereoWidth: 1, // TODO: Get from chain
        monoBelowHz: 120,
        eqTiltDbPerDecade: 0
      }
    );
    
    return DspSettingsManager.serialize(config);
  }

  /**
   * Internal load from URL (used after EUPH decode)
   */
  private async loadUrl(url: string, replayGain?: ReplayGainData): Promise<boolean> {
    try {
      this.sourceEl.src = url;
      
      if (replayGain) {
        this.setReplayGain(replayGain);
      }

      if (!this.sourceNode) {
        this.sourceNode = this.ctx.createMediaElementSource(this.sourceEl);
        this.sourceNode.connect(this.crossfadeGain);
      }

      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('Failed to load audio')); };
        const cleanup = () => {
          this.sourceEl.removeEventListener('loadedmetadata', onLoaded);
          this.sourceEl.removeEventListener('error', onError);
        };
        this.sourceEl.addEventListener('loadedmetadata', onLoaded);
        this.sourceEl.addEventListener('error', onError);
        this.sourceEl.load();
      });

      return true;
    } catch (e) {
      console.error('loadUrl failed:', e);
      return false;
    }
  }

  async load(source: string | File | Blob, replayGain?: ReplayGainData): Promise<boolean> {
    try {
      // Detect EUPH file and use special loader
      if (source instanceof File && source.name.toLowerCase().endsWith('.euph')) {
        console.log('[AutoPlayer] Detected EUPH file, using EUPH decoder');
        return await this.loadEuphFile(source);
      }

      // Stop and cleanup previous
      this.stop();
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }

      // Handle gapless preloading
      if (this.gaplessMode && this.nextSourceEl) {
        // Swap to preloaded track
        if (this.sourceNode) {
          this.sourceNode.disconnect();
        }
        this.sourceEl = this.nextSourceEl;
        this.sourceNode = this.nextSourceNode;
        this.crossfadeGain.gain.value = 1;
        this.nextCrossfadeGain.gain.value = 0;
        this.nextSourceEl = null;
        this.nextSourceNode = null;
      }
      
      let url: string;
      let arrayBuf: ArrayBuffer | null = null;
      
      // Support various formats
      if (source instanceof File || source instanceof Blob) {
        // Check for FLAC/WAV/DSD formats
        if (source instanceof File) {
          const ext = source.name.split('.').pop()?.toLowerCase();
          if (ext === 'flac' || ext === 'dsd' || ext === 'dsf') {
            // Use WebAssembly decoder (placeholder for now)
            console.log(`Loading ${ext.toUpperCase()} file:`, source.name);
          }
        }
        url = URL.createObjectURL(source);
        this.objectUrl = url;
        arrayBuf = await source.arrayBuffer();
      } else {
        url = source;
        try {
          const resp = await fetch(url);
          if (resp.ok) arrayBuf = await resp.arrayBuffer();
        } catch {
          // ignore CORS or network errors
        }
      }

      this.sourceEl.src = url;
      
      // Apply ReplayGain if available
      if (replayGain) {
        this.setReplayGain(replayGain);
      }

      // Create MediaElementSource
      if (!this.sourceNode) {
        this.sourceNode = this.ctx.createMediaElementSource(this.sourceEl);
        this.sourceNode.connect(this.crossfadeGain);
      }

      // Pre-gain: try auto-gain with sweetener if we could decode ahead
      try {
        if (arrayBuf && this.chain.sweetener?.autoGainForBuffer) {
          const decoded = await this.ctx.decodeAudioData(arrayBuf.slice(0));
          const target = this.targetLUFS;
          const res = await this.chain.sweetener.autoGainForBuffer(decoded, target);

          // Auto-tune TechnoPunch plugin mix/intensity using LUFS delta
          const delta = target - (res?.lufs ?? target); // positive if quieter than target
          let intensity = 0.8;
          let mix = 0.2;
          if (delta >= 8) { intensity = 1.0; mix = 0.35; }
          else if (delta >= 4) { intensity = 0.85; mix = 0.25; }
          else if (delta >= 0) { intensity = 0.7; mix = 0.15; }
          else { intensity = 0.5; mix = 0.05; }
          this.chain.controls.setTechnoPunchIntensity?.(intensity);
          this.chain.controls.setTechnoPunchMix?.(mix);
        }
      } catch (e) {
        console.warn('autoGainForBuffer failed:', e);
      }

      // Set source and load
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('Failed to load audio')); };
        const cleanup = () => {
          this.sourceEl.removeEventListener('loadedmetadata', onLoaded);
          this.sourceEl.removeEventListener('error', onError);
        };
        this.sourceEl.addEventListener('loadedmetadata', onLoaded);
        this.sourceEl.addEventListener('error', onError);
        this.sourceEl.load();
      });

      return true;
    } catch (e) {
      console.error('Player load failed:', e);
      return false;
    }
  }

  async play(): Promise<void> {
    // Resume AudioContext if suspended (required by browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Notify other instances to pause (only if broadcast channel exists)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'play', instanceId: this.instanceId });
      } catch (e) {
        console.warn('Failed to broadcast play event:', e);
      }
    }

    await this.sourceEl.play();
    await this.sinkEl.play();
  }
  
  pause(): void {
    this.sourceEl.pause();
    this.sinkEl.pause();
  }

  stop(): void {
    try { this.sourceEl.pause(); } catch {}
    try { this.sourceEl.currentTime = 0; } catch {}
  }
  
  seek(time: number): void {
    const seekTime = Math.max(0, Math.min(this.sourceEl.duration || 0, time));
    if (this.sourceEl.readyState >= 1) {
      this.sourceEl.currentTime = seekTime;
      this.seekTarget = null;
    } else {
      this.seekTarget = seekTime;
    }
  }

  getCurrentTime(): number { return this.sourceEl.currentTime || 0; }
  getDuration(): number { return this.sourceEl.duration || 0; }
  
  setVolume(volume: number): void {
    const gain = Math.max(0, Math.min(1, volume));
    this.replayGainNode.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.01);
  }
  
  applyDspPreferences(prefs: DspPreferences): void {
    // Rebuild chain with new preferences
    this.chain.disconnect();
    this.chain = createAutoChain(this.ctx, prefs);
    this.replayGainNode.disconnect();
    this.replayGainNode.connect(this.chain.input);
    this.chain.output.connect(this.analyzer);
  }
  getSinkElement(): HTMLAudioElement { return this.sinkEl; }
  getSourceElement(): HTMLAudioElement { return this.sourceEl; }
  getContext(): AudioContext { return this.ctx; }

  updateProfile(profile: DeviceProfile): void {
    // Recreate chain settings according to new profile (keep existing chain instance)
    if (profile?.dsp?.stereoWidth !== undefined) this.chain.controls.setStereoWidth(profile.dsp.stereoWidth);
    if (profile?.dsp?.eqTiltDbPerDecade !== undefined) {
      const t = profile.dsp.eqTiltDbPerDecade;
      this.chain.controls.setEQ({ low: t ?? 0, mid: 0, high: -(t ?? 0) });
    }
    if (profile?.dsp?.sweetenerTargetLUFS !== undefined) {
      this.targetLUFS = profile.dsp.sweetenerTargetLUFS;
    }
  }

  private setReplayGain(data: ReplayGainData): void {
    this.currentReplayGain = data;
    const gain = data.trackGain ?? data.albumGain ?? 0;
    const peak = data.trackPeak ?? data.albumPeak ?? 1;
    
    // Apply gain with peak protection
    const linearGain = Math.pow(10, gain / 20);
    const safeGain = Math.min(linearGain, 1 / peak);
    
    this.replayGainNode.gain.setTargetAtTime(safeGain, this.ctx.currentTime, 0.01);
  }

  dispose(): void {
    try { this.stop(); } catch {}
    try { this.chain.disconnect(); } catch {}
    try { this.analyzer.disconnect(); } catch {}
    try { this.dest.disconnect(); } catch {}
    try { this.sourceNode?.disconnect(); } catch {}
    try { if (this.objectUrl) URL.revokeObjectURL(this.objectUrl); } catch {}
    try { this.sourceEl.remove(); } catch {}
    try { this.sinkEl.remove(); } catch {}
    try { this.broadcastChannel?.close(); } catch {}
  }
}

function createAutoChainPlaceholder() {
  // Minimal placeholder for initial state
  return {
    input: null as any,
    output: null as any,
    analyser: null as any,
    controls: {
      setEQ: () => {},
      setStereoWidth: () => {},
      setCompressor: () => {},
      setGain: () => {},
      toggleBypass: () => {},
      isBypassed: () => false,
    },
    sweetener: null,
    disconnect: () => {},
  } as any as AutoChain;
}
