import { DSPModule, DSPModuleType } from '../types/dsp';

/**
 * Base class for all DSP modules
 */
export abstract class BaseDSPModule<T extends object> implements DSPModule<T> {
  public readonly id: string;
  public name: string;
  public enabled: boolean;
  public settings: T;
  protected context: AudioContext | OfflineAudioContext;
  protected inputNode!: AudioNode;
  protected outputNode!: AudioNode;
  protected isConnected = false;

  constructor(
    context: AudioContext | OfflineAudioContext,
    id: string,
    name: string,
    defaultSettings: T,
    enabled = true,
  ) {
    this.context = context;
    this.id = id;
    this.name = name;
    this.settings = { ...defaultSettings };
    this.enabled = enabled;
    this.initializeNodes();
  }

  /**
   * Initialize audio nodes for this module
   */
  protected abstract initializeNodes(): void;

  /**
   * Get the module type
   */
  public abstract get type(): DSPModuleType;

  /**
   * Get the input node
   */
  public get input(): AudioNode {
    return this.inputNode;
  }

  /**
   * Get the output node
   */
  public get output(): AudioNode {
    return this.outputNode;
  }

  /**
   * Connect this module to another audio node
   */
  public connect(destination: AudioNode | AudioParam): void {
    if (this.enabled) {
      this.output.connect(destination as any);
      this.isConnected = true;
    }
  }

  /**
   * Disconnect this module from any connected nodes
   */
  public disconnect(): void {
    if (this.isConnected) {
      this.output.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Apply new settings to this module
   */
  public applySettings(settings: Partial<T>): void {
    const wasEnabled = this.enabled;

    // Disconnect before applying settings if needed
    if (wasEnabled) {
      this.disable();
    }

    // Apply new settings
    this.settings = { ...this.settings, ...settings };
    this.onSettingsChanged();

    // Re-enable if it was enabled before
    if (wasEnabled) {
      this.enable();
    }
  }

  /**
   * Called when settings are updated
   */
  protected abstract onSettingsChanged(): void;

  /**
   * Enable this module
   */
  public enable(): void {
    if (!this.enabled) {
      this.enabled = true;
      this.onEnabledChanged();
    }
  }

  /**
   * Disable this module
   */
  public disable(): void {
    if (this.enabled) {
      this.enabled = false;
      this.onEnabledChanged();
    }
  }

  /**
   * Toggle the enabled state of this module
   */
  public toggle(): void {
    this.enabled ? this.disable() : this.enable();
  }

  /**
   * Called when the enabled state changes
   */
  protected onEnabledChanged(): void {
    // Can be overridden by subclasses
  }

  /**
   * Reset this module to its default state
   */
  public reset(): void {
    this.disable();
    this.onReset();
  }

  /**
   * Called when the module is reset
   */
  protected onReset(): void {
    // Can be overridden by subclasses
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.disable();
    this.onDispose();
  }

  /**
   * Called when the module is disposed
   */
  protected onDispose(): void {
    // Can be overridden by subclasses
  }
}
