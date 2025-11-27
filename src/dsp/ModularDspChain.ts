import { DSPModule, DSPModuleType } from './types';
import { moduleRegistry } from './ModuleRegistry';
import { AudioContextType } from './audioTypes';

export interface ModularDspChainConfig {
  modules: {
    id: string;
    type: DSPModuleType;
    enabled: boolean;
    parameters: Record<string, any>;
  }[];
}

/**
 * Modular DSP chain that allows dynamic addition, removal, and reordering of DSP modules
 */
export class ModularDspChain {
  private audioContext: AudioContextType;
  private modules: DSPModule[] = [];

  private inputNode: GainNode;
  private outputNode: GainNode;
  private analyzerNode: AnalyserNode;

  constructor(audioContext: AudioContextType) {
    this.audioContext = audioContext;

    // Create I/O nodes
    this.inputNode = this.audioContext.createGain();
    this.outputNode = this.audioContext.createGain();
    this.analyzerNode = this.audioContext.createAnalyser();
    this.analyzerNode.fftSize = 2048;

    // Initial connection
    this.reconnectChain();
  }

  /**
   * Get input node (connect audio source here)
   */
  getInput(): AudioNode {
    return this.inputNode;
  }

  /**
   * Get output node (connect to destination)
   */
  getOutput(): AudioNode {
    return this.outputNode;
  }

  /**
   * Get analyzer for visualization
   */
  getAnalyzer(): AnalyserNode {
    return this.analyzerNode;
  }

  /**
   * Add DSP module to the end of the chain
   */
  addModule(type: DSPModuleType, id?: string): DSPModule | null {
    const moduleId = id || `${type}-${Date.now()}`;
    const module = moduleRegistry.createModule(type, this.audioContext, moduleId);

    if (!module) {
      console.error('[ModularDspChain] Failed to create module:', type);
      return null;
    }

    this.modules.push(module);
    this.reconnectChain();
    console.log(`[ModularDspChain] Added module: ${type} (${moduleId})`);
    return module;
  }

  /**
   * Insert DSP module at specific index
   */
  insertModule(type: DSPModuleType, index: number, id?: string): DSPModule | null {
    if (index < 0 || index > this.modules.length) {
      console.error('[ModularDspChain] Invalid index:', index);
      return null;
    }

    const moduleId = id || `${type}-${Date.now()}`;
    const module = moduleRegistry.createModule(type, this.audioContext, moduleId);

    if (!module) {
      console.error('[ModularDspChain] Failed to create module:', type);
      return null;
    }

    this.modules.splice(index, 0, module);
    this.reconnectChain();
    console.log(`[ModularDspChain] Inserted module: ${type} (${moduleId}) at index ${index}`);
    return module;
  }

  /**
   * Remove module by ID
   */
  removeModule(moduleId: string): boolean {
    const index = this.modules.findIndex(m => m.id === moduleId);
    if (index === -1) {
      console.warn('[ModularDspChain] Module not found:', moduleId);
      return false;
    }

    const module = this.modules[index];
    module.disconnect?.();
    this.modules.splice(index, 1);
    this.reconnectChain();
    console.log(`[ModularDspChain] Removed module: ${module.type} (${moduleId})`);
    return true;
  }

  /**
   * Move module to new position
   */
  moveModule(moduleId: string, newIndex: number): boolean {
    const oldIndex = this.modules.findIndex(m => m.id === moduleId);
    if (oldIndex === -1) {
      console.warn('[ModularDspChain] Module not found:', moduleId);
      return false;
    }

    if (newIndex < 0 || newIndex >= this.modules.length) {
      console.error('[ModularDspChain] Invalid new index:', newIndex);
      return false;
    }

    const [module] = this.modules.splice(oldIndex, 1);
    this.modules.splice(newIndex, 0, module);
    this.reconnectChain();
    console.log(`[ModularDspChain] Moved module: ${module.type} (${moduleId}) from ${oldIndex} to ${newIndex}`);
    return true;
  }

  /**
   * Get all modules
   */
  getModules(): DSPModule[] {
    return [...this.modules];
  }

  /**
   * Get module by ID
   */
  getModule(moduleId: string): DSPModule | undefined {
    return this.modules.find(m => m.id === moduleId);
  }

  /**
   * Enable/disable module
   */
  setModuleEnabled(moduleId: string, enabled: boolean): boolean {
    const module = this.getModule(moduleId);
    if (!module) {
      console.warn('[ModularDspChain] Module not found:', moduleId);
      return false;
    }

    if (typeof (module as any).setEnabled === 'function') {
      (module as any).setEnabled(enabled);
    } else if (typeof (module as any).enabled !== 'undefined') {
      (module as any).enabled = enabled;
    }

    this.reconnectChain();
    console.log(`[ModularDspChain] Set module ${moduleId} enabled: ${enabled}`);
    return true;
  }

  /**
   * Check if module is enabled
   */
  isModuleEnabled(moduleId: string): boolean {
    const module = this.getModule(moduleId);
    if (!module) return false;

    if (typeof (module as any).isEnabled === 'function') {
      return (module as any).isEnabled();
    }
    if (typeof (module as any).enabled === 'boolean') {
      return (module as any).enabled;
    }
    return true; // Default to enabled
  }

  /**
   * Clear all modules
   */
  clear(): void {
    for (const module of this.modules) {
      module.disconnect?.();
    }
    this.modules = [];
    this.reconnectChain();
    console.log('[ModularDspChain] Cleared all modules');
  }

  /**
   * Reconnect entire audio chain
   */
  private reconnectChain(): void {
    // Disconnect everything first
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.analyzerNode.disconnect();

      for (const module of this.modules) {
        module.getOutput?.()?.disconnect();
      }
    } catch (e) {
      // Ignore disconnect errors (nodes might not be connected)
    }

    // Rebuild chain: input → enabled modules → analyzer → output
    let currentNode: AudioNode = this.inputNode;

    // Connect enabled modules in order
    for (const module of this.modules) {
      if (this.isModuleEnabled(module.id) && module.getInput && module.getOutput) {
        try {
          currentNode.connect(module.getInput());
          currentNode = module.getOutput();
        } catch (error) {
          console.error(`[ModularDspChain] Failed to connect module ${module.type}:`, error);
        }
      }
    }

    // Connect to analyzer and output
    try {
      currentNode.connect(this.analyzerNode);
      this.analyzerNode.connect(this.outputNode);
    } catch (error) {
      console.error('[ModularDspChain] Failed to connect analyzer/output:', error);
    }

    console.log('[ModularDspChain] Chain reconnected:', this.getChainDescription());
  }

  /**
   * Get human-readable chain description
   */
  private getChainDescription(): string {
    const enabledModules = this.modules.filter(m => this.isModuleEnabled(m.id));
    if (enabledModules.length === 0) {
      return 'Input → Analyzer → Output';
    }
    return `Input → ${enabledModules.map(m => m.type).join(' → ')} → Analyzer → Output`;
  }

  /**
   * Serialize chain to configuration
   */
  serialize(): ModularDspChainConfig {
    return {
      modules: this.modules.map((module, index) => ({
        id: module.id,
        type: module.type,
        enabled: this.isModuleEnabled(module.id),
        parameters: this.getModuleParameters(module)
      }))
    };
  }

  /**
   * Load chain from configuration
   */
  deserialize(config: ModularDspChainConfig): void {
    this.clear();

    for (const moduleConfig of config.modules) {
      const module = this.addModule(moduleConfig.type, moduleConfig.id);
      if (module) {
        this.setModuleEnabled(moduleConfig.id, moduleConfig.enabled);
        this.setModuleParameters(moduleConfig.id, moduleConfig.parameters);
      }
    }

    console.log('[ModularDspChain] Deserialized chain with', this.modules.length, 'modules');
  }

  /**
   * Get module parameters
   */
  private getModuleParameters(module: DSPModule): Record<string, any> {
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

  /**
   * Set module parameters
   */
  setModuleParameters(moduleId: string, parameters: Record<string, any>): boolean {
    const module = this.getModule(moduleId);
    if (!module) {
      console.warn('[ModularDspChain] Module not found:', moduleId);
      return false;
    }

    if (typeof (module as any).setParameters === 'function') {
      (module as any).setParameters(parameters);
    } else if (typeof (module as any).setParams === 'function') {
      (module as any).setParams(parameters);
    } else if (typeof module.updateParams === 'function') {
      module.updateParams(parameters);
    } else {
      // Apply individual parameters
      for (const [key, value] of Object.entries(parameters)) {
        const setter = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (typeof (module as any)[setter] === 'function') {
          (module as any)[setter](value);
        }
      }
    }

    console.log(`[ModularDspChain] Set parameters for module ${moduleId}:`, parameters);
    return true;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.clear();
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.analyzerNode.disconnect();
    console.log('[ModularDspChain] Disposed');
  }
}

export default ModularDspChain;
