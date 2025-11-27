/**
 * DSP Chain Hook
 * React hook for managing the modular DSP chain
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ModularDspChain, ChainEvent } from '../dsp/ModularDspChain';
import { DSPModule, DSPModuleType } from '../dsp/types';
import { moduleRegistry } from '../dsp/ModuleRegistry';
import { DspSettingsManager, DSPChainConfig } from '../dsp/DspSettingsManager';

interface UseDspChainOptions {
  audioContext?: AudioContext;
  initialModules?: DSPModuleType[];
}

interface UseDspChainReturn {
  chain: ModularDspChain | null;
  modules: DSPModule[];
  availableModuleTypes: { type: DSPModuleType; name: string }[];
  isReady: boolean;
  isBypassed: boolean;
  
  // Module operations
  addModule: (type: DSPModuleType) => DSPModule | null;
  removeModule: (id: string) => boolean;
  moveModule: (fromIndex: number, toIndex: number) => boolean;
  toggleModule: (id: string) => boolean;
  clearModules: () => void;
  
  // Chain operations
  setBypass: (bypass: boolean) => void;
  
  // Settings operations
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

export function useDspChain(options: UseDspChainOptions = {}): UseDspChainReturn {
  const [chain, setChain] = useState<ModularDspChain | null>(null);
  const [modules, setModules] = useState<DSPModule[]>([]);
  const [isBypassed, setIsBypassed] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Available module types from registry
  const availableModuleTypes = useMemo(() => {
    return moduleRegistry.listModules();
  }, []);

  // Initialize chain when AudioContext is available
  useEffect(() => {
    if (!options.audioContext) return;

    const newChain = new ModularDspChain(options.audioContext);
    setChain(newChain);
    setIsReady(true);

    // Add initial modules if specified
    if (options.initialModules) {
      for (const type of options.initialModules) {
        newChain.createAndAddModule(type);
      }
      setModules(newChain.getModules());
    }

    // Subscribe to chain events
    const unsubscribe = newChain.subscribe((event: ChainEvent) => {
      setModules(newChain.getModules());
      setIsBypassed(newChain.isBypassed());
    });

    return () => {
      unsubscribe();
      newChain.dispose();
    };
  }, [options.audioContext]);

  // Module operations
  const addModule = useCallback((type: DSPModuleType): DSPModule | null => {
    if (!chain) return null;
    return chain.createAndAddModule(type);
  }, [chain]);

  const removeModule = useCallback((id: string): boolean => {
    if (!chain) return false;
    return chain.removeModule(id);
  }, [chain]);

  const moveModule = useCallback((fromIndex: number, toIndex: number): boolean => {
    if (!chain) return false;
    return chain.moveModule(fromIndex, toIndex);
  }, [chain]);

  const toggleModule = useCallback((id: string): boolean => {
    if (!chain) return false;
    return chain.toggleModule(id);
  }, [chain]);

  const clearModules = useCallback(() => {
    if (!chain) return;
    chain.clearModules();
  }, [chain]);

  // Chain operations
  const setBypass = useCallback((bypass: boolean) => {
    if (!chain) return;
    chain.setBypass(bypass);
    setIsBypassed(bypass);
  }, [chain]);

  // Settings operations
  const exportSettings = useCallback((): string => {
    if (!chain) {
      return DspSettingsManager.serialize(DspSettingsManager.createDefaultConfig());
    }
    
    const config = DspSettingsManager.exportSettings(
      chain.getModules(),
      true,
      0,
      { targetLUFS: -14 }
    );
    return DspSettingsManager.serialize(config);
  }, [chain]);

  const importSettings = useCallback((json: string): boolean => {
    if (!chain || !options.audioContext) return false;
    
    try {
      const config = DspSettingsManager.deserialize(json);
      chain.clearModules();
      
      const newModules = DspSettingsManager.importSettings(config, options.audioContext);
      for (const module of newModules) {
        chain.addModule(module);
      }
      
      return true;
    } catch (error) {
      console.error('[useDspChain] Failed to import settings:', error);
      return false;
    }
  }, [chain, options.audioContext]);

  return {
    chain,
    modules,
    availableModuleTypes,
    isReady,
    isBypassed,
    addModule,
    removeModule,
    moveModule,
    toggleModule,
    clearModules,
    setBypass,
    exportSettings,
    importSettings
  };
}

/**
 * Simplified hook for getting DSP chain from player
 */
export function usePlayerDspChain() {
  const [chain, setChain] = useState<ModularDspChain | null>(null);
  const [modules, setModules] = useState<DSPModule[]>([]);

  // This will be connected to the actual player's DSP chain
  // when the player is updated to use ModularDspChain

  return {
    chain,
    modules,
    setChain
  };
}

export default useDspChain;
