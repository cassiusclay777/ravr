import { DSPModuleType } from '../types/dsp';
import { BaseDSPModule } from './BaseDSPModule';

export interface LimiterSettings {
  threshold: number; // in dB
  release: number; // in seconds
  lookahead: number; // in seconds
  bypass: boolean;
}

export class LimiterModule extends BaseDSPModule<LimiterSettings> {
  private compressorNode!: DynamicsCompressorNode;
  private lookaheadDelay: DelayNode | null = null;
  private inputGainNode!: GainNode;
  private outputGainNode!: GainNode;
  private analyserNode: AnalyserNode | null = null;
  private isStereo: boolean;
  private lookaheadTime: number = 0.003; // 3ms lookahead by default

  constructor(
    context: AudioContext | OfflineAudioContext,
    id: string,
    name: string,
    isStereo: boolean = true,
    settings: Partial<LimiterSettings> = {},
    bypass: boolean = false,
  ) {
    const defaultSettings: LimiterSettings = {
      threshold: -1.0, // -1 dBFS threshold
      release: 0.1, // 100ms release
      lookahead: 0.003, // 3ms lookahead
      bypass: false,
    };

    super(context, id, name, { ...defaultSettings, ...settings }, !bypass);

    this.isStereo = isStereo;
    this.lookaheadTime = this.settings.lookahead || 0.003;
  }

  public get type(): DSPModuleType {
    return 'limiter';
  }

  protected initializeNodes(): void {
    // Create input gain
    this.inputGainNode = this.context.createGain();
    this.outputGainNode = this.context.createGain();

    // Create compressor node with limiter settings
    this.compressorNode = this.context.createDynamicsCompressor();
    this.updateCompressorSettings();

    // Set up signal flow
    if (this.isStereo) {
      this.setupStereoNodes();
    } else {
      this.setupMonoNodes();
    }

    // Set initial gain reduction
    this.updateGainReduction();
  }

  private setupStereoNodes(): void {
    // Create delay for lookahead on the detection path
    const lookaheadDelay = this.context.createDelay(this.lookaheadTime);
    lookaheadDelay.delayTime.value = this.lookaheadTime;
    this.lookaheadDelay = lookaheadDelay;

    // Create analyser for metering
    const analyser = this.context.createAnalyser();
    analyser.fftSize = 2048;
    this.analyserNode = analyser;

    // Connect input to lookahead delay and analyser
    this.inputNode = this.inputGainNode;
    this.inputGainNode.connect(lookaheadDelay);
    this.inputGainNode.connect(analyser);

    // Connect lookahead delay to compressor
    lookaheadDelay.connect(this.compressorNode);

    // Connect compressor to output gain
    this.compressorNode.connect(this.outputGainNode);

    // Set output node
    this.outputNode = this.outputGainNode;
  }

  private setupMonoNodes(): void {
    // For mono, we still use the same structure but without channel splitting
    const lookaheadDelay = this.context.createDelay(this.lookaheadTime);
    lookaheadDelay.delayTime.value = this.lookaheadTime;
    this.lookaheadDelay = lookaheadDelay;

    const analyser = this.context.createAnalyser();
    analyser.fftSize = 2048;
    this.analyserNode = analyser;

    this.inputNode = this.inputGainNode;
    this.inputGainNode.connect(lookaheadDelay);
    this.inputGainNode.connect(analyser);
    lookaheadDelay.connect(this.compressorNode);
    this.compressorNode.connect(this.outputGainNode);
    this.outputNode = this.outputGainNode;
  }

  private updateCompressorSettings(): void {
    if (!this.compressorNode) return;

    // Hard-coded limiter settings
    this.compressorNode.threshold.value = this.settings.threshold;
    this.compressorNode.ratio.value = 20.0; // High ratio for limiting
    this.compressorNode.attack.value = 0.001; // Very fast attack
    this.compressorNode.release.value = this.settings.release;
    this.compressorNode.knee.value = 0; // Hard knee for limiting
  }

  private updateGainReduction(): void {
    if (!this.compressorNode) return;

    // The actual gain reduction is handled by the compressor
    // This method is a placeholder for any additional gain control
  }

  public getReduction(): number {
    return this.compressorNode?.reduction || 0;
  }

  public getMeteringData(): {
    reduction: number;
    inputLevel: number;
    outputLevel: number;
  } {
    if (!this.analyserNode || !this.compressorNode) {
      return { reduction: 0, inputLevel: -Infinity, outputLevel: -Infinity };
    }

    const array = new Float32Array(this.analyserNode.fftSize);
    this.analyserNode.getFloatTimeDomainData(array);

    // Calculate RMS of input
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
      sum += array[i] * array[i];
    }
    const rms = Math.sqrt(sum / array.length);
    const inputDb = 20 * Math.log10(Math.max(0.0001, rms));

    // Output level is input level minus reduction
    const reduction = this.compressorNode.reduction;
    const outputDb = Math.max(-60, inputDb - Math.max(0, reduction));

    return {
      reduction: reduction,
      inputLevel: inputDb,
      outputLevel: outputDb,
    };
  }

  protected onSettingsChanged(): void {
    if (this.compressorNode) {
      this.updateCompressorSettings();
    }

    if (this.lookaheadDelay) {
      this.lookaheadTime = this.settings.lookahead || 0.003;
      this.lookaheadDelay.delayTime.setValueAtTime(this.lookaheadTime, this.context.currentTime);
    }
  }

  protected onEnabledChanged(): void {
    // When disabled, bypass the limiter by setting appropriate gains
    if (this.inputGainNode && this.outputGainNode) {
      if (this.enabled) {
        this.inputGainNode.gain.value = 1.0;
        this.outputGainNode.gain.value = 1.0;
      } else {
        // When bypassed, adjust gain to compensate for any level changes
        const reduction = this.getReduction();
        const makeUpGain = Math.max(0, reduction) * 0.5; // Apply half the reduction as make-up
        this.inputGainNode.gain.value = Math.pow(10, makeUpGain / 20);
        this.outputGainNode.gain.value = 1.0;
      }
    }
  }

  protected onDispose(): void {
    const nodes = [
      this.compressorNode,
      this.lookaheadDelay,
      this.inputGainNode,
      this.outputGainNode,
      this.analyserNode,
    ];

    nodes.forEach((node) => {
      if (node) {
        try {
          node.disconnect();
        } catch (e) {
          console.warn('Error disconnecting node:', e);
        }
      }
    });

    this.compressorNode = null!;
    this.lookaheadDelay = null;
    this.inputGainNode = null!;
    this.outputGainNode = null!;
    this.analyserNode = null;
  }
}
