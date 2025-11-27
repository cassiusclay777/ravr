import React, { useState, useEffect } from 'react';
import { PresetManager, Preset } from '../../presets/PresetManager';
import { DspPreferences } from '../../utils/profiles';

interface PresetManagerUIProps {
  currentDsp: DspPreferences;
  onPresetLoad: (dsp: DspPreferences) => void;
  className?: string;
}

export const PresetManagerUI: React.FC<PresetManagerUIProps> = ({
  currentDsp,
  onPresetLoad,
  className = ''
}) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    setPresets(PresetManager.getAllPresets());
  };

  const handleLoadPreset = (preset: Preset) => {
    setSelectedPresetId(preset.id);
    onPresetLoad(preset.dsp);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const preset: Preset = {
      id: `custom_${Date.now()}`,
      name: presetName,
      description: presetDescription,
      dsp: currentDsp,
      createdAt: Date.now(),
      isBuiltIn: false
    };

    PresetManager.savePreset(preset);
    loadPresets();
    setShowSaveDialog(false);
    setPresetName('');
    setPresetDescription('');
  };

  const handleDeletePreset = (id: string) => {
    if (PresetManager.deletePreset(id)) {
      loadPresets();
      if (selectedPresetId === id) {
        setSelectedPresetId(null);
      }
    }
  };

  const handleQuickAssign = (slot: number, presetId: string) => {
    PresetManager.assignQuickPreset(slot, presetId);
  };

  const handleExport = (preset: Preset) => {
    const json = PresetManager.exportPreset(preset.id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${preset.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const preset = PresetManager.importPreset(json);
      if (preset) {
        loadPresets();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-200">Presets</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-3 py-1 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700 transition-colors"
          >
            Save Current
          </button>
          <label className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors cursor-pointer">
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {showSaveDialog && (
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
          <input
            type="text"
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="w-full mb-2 px-3 py-1 bg-gray-900 text-gray-200 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={presetDescription}
            onChange={(e) => setPresetDescription(e.target.value)}
            className="w-full mb-2 px-3 py-1 bg-gray-900 text-gray-200 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSavePreset}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {presets.map(preset => (
          <div
            key={preset.id}
            className={`p-3 rounded border transition-all cursor-pointer ${
              selectedPresetId === preset.id
                ? 'bg-gray-800 border-cyan-500'
                : 'bg-gray-850 border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => handleLoadPreset(preset)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-200">
                    {preset.name}
                  </h3>
                  {preset.isBuiltIn && (
                    <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                      Built-in
                    </span>
                  )}
                </div>
                {preset.description && (
                  <p className="text-sm text-gray-400 mt-1">
                    {preset.description}
                  </p>
                )}
              </div>
              
              <div className="flex gap-1 ml-2">
                {[1, 2, 3].map(slot => (
                  <button
                    key={slot}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAssign(slot, preset.id);
                    }}
                    className="w-6 h-6 bg-gray-700 text-gray-400 text-xs rounded hover:bg-cyan-600 hover:text-white transition-colors"
                    title={`Assign to quick slot ${slot}`}
                  >
                    {slot}
                  </button>
                ))}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport(preset);
                  }}
                  className="w-6 h-6 bg-gray-700 text-gray-400 text-xs rounded hover:bg-blue-600 hover:text-white transition-colors"
                  title="Export"
                >
                  ↓
                </button>
                
                {!preset.isBuiltIn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePreset(preset.id);
                    }}
                    className="w-6 h-6 bg-gray-700 text-gray-400 text-xs rounded hover:bg-red-600 hover:text-white transition-colors"
                    title="Delete"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Quick Presets (Press 1-9)</h3>
        <div className="grid grid-cols-9 gap-1">
          {PresetManager.getQuickPresets().map(({ slot, preset }) => (
            <div
              key={slot}
              className="aspect-square bg-gray-800 rounded flex items-center justify-center relative group"
            >
              <span className="text-xs text-gray-500">{slot}</span>
              {preset && (
                <div className="absolute inset-0 bg-cyan-600 bg-opacity-20 rounded flex items-center justify-center">
                  <span className="text-xs text-cyan-400 font-medium truncate px-1">
                    {preset.name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
