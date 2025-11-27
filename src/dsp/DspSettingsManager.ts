/**
 * DSP Settings Manager
 * Handles export/import of DSP chain configurations
 * Used for saving DSP settings to EUPH files and restoring them
 */

import { DSPModule, DSPModuleType } from './types';
import { moduleRegistry } from './ModuleRegistry';
import { AudioContextType } from './audioTypes';

export interface DSPModuleConfig {
  id: string;
  type: DSPModuleType | string;
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface DSPChainConfig {
  version: string;
  modules: DSPModuleConfig[];
  replayGain?: {
    enabled: boolean;
    preamp: number;
  };
  globalSettings?: {
    targetLUFS?: number;
    stereoWidth?: number;
    monoBelowHz?: number;
    eqTiltDbPerDecade?: number;
  };
}

/**
 * Manages DSP chain configuration serialization and deserialization
 */
export class DspSettingsManager {
  private static readonly CURRENT_VERSION = '1.0';

  /**
   * Export current DSP chain configuration to a serializable object
   * @param modules Array of DSP modules to export
   * @param replayGainEnabled Whether ReplayGain is enabled
   * @param replayGainPreamp ReplayGain preamp value in dB
   * @param globalSettings Optional global audio settings
   */
  static exportSettings(
    modules: DSPModule[],
    replayGainEnabled: boolean = true,
    replayGainPreamp: number = 0,
    globalSettings?: DSPChainConfig['globalSettings']
  ): DSPChainConfig {
    return {
      version: this.CURRENT_VERSION,
      modules: modules.map(module => ({
        id: module.id,
        type: module.type,
        enabled: this.isModuleEnabled(module),
        parameters: this.getModuleParameters(module)
      })),
      replayGain: {
        enabled: replayGainEnabled,
        preamp: replayGainPreamp
      },
      globalSettings
    };
  }

  /**
   * Import DSP chain configuration and recreate modules
   * @param config The DSP chain configuration to import
   * @param audioContext The AudioContext to use for creating modules
   * @returns Array of recreated DSP modules
   */
  static importSettings(
    config: DSPChainConfig,
    audioContext: AudioContextType
  ): DSPModule[] {
    const recreatedModules: DSPModule[] = [];

    // Check version compatibility
    if (config.version !== this.CURRENT_VERSION) {
      console.warn(`[DspSettingsManager] Config version ${config.version} may not be fully compatible with current version ${this.CURRENT_VERSION}`);
    }

    for (const moduleConfig of config.modules) {
      try {
        // Try to create module using registry
        const module = moduleRegistry.createModule(
          moduleConfig.type as DSPModuleType,
          audioContext,
          moduleConfig.id
        );

        if (module) {
          // Apply enabled state
          if (typeof (module as any).setEnabled === 'function') {
            (module as any).setEnabled(moduleConfig.enabled);
          }
          
          // Apply parameters
          this.setModuleParameters(module, moduleConfig.parameters);
          recreatedModules.push(module);
          console.log(`[DspSettingsManager] Recreated module: ${moduleConfig.type} (${moduleConfig.id})`);
        } else {
          console.warn(`[DspSettingsManager] Could not recreate module: ${moduleConfig.type} (${moduleConfig.id})`);
        }
      } catch (error) {
        console.error(`[DspSettingsManager] Failed to recreate module ${moduleConfig.type}:`, error);
      }
    }

    return recreatedModules;
  }

  /**
   * Serialize configuration to JSON string
   */
  static serialize(config: DSPChainConfig): string {
    return JSON.stringify(config, null, 2);
  }

  /**
   * Deserialize JSON string to configuration
   */
  static deserialize(json: string): DSPChainConfig {
    const parsed = JSON.parse(json);
    
    // Validate basic structure
    if (!parsed.version || !Array.isArray(parsed.modules)) {
      throw new Error('Invalid DSP configuration format');
    }

    return parsed as DSPChainConfig;
  }

  /**
   * Create a minimal default configuration
   */
  static createDefaultConfig(): DSPChainConfig {
    return {
      version: this.CURRENT_VERSION,
      modules: [],
      replayGain: {
        enabled: true,
        preamp: 0
      },
      globalSettings: {
        targetLUFS: -14,
        stereoWidth: 1,
        monoBelowHz: 120,
        eqTiltDbPerDecade: 0
      }
    };
  }

  /**
   * Merge two configurations (useful for applying partial updates)
   */
  static mergeConfigs(base: DSPChainConfig, override: Partial<DSPChainConfig>): DSPChainConfig {
    return {
      version: override.version || base.version,
      modules: override.modules || base.modules,
      replayGain: {
        ...base.replayGain,
        ...override.replayGain
      },
      globalSettings: {
        ...base.globalSettings,
        ...override.globalSettings
      }
    };
  }

  /**
   * Validate configuration structure
   */
  static validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config) {
      errors.push('Configuration is null or undefined');
      return { valid: false, errors };
    }

    if (!config.version) {
      errors.push('Missing version field');
    }

    if (!Array.isArray(config.modules)) {
      errors.push('modules must be an array');
    } else {
      config.modules.forEach((mod: any, index: number) => {
        if (!mod.id) errors.push(`Module ${index}: missing id`);
        if (!mod.type) errors.push(`Module ${index}: missing type`);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Private helper methods

  private static isModuleEnabled(module: DSPModule): boolean {
    // Check for enabled property or method
    if (typeof (module as any).enabled === 'boolean') {
      return (module as any).enabled;
    }
    if (typeof (module as any).isEnabled === 'function') {
      return (module as any).isEnabled();
    }
    return true; // Default to enabled
  }

  private static getModuleParameters(module: DSPModule): Record<string, any> {
    // Try different ways to get parameters
    if (typeof (module as any).getParameters === 'function') {
      return (module as any).getParameters();
    }
    if (typeof (module as any).getParams === 'function') {
      return (module as any).getParams();
    }
    if (typeof module.getParams === 'function') {
      return module.getParams();
    }
    return {};
  }

  private static setModuleParameters(module: DSPModule, params: Record<string, any>): void {
    // Try different ways to set parameters
    if (typeof (module as any).setParameters === 'function') {
      (module as any).setParameters(params);
    } else if (typeof (module as any).setParams === 'function') {
      (module as any).setParams(params);
    } else if (typeof module.updateParams === 'function') {
      module.updateParams(params);
    } else {
      // Apply individual parameters
      for (const [key, value] of Object.entries(params)) {
        const setter = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (typeof (module as any)[setter] === 'function') {
          (module as any)[setter](value);
        }
      }
    }
  }
}

// Export singleton functions for convenience
export const exportDspSettings = DspSettingsManager.exportSettings.bind(DspSettingsManager);
export const importDspSettings = DspSettingsManager.importSettings.bind(DspSettingsManager);
export const serializeDspConfig = DspSettingsManager.serialize.bind(DspSettingsManager);
export const deserializeDspConfig = DspSettingsManager.deserialize.bind(DspSettingsManager);
