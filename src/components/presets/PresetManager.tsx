import React, { useState, useMemo } from 'react';
import { PresetName, AudioPreset } from '../../audio/presets';
import PresetSelector from './PresetSelector';
import PresetEditor from './PresetEditor';
import { useDspChain } from '../../hooks/useDspChain';
import { DSPModule, DSPModuleType } from '../../dsp/types';

type PresetManagerProps = {
  currentPreset: PresetName;
  presets: Record<string, AudioPreset>;
  applyPreset: (preset: PresetName) => void;
  saveCustomPreset: (preset: Omit<AudioPreset, 'id'>, id?: string) => string;
  deleteCustomPreset: (id: string) => void;
  modules: DSPModule[];
};

export const PresetManager: React.FC<PresetManagerProps> = ({
  currentPreset: currentPresetName,
  presets,
  applyPreset,
  saveCustomPreset,
  deleteCustomPreset
}) => {
  const { modules } = useDspChain();
  const [selectedPreset, setSelectedPreset] = useState<AudioPreset | null>(null);
  
  const currentPreset = useMemo(() => {
    return presets[currentPresetName] || null;
  }, [currentPresetName, presets]);

  const handlePresetSelect = (preset: AudioPreset) => {
    setSelectedPreset(preset);
    if (preset.id in presets) {
      applyPreset(preset.id as PresetName);
    }
  };

  const handleSavePreset = (presetData: Omit<AudioPreset, 'id'>, id?: string) => {
    const presetId = saveCustomPreset(presetData, id);
    const updatedPreset = { ...presetData, id: presetId } as AudioPreset;
    setSelectedPreset(updatedPreset);
    if (currentPreset?.id === id) {
      applyPreset(presetId as PresetName);
    }
    return presetId;
  };

  const handleDeletePreset = (presetId: string) => {
    deleteCustomPreset(presetId);
    if (selectedPreset?.id === presetId) {
      setSelectedPreset(null);
    }
  };

  // Convert modules to the format expected by PresetEditor
  const editorModules = useMemo(() => {
    return modules.map(module => {
      // Handle both DSPModule interface and plain config objects
      const moduleWithParams = module as any; // Type assertion to avoid TypeScript errors
      const params = typeof moduleWithParams.getParams === 'function' 
        ? moduleWithParams.getParams() 
        : moduleWithParams.params || {};
        
      return {
        id: module.id,
        type: module.type as DSPModuleType,
        params
      };
    });
  }, [modules]);

  const handlePresetUpdate = (updated: AudioPreset) => {
    handleSavePreset(updated, updated.id);
  };

  return (
    <div className="preset-manager bg-gray-900 p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Preset Manager</h2>
      
      <div className="mb-6">
        <PresetSelector 
          currentPreset={currentPreset}
          presets={presets}
          onPresetSelect={handlePresetSelect}
          onSavePreset={handleSavePreset}
          onDeletePreset={handleDeletePreset}
        />
      </div>
      
      <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
        {selectedPreset ? (
          <PresetEditor 
            preset={selectedPreset}
            modules={editorModules}
            onPresetUpdate={handlePresetUpdate}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg 
              className="mx-auto h-12 w-12 text-gray-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-300">No preset selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Select a preset from the dropdown or create a new one to get started.
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-600">
        <p>Tip: Use the knobs to adjust parameters and click "Save Changes" to update the preset.</p>
      </div>
    </div>
  );
};
