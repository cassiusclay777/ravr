import { BaseDSPModule } from './BaseDSPModule';
import { EQBand, DSPModuleType } from '../types/dsp';

interface EQModuleSettings {
  bands: EQBand[];
  bypass: boolean;
}

export class EQModule extends BaseDSPModule<EQModuleSettings> {
  private filterNodes: BiquadFilterNode[] = [];
  private inputGain!: GainNode;
  private outputGain!: GainNode;
  private isStereo: boolean;

  constructor(
    context: AudioContext | OfflineAudioContext,
    id: string,
    name: string,
    isStereo: boolean = true,
    bands: EQBand[] = [],
    bypass: boolean = false
  ) {
    super(
      context,
      id,
      name,
      {
        bands: bands.length ? bands : EQModule.getDefaultBands(),
        bypass
      },
      !bypass
    );

    this.isStereo = isStereo;
  }

  public get type(): DSPModuleType {
    return 'eq';
  }

  protected initializeNodes(): void {
    this.inputGain = this.context.createGain();
    this.outputGain = this.context.createGain();

    this.rebuildFilterChain();
  }

  private rebuildFilterChain(): void {
    this.disconnectChain();
    this.filterNodes = [];

    let previousNode: AudioNode = this.inputGain;

    if (this.settings.bands.length === 0) {
      previousNode.connect(this.outputGain);
    }

    this.settings.bands.forEach(band => {
      const filter = this.context.createBiquadFilter();
      this.updateFilterNode(filter, band);
      previousNode.connect(filter);
      previousNode = filter;
      this.filterNodes.push(filter);
    });

    if (previousNode !== this.outputGain) {
      previousNode.connect(this.outputGain);
    }

    this.inputNode = this.inputGain;
    this.outputNode = this.outputGain;
  }

  private disconnectChain(): void {
    try {
      this.inputGain?.disconnect();
    } catch (error) {
      console.warn('Error disconnecting EQ input gain node:', error);
    }

    try {
      this.outputGain?.disconnect();
    } catch (error) {
      console.warn('Error disconnecting EQ output gain node:', error);
    }

    this.filterNodes.forEach(node => {
      try {
        node.disconnect();
      } catch (error) {
        console.warn('Error disconnecting EQ filter node:', error);
      }
    });
  }

  protected onSettingsChanged(): void {
    // Update all filter nodes with new settings
    if (this.settings.bands.length !== this.filterNodes.length) {
      this.rebuildFilterChain();
      return;
    }

    this.filterNodes.forEach((filter, index) => {
      this.updateFilterNode(filter, this.settings.bands[index]);
    });
  }

  private updateFilterNode(
    filter: BiquadFilterNode,
    band: EQBand
  ): void {
    filter.type = band.type;
    filter.frequency.value = band.frequency;
    filter.gain.value = band.gain;
    filter.Q.value = band.Q;
  }

  public static getDefaultBands(): EQBand[] {
    return [
      { frequency: 60, gain: 0, Q: 1, type: 'lowshelf' },
      { frequency: 200, gain: 0, Q: 1, type: 'peaking' },
      { frequency: 800, gain: 0, Q: 1, type: 'peaking' },
      { frequency: 2000, gain: 0, Q: 1, type: 'peaking' },
      { frequency: 6000, gain: 0, Q: 1, type: 'peaking' },
      { frequency: 12000, gain: 0, Q: 1, type: 'highshelf' }
    ];
  }

  protected onDispose(): void {
    this.disconnectChain();
    this.filterNodes = [];
  }
}
