import { AudioContextType } from './audioTypes';
import { DSPModule, DSPModuleDescriptor, DSPModuleType } from './types';
import { TDRNovaDescriptor } from './modules/TDRNovaModule';
import { EQModuleDescriptor } from './modules/EQModule';
import { CompressorModuleDescriptor } from './modules/CompressorModule';

export interface ModuleInfo {
  type: DSPModuleType;
  name: string;
}

/**
 * Singleton registry for managing DSP module types and their descriptors
 */
class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<DSPModuleType, DSPModuleDescriptor> = new Map();

  private constructor() {
    // Private constructor to enforce singleton
  }

  /**
   * Get the singleton instance of ModuleRegistry
   */
  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  /**
   * Register a new DSP module type
   * @param descriptor The module descriptor to register
   */
  public register(descriptor: DSPModuleDescriptor): void {
    if (this.modules.has(descriptor.type)) {
      console.warn(`Module type ${descriptor.type} is already registered`);
      return;
    }
    this.modules.set(descriptor.type, descriptor);
  }

  /**
   * Create a new instance of a DSP module
   * @param type The type of module to create
   * @param context The AudioContext to use for the module
   * @param id Unique ID for the module instance
   * @returns The created DSP module or null if creation failed
   */
  public createModule(type: DSPModuleType, context: AudioContextType, id: string): DSPModule | null {
    const descriptor = this.modules.get(type);
    if (!descriptor) {
      console.error(`No module registered for type: ${type}`);
      return null;
    }
    return descriptor.create(context, id);
  }

  /**
   * Get a list of all registered module types with their names
   */
  public listModules(): ModuleInfo[] {
    return Array.from(this.modules.entries()).map(([type, descriptor]) => ({
      type,
      name: descriptor.name
    }));
  }

  /**
   * Get all registered module descriptors
   */
  public getModuleDescriptors(): DSPModuleDescriptor[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get module descriptor by type
   * @param type The module type to look up
   * @returns The module descriptor or undefined if not found
   */
  public getModuleDescriptor(type: DSPModuleType): DSPModuleDescriptor | undefined {
    return this.modules.get(type);
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();

// Export a hook for React components to access the registry
export const useModuleRegistry = () => {
  return moduleRegistry;
};

// Helper function to register built-in modules
const registerBuiltInModules = () => {
  // Register EQ Module
  moduleRegistry.register(EQModuleDescriptor);
  
  // Register Compressor Module
  moduleRegistry.register(CompressorModuleDescriptor);
  
  // Register TDR Nova Module
  moduleRegistry.register(TDRNovaDescriptor);
  
  // Additional modules can be registered here
};

// Initialize with built-in modules when this file is imported
registerBuiltInModules();
