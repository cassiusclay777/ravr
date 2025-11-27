import { ConvolverNode, IAudioNode, IAudioContext, IGainNode } from 'standardized-audio-context';
import { BaseDSPModule } from './BaseDSPModule';
import { ReverbSettings, DSPModuleType } from '../types/dsp';

interface ReverbModuleSettings extends ReverbSettings {
  impulseResponseUrl?: string;
  impulseResponse?: Float32Array[];
  sampleRate?: number;
}

export class ReverbModule extends BaseDSPModule<ReverbModuleSettings> {
  private convolverNode: ConvolverNode<AudioContext> | null = null;
  private dryGainNode: IGainNode<AudioContext>;
  private wetGainNode: IGainNode<AudioContext>;
  private mergerNode: ChannelMergerNode | null = null;
  private splitterNode: ChannelSplitterNode | null = null;
  private isStereo: boolean;
  private isInitialized = false;

  constructor(
    context: IAudioContext,
    id: string,
    name: string,
    isStereo: boolean = true,
    settings: Partial<ReverbModuleSettings> = {},
    bypass: boolean = false
  ) {
    const defaultSettings: ReverbModuleSettings = {
      decay: 2.5,
      preDelay: 0.03,
      wet: 0.3,
      bypass: false,
      impulseResponseUrl: '',
      impulseResponse: undefined,
      sampleRate: context.sampleRate
    };

    super(
      context,
      id,
      name,
      { ...defaultSettings, ...settings },
      !bypass
    );

    this.isStereo = isStereo;
  }

  public get type(): DSPModuleType {
    return 'reverb';
  }

  protected async initializeNodes(): Promise<void> {
    // Create gain nodes for dry/wet mix
    this.dryGainNode = this.context.createGain();
    this.wetGainNode = this.context.createGain();

    // Set initial gain values
    this.updateGainNodes();

    if (this.isStereo) {
      this.setupStereoNodes();
    } else {
      this.setupMonoNodes();
    }

    // Load impulse response if URL is provided
    if (this.settings.impulseResponseUrl) {
      await this.loadImpulseResponse(this.settings.impulseResponseUrl);
    } else if (this.settings.impulseResponse) {
      await this.setImpulseResponse(this.settings.impulseResponse);
    } else {
      // Generate a simple impulse response if none provided
      await this.generateImpulseResponse();
    }

    this.isInitialized = true;
  }

  private setupStereoNodes(): void {
    this.splitterNode = this.context.createChannelSplitter(2);
    this.mergerNode = this.context.createChannelMerger(2);

    // Connect dry signal (direct path)
    this.splitterNode.connect(this.dryGainNode, 0, 0);
    this.dryGainNode.connect(this.mergerNode as any, 0, 0);
    this.dryGainNode.connect(this.mergerNode as any, 0, 1);

    // Connect wet signal (reverb path)
    if (this.convolverNode) {
      this.splitterNode.connect(this.convolverNode as any, 0);
      this.convolverNode.connect(this.wetGainNode as any);
      this.wetGainNode.connect(this.mergerNode as any, 0, 0);
      this.wetGainNode.connect(this.mergerNode as any, 0, 1);
    }

    this.inputNode = this.splitterNode as unknown as IAudioNode<AudioContext>;
    this.outputNode = this.mergerNode as unknown as IAudioNode<AudioContext>;
  }

  private setupMonoNodes(): void {
    // Connect dry signal (direct path)
    this.dryGainNode = this.context.createGain();
    this.wetGainNode = this.context.createGain();

    // Input splits to both dry and wet paths
    this.inputNode = this.context.createGain();
    (this.inputNode as any).connect(this.dryGainNode);
    
    if (this.convolverNode) {
      (this.inputNode as any).connect(this.convolverNode);
      this.convolverNode.connect(this.wetGainNode as any);
    }

    // Merge dry and wet signals
    const merger = this.context.createChannelMerger(1);
    this.dryGainNode.connect(merger as any, 0, 0);
    this.wetGainNode.connect(merger as any, 0, 0);
    
    this.outputNode = merger as unknown as IAudioNode<AudioContext>;
  }

  private updateGainNodes(): void {
    if (!this.dryGainNode || !this.wetGainNode) return;
    
    const wet = this.enabled ? this.settings.wet : 0;
    const dry = 1 - wet;
    
    this.dryGainNode.gain.setTargetAtTime(dry, this.context.currentTime, 0.01);
    this.wetGainNode.gain.setTargetAtTime(wet, this.context.currentTime, 0.01);
  }

  public async loadImpulseResponse(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      await this.setImpulseResponse(this.bufferToStereo(audioBuffer));
    } catch (error) {
      console.error('Failed to load impulse response:', error);
      throw error;
    }
  }

  public async setImpulseResponse(impulseResponse: Float32Array[]): Promise<void> {
    const sampleRate = this.settings.sampleRate || this.context.sampleRate;
    const audioBuffer = this.createAudioBuffer(impulseResponse, sampleRate);
    
    // Create new convolver node
    const oldConvolver = this.convolverNode;
    this.convolverNode = this.context.createConvolver();
    this.convolverNode.buffer = audioBuffer;
    this.convolverNode.normalize = true;

    // If already initialized, update connections
    if (this.isInitialized) {
      if (oldConvolver) {
        // Disconnect old convolver
        oldConvolver.disconnect();
      }
      
      // Reconnect with new convolver
      if (this.isStereo && this.splitterNode && this.mergerNode) {
        this.splitterNode.connect(this.convolverNode as any, 0);
        this.convolverNode.connect(this.wetGainNode as any);
      } else if (!this.isStereo) {
        (this.inputNode as any).disconnect();
        (this.inputNode as any).connect(this.dryGainNode);
        (this.inputNode as any).connect(this.convolverNode);
        this.convolverNode.connect(this.wetGainNode as any);
      }
    }
  }

  private async generateImpulseResponse(): Promise<void> {
    const sampleRate = this.settings.sampleRate || this.context.sampleRate;
    const length = Math.ceil(sampleRate * this.settings.decay);
    const impulseResponse = [
      this.generateReverbImpulse(length, sampleRate),
      this.generateReverbImpulse(length, sampleRate, 0.8) // Slight difference between channels
    ];
    
    await this.setImpulseResponse(impulseResponse);
  }

  private generateReverbImpulse(length: number, sampleRate: number, channelVariation: number = 1): Float32Array {
    const impulse = new Float32Array(length);
    const decay = 1 - (1 / (this.settings.decay * sampleRate));
    
    // Add initial impulse
    impulse[0] = 1;
    
    // Generate reverb tail
    for (let i = 1; i < length; i++) {
      impulse[i] = (Math.random() * 2 - 1) * Math.pow(decay, i) * channelVariation;
    }
    
    return impulse;
  }

  private bufferToStereo(audioBuffer: AudioBuffer): Float32Array[] {
    const channels: Float32Array[] = [];
    for (let i = 0; i < Math.min(2, audioBuffer.numberOfChannels); i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
    
    // If mono, duplicate to stereo
    if (channels.length === 1) {
      channels.push(new Float32Array(channels[0]));
    }
    
    return channels;
  }

  private createAudioBuffer(channelData: Float32Array[], sampleRate: number): AudioBuffer {
    const audioBuffer = this.context.createBuffer(
      channelData.length,
      channelData[0].length,
      sampleRate
    );
    
    for (let i = 0; i < channelData.length; i++) {
      audioBuffer.getChannelData(i).set(channelData[i]);
    }
    
    return audioBuffer;
  }

  protected onSettingsChanged(): void {
    if (this.isInitialized) {
      this.updateGainNodes();
      
      // Regenerate impulse response if decay changed
      if (this.settings.decay !== undefined) {
        this.generateImpulseResponse();
      }
    }
  }

  protected onEnabledChanged(): void {
    this.updateGainNodes();
  }

  protected onDispose(): void {
    const nodes = [
      this.convolverNode,
      this.dryGainNode,
      this.wetGainNode,
      this.splitterNode,
      this.mergerNode
    ];

    nodes.forEach(node => {
      if (node) {
        try {
          node.disconnect();
        } catch (e) {
          console.warn('Error disconnecting node:', e);
        }
      }
    });

    this.convolverNode = null;
    this.dryGainNode = null!;
    this.wetGainNode = null!;
    this.splitterNode = null;
    this.mergerNode = null;
  }
}
