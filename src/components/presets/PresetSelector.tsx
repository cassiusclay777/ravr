// src/components/presets/PresetSelector.tsx
import React from 'react';
import { AudioPreset } from '../../audio/presets';

type PresetSelectorProps = {
  currentPreset?: AudioPreset;
  presets: Record<string, AudioPreset>;
  onPresetSelect: (preset: AudioPreset) => void;
  onSavePreset?: (preset: Omit<AudioPreset, 'id'>) => void;
  onDeletePreset?: (id: string) => void;
};

const PresetSelector: React.FC<PresetSelectorProps> = ({
  currentPreset,
  presets,
  onPresetSelect,
  onSavePreset,
  onDeletePreset,
}) => {
  const presetList = Object.values(presets);

  const handleSaveCurrent = () => {
    if (!currentPreset || !onSavePreset) return;

    try {
      // Extract the preset data without the id for saving
      const { id, ...presetData } = currentPreset;
      onSavePreset(presetData);
    } catch (error) {
      console.error('Error saving preset:', error);
    }
  };

  return (
    <div className="preset-selector space-y-4">
      <div className="flex gap-2">
        <select
          title="Select audio preset"
          aria-label="Select audio preset"
          value={currentPreset?.id || ''}
          onChange={(e) => {
            const selected = presetList.find((p) => p.id === e.target.value);
            if (selected) onPresetSelect(selected);
          }}
          className="flex-1 p-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a preset...</option>
          {presetList.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleSaveCurrent}
          disabled={!currentPreset}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={
            !currentPreset ? 'No current preset to save' : 'Save current settings as a new preset'
          }
        >
          Save New
        </button>
      </div>

      {currentPreset && (
        <div className="text-sm text-gray-400">
          <p>
            <span className="font-medium">Current:</span> {currentPreset.name}
          </p>
          {currentPreset.description && (
            <p className="text-xs mt-1 text-gray-500">{currentPreset.description}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PresetSelector;
