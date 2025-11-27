import { useState, useEffect, useMemo } from 'react';
import { AudioPreset, PRESETS, PresetName, DEFAULT_PRESET } from '../audio/presets';
import { useAudioEngine } from './useAudioEngine';

export const useAudioPresets = () => {
  const [currentPreset, setCurrentPreset] = useState<PresetName>(DEFAULT_PRESET);
  const [customPresets, setCustomPresets] = useState<Record<string, AudioPreset>>({});
  const audioEngine = useAudioEngine();
  
  // Combine built-in presets with custom ones
  const presets = useMemo(() => ({
    ...PRESETS,
    ...customPresets
  }), [customPresets]);

  // Load saved presets from localStorage on mount
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('audioPresets');
      if (savedPresets) {
        setCustomPresets(JSON.parse(savedPresets));
      }
      
      const savedPreset = localStorage.getItem('currentPreset') as PresetName;
      if (savedPreset && (savedPreset in PRESETS || savedPreset in customPresets)) {
        setCurrentPreset(savedPreset);
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  }, []);

  // Save presets to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('audioPresets', JSON.stringify(customPresets));
    } catch (error) {
      console.error('Error saving presets:', error);
    }
  }, [customPresets]);

  // Save current preset to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('currentPreset', currentPreset);
    } catch (error) {
      console.error('Error saving current preset:', error);
    }
  }, [currentPreset]);

  const applyPreset = (presetName: PresetName) => {
    const preset = PRESETS[presetName] || customPresets[presetName];
    if (!preset || !audioEngine) return;

    try {
      // Apply each module in the preset
      preset.modules.forEach(moduleConfig => {
        switch (moduleConfig.type) {
          case 'parametricEQ':
            if (audioEngine.parametricEQ && moduleConfig.params) {
              // Apply EQ band settings
              Object.entries(moduleConfig.params).forEach(([key, value]) => {
                if (key.startsWith('band') && typeof value === 'object') {
                  const bandIndex = parseInt(key.replace('band', '')) - 1;
                  audioEngine.parametricEQ.setBand(bandIndex, value as any);
                }
              });
            }
            break;
            
          case 'compressor':
            if (audioEngine.compressor && moduleConfig.params) {
              // Apply compressor settings
              const { threshold, ratio, attack, release, knee } = moduleConfig.params;
              if (threshold !== undefined) audioEngine.compressor.setThreshold(threshold);
              if (ratio !== undefined) audioEngine.compressor.setRatio(ratio);
              if (attack !== undefined) audioEngine.compressor.setAttack(attack);
              if (release !== undefined) audioEngine.compressor.setRelease(release);
              if (knee !== undefined) audioEngine.compressor.setKnee(knee);
            }
            break;
            
          case 'limiter':
            if (audioEngine.limiter && moduleConfig.params) {
              const { threshold, ceiling, release } = moduleConfig.params;
              if (threshold !== undefined) audioEngine.limiter.setThreshold(threshold);
              if (ceiling !== undefined) audioEngine.limiter.setCeiling(ceiling);
              if (release !== undefined) audioEngine.limiter.setRelease(release);
            }
            break;
            
          case 'stereoEnhancer':
            if (audioEngine.stereoEnhancer && moduleConfig.params) {
              const { width, bass } = moduleConfig.params;
              if (width !== undefined) audioEngine.stereoEnhancer.setWidth(width);
              if (bass !== undefined) audioEngine.stereoEnhancer.setBass(bass);
            }
            break;
            
          default:
            console.warn(`Unknown module type: ${moduleConfig.type}`);
        }
      });
      
      console.log(`Applied preset: ${preset.name}`);
      setCurrentPreset(presetName);
    } catch (error) {
      console.error('Error applying preset:', error);
    }
  };

  const saveCustomPreset = (preset: Omit<AudioPreset, 'id'>, id?: string) => {
    const presetId = id || `custom-${Date.now()}`;
    const newPreset = { ...preset, id: presetId };
    
    setCustomPresets(prev => ({
      ...prev,
      [presetId]: newPreset
    }));

    return presetId;
  };

  const deleteCustomPreset = (presetId: string) => {
    if (presetId in customPresets) {
      const newPresets = { ...customPresets };
      delete newPresets[presetId];
      setCustomPresets(newPresets);
      
      // If the deleted preset was active, switch to default
      if (currentPreset === presetId) {
        setCurrentPreset(DEFAULT_PRESET);
        applyPreset(DEFAULT_PRESET);
      }
    }
  };

  return {
    currentPreset,
    presets,
    applyPreset,
    saveCustomPreset,
    deleteCustomPreset
  };
};

export default useAudioPresets;
