/**
 * Base DSP Node Interface
 *
 * All DSP effects must implement this interface.
 * Inspired by foobar2000's DSP chain architecture.
 */

export interface IDspNode {
  /**
   * Unique node identifier
   */
  readonly id: string;

  /**
   * Node type (e.g., 'equalizer', 'compressor', 'limiter')
   */
  readonly type: DspNodeType;

  /**
   * Display name
   */
  readonly name: string;

  /**
   * Is node currently enabled
   */
  enabled: boolean;

  /**
   * Process audio buffer
   * @param input - Input audio buffer (interleaved or planar)
   * @param output - Output audio buffer
   * @param channels - Number of channels
   * @param sampleRate - Sample rate
   * @returns Processed buffer
   */
  process(
    input: Float32Array,
    output: Float32Array,
    channels: number,
    sampleRate: number
  ): Float32Array;

  /**
   * Initialize node with audio context
   * @param sampleRate - Sample rate
   * @param maxChannels - Maximum number of channels
   */
  initialize(sampleRate: number, maxChannels: number): void;

  /**
   * Reset node state (clear buffers, reset filters)
   */
  reset(): void;

  /**
   * Get node parameters
   */
  getParameters(): DspParameters;

  /**
   * Set node parameters
   */
  setParameters(params: Partial<DspParameters>): void;

  /**
   * Get parameter schema (for UI generation)
   */
  getParameterSchema(): DspParameterSchema[];

  /**
   * Clone this node with same settings
   */
  clone(): IDspNode;

  /**
   * Serialize node configuration
   */
  serialize(): DspNodeConfig;

  /**
   * Deserialize and apply configuration
   */
  deserialize(config: DspNodeConfig): void;

  /**
   * Get CPU usage estimate (0.0 - 1.0)
   */
  getCpuUsage(): number;

  /**
   * Dispose resources
   */
  dispose(): void;
}

/**
 * DSP Node Types
 */
export type DspNodeType =
  // EQ
  | 'parametric-eq'
  | 'graphic-eq'
  | 'low-shelf'
  | 'high-shelf'
  | 'peak'
  | 'notch'
  // Dynamics
  | 'compressor'
  | 'limiter'
  | 'gate'
  | 'expander'
  | 'multiband-compressor'
  // Spatial
  | 'crossfeed'
  | 'stereo-enhancer'
  | 'reverb'
  | 'delay'
  // Utility
  | 'gain'
  | 'balance'
  | 'mono'
  | 'phase-inverter'
  | 'dithering'
  // Analysis
  | 'analyzer'
  | 'meter'
  // Other
  | 'custom';

/**
 * Base DSP parameters
 */
export interface DspParameters {
  [key: string]: number | boolean | string;
}

/**
 * Parameter schema for UI generation
 */
export interface DspParameterSchema {
  key: string;
  name: string;
  type: 'number' | 'boolean' | 'enum';
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string; // 'dB', 'Hz', 'ms', '%', etc.
  options?: string[]; // For enum type
  description?: string;
}

/**
 * Serialized node configuration
 */
export interface DspNodeConfig {
  id: string;
  type: DspNodeType;
  name: string;
  enabled: boolean;
  parameters: DspParameters;
}

/**
 * Base abstract class for DSP nodes
 */
export abstract class BaseDspNode implements IDspNode {
  constructor(
    public readonly id: string,
    public readonly type: DspNodeType,
    public readonly name: string,
    public enabled: boolean = true
  ) {}

  abstract process(
    input: Float32Array,
    output: Float32Array,
    channels: number,
    sampleRate: number
  ): Float32Array;

  abstract initialize(sampleRate: number, maxChannels: number): void;

  reset(): void {
    // Default: no state to reset
  }

  abstract getParameters(): DspParameters;
  abstract setParameters(params: Partial<DspParameters>): void;
  abstract getParameterSchema(): DspParameterSchema[];

  clone(): IDspNode {
    const config = this.serialize();
    const cloned = Object.create(Object.getPrototypeOf(this));
    cloned.deserialize(config);
    return cloned;
  }

  serialize(): DspNodeConfig {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      enabled: this.enabled,
      parameters: this.getParameters(),
    };
  }

  abstract deserialize(config: DspNodeConfig): void;

  getCpuUsage(): number {
    return 0.01; // Default 1% - override in specific nodes
  }

  dispose(): void {
    // Default: nothing to dispose
  }
}
