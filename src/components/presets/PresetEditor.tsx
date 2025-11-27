import React, { useState, useEffect } from 'react';
import { AudioPreset } from '../../audio/presets';
import { Knob } from '../controls/Knob';
import { DSPModuleType } from '../../dsp/types';

type ModuleConfig = {
  id: string;
  type: DSPModuleType;
  params: Record<string, any>;
};

type PresetEditorProps = {
  preset: AudioPreset;
  modules: ModuleConfig[];
  onPresetUpdate: (updated: AudioPreset) => void;
};

const PresetEditor: React.FC<PresetEditorProps> = ({ 
  preset, 
  modules,
  onPresetUpdate 
}) => {
  const [editedPreset, setEditedPreset] = useState<AudioPreset>(preset);

  useEffect(() => {
    setEditedPreset(preset);
  }, [preset]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedPreset(prev => ({
      ...prev,
      name: e.target.value
    }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedPreset(prev => ({
      ...prev,
      description: e.target.value
    }));
  };

  const handleParamChange = (moduleId: string, param: string, value: number) => {
    setEditedPreset(prev => ({
      ...prev,
      modules: prev.modules.map(module => 
        module.id === moduleId 
          ? {
              ...module,
              params: {
                ...module.params,
                [param]: value
              }
            }
          : module
      )
    }));
  };

  const handleSave = () => {
    onPresetUpdate({
      ...editedPreset,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="preset-editor p-4 bg-gray-800 rounded-lg">
      <div className="mb-4">
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Preset Name
          </label>
          <input
            type="text"
            value={editedPreset.name}
            onChange={handleNameChange}
            className="w-full p-2 rounded bg-gray-700 text-white"
            placeholder="Preset name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={editedPreset.description}
            onChange={handleDescriptionChange}
            className="w-full p-2 rounded bg-gray-700 text-white"
            placeholder="Description"
            rows={3}
          />
        </div>
      </div>

      <div className="modules space-y-6">
        {modules.map(module => (
          <div key={module.id} className="module bg-gray-700 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-white mb-3 capitalize">
              {module.type.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(module.params).map(([param, value]) => (
                <div key={param} className="param flex flex-col items-center p-3 bg-gray-800 rounded">
                  <label className="text-sm text-gray-300 mb-2 capitalize">
                    {param.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </label>
                  <Knob
                    value={value as number}
                    min={0}
                    max={1}
                    step={0.01}
                    width={60}
                    height={60}
                    onChange={(val) => handleParamChange(module.id, param, val)}
                  />
                  <span className="text-xs text-gray-400 mt-1">
                    {Math.round((value as number) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button 
          onClick={handleSave} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default PresetEditor;
