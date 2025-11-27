import { BaseDSPModule } from './BaseDSPModule';
import { CompressorSettings, DSPModuleType } from '../types/dsp';

export class CompressorModule extends BaseDSPModule<CompressorSettings> {
  private compressorNode!: DynamicsCompressorNode;

  constructor(
    context: AudioContext | OfflineAudioContext,
    id: string,
    name: string,
    settings: Partial<CompressorSettings> = {},
    bypass: boolean = false
  ) {
    const defaultSettings: CompressorSettings = {
      threshold: -24,
      ratio: 12,
      attack: 0.003,
      release: 0.25,
      knee: 30,
      bypass: false
    };

    super(
      context,
      id,
      name,
      { ...defaultSettings, ...settings },
      !bypass
    );
  }

  public get type(): DSPModuleType {
    return 'compressor';
  }

  protected initializeNodes(): void {
    this.compressorNode = this.context.createDynamicsCompressor();
    this.updateCompressorNode();
    this.inputNode = this.compressorNode;
    this.outputNode = this.compressorNode;
  }

  protected onSettingsChanged(): void {
    this.updateCompressorNode();
  }

  private updateCompressorNode(): void {
    if (!this.compressorNode) return;

    const { threshold, ratio, attack, release, knee } = this.settings;
    
    this.compressorNode.threshold.value = threshold;
    this.compressorNode.ratio.value = ratio;
    this.compressorNode.attack.value = attack;
    this.compressorNode.release.value = release;
    this.compressorNode.knee.value = knee;
  }

  public get reduction(): number {
    return this.compressorNode?.reduction || 0;
  }

  protected onDispose(): void {
    if (this.compressorNode) {
      try {
        this.compressorNode.disconnect();
      } catch (e) {
        console.warn('Error disconnecting compressor node:', e);
      }
      this.compressorNode = null!;
    }
  }
}
