// Using built-in Web Audio API types

import { DSPControls } from '../hooks/useAudioPlayer';
import type { DeviceProfile } from '../utils/profiles';

type AudioContextType = AudioContext | OfflineAudioContext;

export interface EQSettings {
  low?: number; // -12 to +12 dB
  mid?: number; // -12 to +12 dB
  high?: number; // -12 to +12 dB
}

export interface CompressorSettings {
  threshold?: number; // -60 to 0 dB
  ratio?: number; // 1 to 20
  attack?: number; // 0.001 to 1 second
  release?: number; // 0.001 to 1 second
  knee?: number; // 0 to 40 dB
  makeupGain?: number; // 0 to 20 dB
}

export interface StereoWidenSettings {
  width?: number; // 0 to 1 (narrow to wide)
  delayTime?: number; // 0.0001 to 0.01 seconds
}

export interface GainSettings {
  input?: number; // -24 to +24 dB
  output?: number; // -24 to +24 dB
}

export class HybridDSPModule {
  private readonly context: AudioContextType;
  private readonly input: GainNode;
  private readonly output: GainNode;

  // EQ Nodes
  private readonly eqLow: BiquadFilterNode;
  private readonly eqMid: BiquadFilterNode;
  private readonly eqHigh: BiquadFilterNode;

  // Stereo Widening Nodes
  private readonly splitter: ChannelSplitterNode;
  private readonly merger: ChannelMergerNode;
  private readonly leftDelay: DelayNode;
  private readonly rightDelay: DelayNode;
  private readonly leftGain: GainNode;
  private readonly rightGain: GainNode;
  private width: number;

  // Compressor/Limiter Node
  private readonly compressor: DynamicsCompressorNode;
  private readonly makeupGain: GainNode;

  // Gain Nodes
  private readonly inputGain: GainNode;
  private readonly outputGain: GainNode;

  constructor(context: AudioContextType) {
    this.context = context;
    this.width = 1.0; // Default full stereo width for better quality

    // Create input/output nodes
    this.input = context.createGain();
    this.output = context.createGain();

    // Create EQ nodes (3-band: low, mid, high) with audiophile frequencies
    this.eqLow = this.createEQNode(80, 'lowshelf');
    this.eqMid = this.createEQNode(2500, 'peaking');
    this.eqHigh = this.createEQNode(8000, 'highshelf');

    // Create stereo widening nodes
    this.splitter = context.createChannelSplitter(2);
    this.merger = context.createChannelMerger(2);
    this.leftDelay = context.createDelay(0.01);
    this.rightDelay = context.createDelay(0.01);
    this.leftGain = context.createGain();
    this.rightGain = context.createGain();

    // Create compressor/limiter with audiophile settings
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.001;
    this.compressor.release.value = 0.1;
    this.compressor.knee.value = 6;

    // Create makeup gain for compressor
    this.makeupGain = context.createGain();
    this.makeupGain.gain.value = 1.0;

    // Create input/output gain nodes
    this.inputGain = context.createGain();
    this.outputGain = context.createGain();

    // Set audiophile default values
    this.setEQ({ low: 0, mid: 0, high: 0 });
    this.setStereoWidth(1.0);
    this.setGain({ input: 0, output: 0 });

    // Connect all nodes in the signal chain
    this.connectNodes();
  }

  private createEQNode(frequency: number, type: BiquadFilterType): BiquadFilterNode {
    const node = this.context.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.Q.value = type === 'peaking' ? 1.0 : 0.7;
    node.gain.value = 0;
    return node;
  }

  private connectNodes(): void {
    // Input -> Input Gain -> EQ Chain -> Stereo Processing -> Compressor -> Output Gain -> Output
    this.input.connect(this.inputGain);

    // EQ Chain
    this.inputGain.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);

    // Stereo Processing
    this.eqHigh.connect(this.splitter);

    // Connect splitter to stereo processing
    this.splitter.connect(this.leftGain, 0);
    this.splitter.connect(this.rightGain, 1);

    // Cross-channel mixing for stereo width
    this.splitter.connect(this.leftDelay, 0);
    this.splitter.connect(this.rightDelay, 1);

    // Connect to merger with cross-mixing based on width
    this.leftGain.connect(this.merger, 0, 0);
    this.rightGain.connect(this.merger, 0, 1);
    this.leftDelay.connect(this.merger, 0, 1); // Cross to right channel
    this.rightDelay.connect(this.merger, 0, 0); // Cross to left channel

    // Connect to compressor and output
    this.merger.connect(this.compressor);
    this.compressor.connect(this.makeupGain);
    this.makeupGain.connect(this.outputGain);
    this.outputGain.connect(this.output);

    // Update stereo width connections
    this.updateStereoWidth();
  }

  private updateStereoWidth(): void {
    // Calculate gains based on width (0 = mono, 1 = full stereo)
    const width = Math.max(0, Math.min(1, this.width));
    const midGain = 1 - width * 0.5;

    // Apply gains with smoothing
    const now = this.context.currentTime;
    this.leftGain.gain.setTargetAtTime(midGain, now, 0.01);
    this.rightGain.gain.setTargetAtTime(midGain, now, 0.01);

    // Set delay times (small delay for stereo enhancement)
    this.leftDelay.delayTime.setValueAtTime(0.0001 + (1 - width) * 0.002, now);
    this.rightDelay.delayTime.setValueAtTime(0.0001 + (1 - width) * 0.002, now);
  }

  // Public Methods

  /**
   * Connect this DSP module to an AudioNode or AudioParam
   */
  connect(destinationNode: AudioNode, output?: number, input?: number): AudioNode;
  connect(destinationNode: AudioNode, output?: number): AudioNode;
  connect(destinationParam: AudioParam, output?: number): void;
  connect(destination: AudioNode | AudioParam, output?: number, input?: number): AudioNode | void {
    if (!destination) {
      return this.output;
    }

    if (destination instanceof AudioNode) {
      if (output !== undefined && input !== undefined) {
        return this.output.connect(destination, output, input);
      } else if (output !== undefined) {
        return this.output.connect(destination, output);
      } else {
        return this.output.connect(destination);
      }
    } else {
      // For AudioParam
      if (output !== undefined) {
        this.output.connect(destination, output);
      } else {
        this.output.connect(destination);
      }
    }
  }

  /**
   * Disconnect this DSP module from any connected nodes
{{ ... }}
  disconnect(): void;
  disconnect(output: number): void;
  disconnect(destinationNode: AudioNode): void;
  disconnect(destinationNode: AudioNode, output: number): void;
  disconnect(destinationNode: AudioNode, output: number, input: number): void;
  disconnect(destinationParam: AudioParam): void;
  disconnect(destinationParam: AudioParam, output: number): void;
  disconnect(destination?: AudioNode | AudioParam | number, output?: number, input?: number): void {
    if (destination === undefined) {
      this.output.disconnect();
    } else if (typeof destination === 'number') {
      this.output.disconnect(destination);
    } else if (destination instanceof AudioNode) {
      if (output !== undefined) {
        if (input !== undefined) {
          this.output.disconnect(destination, output, input);
        } else {
          this.output.disconnect(destination, output);
        }
      } else {
        this.output.disconnect(destination);
      }
    } else if (destination instanceof AudioParam) {
      if (output !== undefined) {
        this.output.disconnect(destination, output);
      } else {
        this.output.disconnect(destination);
      }
    }
  }

  /**
   * Set the equalizer settings
   */
  setEQ(settings: EQSettings): void {
    const now = this.context.currentTime;

    if (settings.low !== undefined) {
      this.eqLow.gain.setTargetAtTime(settings.low, now, 0.03);
    }

    if (settings.mid !== undefined) {
      this.eqMid.gain.setTargetAtTime(settings.mid, now, 0.03);
    }

    if (settings.high !== undefined) {
      this.eqHigh.gain.setTargetAtTime(settings.high, now, 0.03);
    }
  }

  /**
   * Set the stereo width (0 = mono, 1 = full stereo)
   */
  setStereoWidth(width: number): void {
    this.width = Math.max(0, Math.min(1, width));
    this.updateStereoWidth();
  }

  /**
   * Set the compressor/limiter settings
   */
  setCompressor(settings: CompressorSettings): void {
    const now = this.context.currentTime;

    if (settings.threshold !== undefined) {
      this.compressor.threshold.setTargetAtTime(
        Math.max(-60, Math.min(0, settings.threshold)),
        now,
        0.01,
      );
    }

    if (settings.ratio !== undefined) {
      this.compressor.ratio.setTargetAtTime(Math.max(1, Math.min(20, settings.ratio)), now, 0.01);
    }

    if (settings.attack !== undefined) {
      this.compressor.attack.setTargetAtTime(
        Math.max(0.001, Math.min(1, settings.attack)),
        now,
        0.01,
      );
    }

    if (settings.release !== undefined) {
      this.compressor.release.setTargetAtTime(
        Math.max(0.001, Math.min(1, settings.release)),
        now,
        0.01,
      );
    }

    if (settings.knee !== undefined) {
      this.compressor.knee.setTargetAtTime(Math.max(0, Math.min(40, settings.knee)), now, 0.01);
    }

    if (settings.makeupGain !== undefined) {
      const gain = Math.pow(10, Math.max(0, Math.min(20, settings.makeupGain)) / 20);
      this.makeupGain.gain.setTargetAtTime(gain, now, 0.01);
    }
  }

  /**
   * Set input and output gain levels (in dB)
   */
  setGain(settings: GainSettings): void {
    const now = this.context.currentTime;

    if (settings.input !== undefined) {
      const gain = Math.pow(10, Math.max(-24, Math.min(24, settings.input)) / 20);
      this.inputGain.gain.setTargetAtTime(gain, now, 0.03);
    }

    if (settings.output !== undefined) {
      const gain = Math.pow(10, Math.max(-24, Math.min(24, settings.output)) / 20);
      this.outputGain.gain.setTargetAtTime(gain, now, 0.03);
    }
  }

  /**
   * Get the input node for connecting to this DSP module
   */
  getInput(): AudioNode {
    return this.input;
  }

  /**
   * Get the output node for connecting from this DSP module
   */
  getOutput(): AudioNode {
    return this.output;
  }

  /**
   * Bypass the DSP processing (input directly to output)
   */
  setBypass(bypass: boolean): void {
    // First disconnect all current connections
    this.input.disconnect();

    if (bypass) {
      // Connect input directly to output, bypassing all processing
      this.input.connect(this.output);
    } else {
      // Reconnect the full DSP chain
      this.connectNodes();
    }
  }
}

export interface AudioPlayerReturn {
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
