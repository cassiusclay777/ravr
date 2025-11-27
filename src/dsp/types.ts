import { AudioContextType } from './audioTypes';

export type DSPModuleType = 'eq' | 'compressor' | 'reverb' | 'delay' | 'distortion' | 'filter' | 'tdr-nova';

export interface DSPModuleConfig {
  id: string;
  type: DSPModuleType;
  name: string;
  enabled: boolean;
  params: Record<string, any>;
}

/**
 * Base interface for all DSP modules
 */
export interface DSPModule {
  setEnabled(enabled: boolean): unknown;
  /**
   * Unique identifier for the module
   */
  readonly id: string;

  /**
   * Type of the module
   */
  readonly type: DSPModuleType;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Connect this module to an AudioNode
   */
  connect(node: AudioNode): AudioNode;

  /**
   * Disconnect all connections
   */
  disconnect(): void;

  /**
   * Update module parameters
   */
  updateParams(params: Record<string, any>): void;

  /**
   * Get current parameter values
   */
  getParams(): Record<string, any>;

  /**
   * Get the input node
   */
  getInput(): AudioNode;

  /**
   * Get the output node
   */
  getOutput(): AudioNode;

  /**
   * Clean up resources
   */
  dispose(): void;
}

export interface DSPModuleDescriptor {
  /**
   * Unique identifier for the module type
   */
  type: DSPModuleType;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Default parameters
   */
  defaultParams: Record<string, any>;

  /**
   * Factory function to create an instance
   */
  create(context: AudioContextType, id: string, params?: Record<string, any>): DSPModule;

  /**
   * UI component for editing parameters (optional)
   */
  // UIComponent?: React.ComponentType<DSPModuleUIProps>;
}

export interface DSPModuleUIProps {
  module: DSPModule;
  onParamChange: (param: string, value: any) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export interface DspPreferences {
  sweetenerTargetLUFS: number;
  limiter: { threshold: number; release: number; ratio: number };
  eqTiltDbPerDecade: number;
  monoBelowHz: number;
  stereoWidth: number;
}
