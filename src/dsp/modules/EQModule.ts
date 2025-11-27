import { AudioContextType } from '../audioTypes';
import { DSPModule, DSPModuleDescriptor, DSPModuleType } from '../types';

export class EQModule implements DSPModule {
  public readonly id: string;
  public readonly type: DSPModuleType = 'eq';
  public readonly name: string = 'Equalizer';
  
  private context: AudioContextType;
  private input: GainNode;
  private lowShelf: BiquadFilterNode;
  private peaking: BiquadFilterNode;
  private highShelf: BiquadFilterNode;
  private output: GainNode;
  
  private params = {
    low: 0,
    mid: 0,
    high: 0,
  };

  constructor(context: AudioContextType, id: string, params?: any) {
    this.context = context;
    this.id = id;
    
    // Create nodes
    this.input = context.createGain();
    this.lowShelf = context.createBiquadFilter();
    this.peaking = context.createBiquadFilter();
    this.highShelf = context.createBiquadFilter();
    this.output = context.createGain();
    
    // Configure filters
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 250;
    this.lowShelf.gain.value = 0;
    
    this.peaking.type = 'peaking';
    this.peaking.frequency.value = 1000;
    this.peaking.Q.value = 1.0;
    this.peaking.gain.value = 0;
    
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 4000;
    this.highShelf.gain.value = 0;
    
    // Connect nodes
    this.input.connect(this.lowShelf);
    this.lowShelf.connect(this.peaking);
    this.peaking.connect(this.highShelf);
    this.highShelf.connect(this.output);
    
    // Apply initial parameters if provided
    if (params) {
      this.updateParams(params);
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
    
    if (params.low !== undefined) {
      this.params.low = params.low;
      this.lowShelf.gain.setTargetAtTime(params.low, now, 0.01);
    }
    
    if (params.mid !== undefined) {
      this.params.mid = params.mid;
      this.peaking.gain.setTargetAtTime(params.mid, now, 0.01);
    }
    
    if (params.high !== undefined) {
      this.params.high = params.high;
      this.highShelf.gain.setTargetAtTime(params.high, now, 0.01);
    }
    
    // Update Q and frequencies if needed
    if (params.frequency) {
      if (params.frequency.low !== undefined) {
        this.lowShelf.frequency.setValueAtTime(params.frequency.low, now);
      }
      if (params.frequency.mid !== undefined) {
        this.peaking.frequency.setValueAtTime(params.frequency.mid, now);
      }
      if (params.frequency.high !== undefined) {
        this.highShelf.frequency.setValueAtTime(params.frequency.high, now);
      }
    }
    
    if (params.q !== undefined) {
      this.peaking.Q.setValueAtTime(params.q, now);
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
    this.lowShelf.disconnect();
    this.peaking.disconnect();
    this.highShelf.disconnect();
    this.output.disconnect();
  }

  public setEnabled(enabled: boolean): void {
    // When disabled, we can either bypass the EQ or mute the output
    // This implementation mutes the output when disabled
    this.output.gain.value = enabled ? 1 : 0;
  }
}

// Module descriptor
export const EQModuleDescriptor: DSPModuleDescriptor = {
  type: 'eq',
  name: 'Equalizer',
  defaultParams: {
    low: 0,
    mid: 0,
    high: 0,
    frequency: {
      low: 250,
      mid: 1000,
      high: 4000,
    },
    q: 1.0,
  },
  create: (context, id, params) => new EQModule(context, id, params),
};
