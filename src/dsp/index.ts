/**
 * DSP Module Exports
 * Central export point for DSP-related modules
 */

// Core DSP Chain
export { ModularDspChain } from './ModularDspChain';
export type { ChainEvent, ChainEventListener } from './ModularDspChain';

// Settings Manager
export { DspSettingsManager } from './DspSettingsManager';
export type { DSPModuleConfig, DSPChainConfig } from './DspSettingsManager';

// Module Registry
export { moduleRegistry, useModuleRegistry } from './ModuleRegistry';
export type { ModuleInfo } from './ModuleRegistry';

// Types
export type { 
  DSPModule, 
  DSPModuleType, 
  DSPModuleDescriptor,
  DSPModuleUIProps,
  DspPreferences 
} from './types';

// Legacy DSP Chain (for backward compatibility)
export { DSPChain } from './dspChain';
