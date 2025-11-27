import React, { useMemo, useState } from 'react';
import { AudioPreset, PresetName } from '../../audio/presets';
import { DSPModule, DSPModuleType } from '../../dsp/types';
import { useDspChain } from '../../hooks/useDspChain';
import { PresetEditor } from './PresetEditor';
import { PresetSelector } from './PresetSelector';

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
  deleteCustomPreset,
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
    return modules.map((module) => ({
      id: module.id,
      type: module.type as DSPModuleType,
      params: module.getParams ? module.getParams() : {},
    }));
  }, [modules]);

  const handlePresetUpdate = (updated: AudioPreset) => {
    handleSavePreset(updated, updated.id);
  };

  return (
    <div className="preset-manager">
      <div className="mb-4">
        <PresetSelector
          currentPreset={currentPreset}
          presets={presets}
          onPresetSelect={handlePresetSelect}
          onSavePreset={handleSavePreset}
          onDeletePreset={handleDeletePreset}
        />
      </div>

      {selectedPreset ? (
        <div className="mt-4">
          <PresetEditor
            preset={selectedPreset}
            modules={editorModules}
            onPresetUpdate={handlePresetUpdate}
          />
        </div>
      ) : (
        <div className="p-4 bg-gray-800 rounded-lg text-gray-400 mt-4">Select a preset to edit</div>
      )}
    </div>
  );
};
