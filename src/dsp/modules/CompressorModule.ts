import { AudioContextType } from '../audioTypes';
import { DSPModule, DSPModuleDescriptor, DSPModuleType } from '../types';

export class CompressorModule implements DSPModule {
  public readonly id: string;
  public readonly type: DSPModuleType = 'compressor';
  public readonly name: string = 'Compressor';
  
  private context: AudioContextType;
  private input: GainNode;
  private compressor: DynamicsCompressorNode;
  private makeupGain: GainNode;
  private output: GainNode;
  
  private params = {
    threshold: -24,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
    knee: 30,
    makeupGain: 0,
  };

  constructor(context: AudioContextType, id: string, params?: any) {
    this.context = context;
    this.id = id;
    
    // Create nodes
    this.input = context.createGain();
    this.compressor = context.createDynamicsCompressor();
    this.makeupGain = context.createGain();
    this.output = context.createGain();
    
    // Connect nodes
    this.input.connect(this.compressor);
    this.compressor.connect(this.makeupGain);
    this.makeupGain.connect(this.output);
    
    // Apply initial parameters if provided
    if (params) {
      this.updateParams(params);
    } else {
      // Set default values
      this.updateParams(this.params);
    }
  }
  
  public connect(node: AudioNode): AudioNode {
    this.output.connect(node);
    return node;
  }
  
  public disconnect(): void {
    this.output.disconnect();
  }
  
  public updateParams(params: Record<string, any>): void {
    const now = this.context.currentTime;
    
    if (params.threshold !== undefined) {
      this.params.threshold = params.threshold;
      this.compressor.threshold.setTargetAtTime(params.threshold, now, 0.01);
    }
    
    if (params.ratio !== undefined) {
      this.params.ratio = params.ratio;
      this.compressor.ratio.setTargetAtTime(params.ratio, now, 0.01);
    }
    
    if (params.attack !== undefined) {
      this.params.attack = params.attack;
      this.compressor.attack.setTargetAtTime(params.attack, now, 0.01);
    }
    
    if (params.release !== undefined) {
      this.params.release = params.release;
      this.compressor.release.setTargetAtTime(params.release, now, 0.01);
    }
    
    if (params.knee !== undefined) {
      this.params.knee = params.knee;
      this.compressor.knee.setTargetAtTime(params.knee, now, 0.01);
    }
    
    if (params.makeupGain !== undefined) {
      this.params.makeupGain = params.makeupGain;
      // Convert dB to linear gain
      const linearGain = Math.pow(10, params.makeupGain / 20);
      this.makeupGain.gain.setTargetAtTime(linearGain, now, 0.01);
    }
  }
  
  public getParams(): Record<string, any> {
    return { ...this.params };
  }
  
  public getInput(): AudioNode {
    return this.input;
  }
  
  public getOutput(): AudioNode {
    return this.output;
  }
  
  public dispose(): void {
    this.disconnect();
    this.input.disconnect();
    this.compressor.disconnect();
    this.makeupGain.disconnect();
    this.output.disconnect();
  }

  public setEnabled(enabled: boolean): void {
    // When disabled, we can either bypass the compressor or mute the output
    // This implementation mutes the output when disabled
    this.output.gain.value = enabled ? 1 : 0;
  }
}

// Module descriptor
export const CompressorModuleDescriptor: DSPModuleDescriptor = {
  type: 'compressor',
  name: 'Compressor',
  defaultParams: {
    threshold: -24,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
    knee: 30,
    makeupGain: 0,
  },
  create: (context, id, params) => new CompressorModule(context, id, params),
};
