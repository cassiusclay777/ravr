import { AudioContextType } from '../audioTypes';
import { DSPModule, DSPModuleDescriptor, DSPModuleType } from '../types';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export class TDRNovaModule implements DSPModule {
  public readonly id: string;
  public readonly type: DSPModuleType = 'tdr-nova';
  public readonly name: string = 'TDR Nova';
  public enabled: boolean = true;

  private context: AudioContextType;
  private input: GainNode;
  private output: GainNode;
  private eqNode: BiquadFilterNode[] = [];

  constructor(context: AudioContextType, id: string) {
    this.context = context;
    this.id = id;

    // Create input/output nodes
    this.input = context.createGain();
    this.output = context.createGain();

    // Setup the EQ bands based on the provided settings
    this.setupEQBands();
  }

  private setupEQBands() {
    // Band 1: Low Shelf at 38Hz
    const band1 = this.context.createBiquadFilter();
    band1.type = 'lowshelf';
    band1.frequency.value = 38;
    band1.gain.value = 3.5;
    band1.Q.value = 0.7;

    // Band 2: Bell at 95Hz
    const band2 = this.context.createBiquadFilter();
    band2.type = 'peaking';
    band2.frequency.value = 95;
    band2.gain.value = 2.0;
    band2.Q.value = 1.0;

    // Band 3: High Shelf at 350Hz
    const band3 = this.context.createBiquadFilter();
    band3.type = 'highshelf';
    band3.frequency.value = 350;
    band3.gain.value = -1.5;
    band3.Q.value = 1.2;

    // Band 4: High Shelf at 9500Hz
    const band4 = this.context.createBiquadFilter();
    band4.type = 'highshelf';
    band4.frequency.value = 9500;
    band4.gain.value = 3.0;
    band4.Q.value = 0.7;

    // Connect the EQ chain
    this.eqNode = [band1, band2, band3, band4];

    // Connect input to EQ chain
    let currentNode: AudioNode = this.input;
    this.eqNode.forEach((band) => {
      currentNode.connect(band);
      currentNode = band;
    });

    // Connect last EQ band to output
    currentNode.connect(this.output);
  }

  public connect(node: AudioNode): AudioNode {
    if (this.enabled) {
      this.output.disconnect();
      return this.output.connect(node);
    } else {
      // If disabled, connect input directly to the node
      this.output.disconnect();
      return this.input.connect(node);
    }
  }

  public disconnect(): void {
    this.input.disconnect();
    this.output.disconnect();
  }

  public getInput(): AudioNode {
    return this.input;
  }

  public getOutput(): AudioNode {
    return this.output;
  }

  public dispose(): void {
    this.disconnect();
    // Clean up any resources
    this.eqNode = [];
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public updateParams(params: Record<string, any>): void {
    // Update parameters if needed
  }

  public getParams(): Record<string, any> {
    return {
      // Band 1 (Low Shelf)
      bandActive_1: 'On',
      bandGain_1: 3.5,
      bandQ_1: 0.7,
      bandFreq_1: 38,
      bandType_1: 'Low S',

      // Band 2 (Bell)
      bandActive_2: 'On',
      bandGain_2: 2.0,
      bandQ_2: 1.0,
      bandFreq_2: 95,
      bandType_2: 'Bell',

      // Band 3 (High Shelf)
      bandActive_3: 'On',
      bandGain_3: -1.5,
      bandQ_3: 1.2,
      bandFreq_3: 350,
      bandType_3: 'High S',

      // Band 4 (High Shelf)
      bandActive_4: 'On',
      bandGain_4: 3.0,
      bandQ_4: 0.7,
      bandFreq_4: 9500,
      bandType_4: 'High S',

      // Global settings
      bypass_master: 'Off',
      delta_master: 'Off',
      dryMix_master: 0.0,
      gain_master: 0.0,
      eqAutoGainParam: 'On',
      qualityParam: 'Precise',
      channelsParam: 'Stereo',
      analyzerModeParam: 'Analyzer: In',
      displayEqRangeParam: '-/+ 12 dB',
      displayFFTRangeParam: '48 dB',
      sidechainModeParam: 'Int SC',
      analyzerSpeedParam: 'Normal',
      solo: 'Off',
    };
  }
}

// Create a descriptor for the module registry
export const TDRNovaDescriptor: DSPModuleDescriptor = {
  type: 'tdr-nova',
  name: 'TDR Nova',
  defaultParams: {},
  create: (context: AudioContextType, id: string) => new TDRNovaModule(context, id),
};

// Module registration is handled by ModuleRegistry's built-in registration
