import React from 'react';
import { AudioPreset, PresetName } from '../audio/presets';
import { FiSave, FiTrash2, FiPlus, FiCheck } from 'react-icons/fi';

interface PresetSelectorProps {
  presets: Record<string, AudioPreset>;
  currentPreset: string;
  onSelectPreset: (presetId: string) => void;
  onSavePreset?: (preset: Omit<AudioPreset, 'id'>) => void;
  onDeletePreset?: (presetId: string) => void;
  className?: string;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  currentPreset,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  className = '',
}) => {
  const [isAddingPreset, setIsAddingPreset] = React.useState(false);
  const [newPresetName, setNewPresetName] = React.useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);

  const presetList = Object.values(presets);
  const isCustomPreset = currentPreset.startsWith('custom-');

  const handleSaveCurrentPreset = () => {
    if (!newPresetName.trim() || !onSavePreset) return;
    
    onSavePreset({
      name: newPresetName,
      description: 'Custom preset',
      modules: [], // You'll need to implement getting current settings
    });
    
    setNewPresetName('');
    setIsAddingPreset(false);
  };

  const handleDeletePreset = (presetId: string) => {
    if (showDeleteConfirm === presetId) {
      onDeletePreset?.(presetId);
      setShowDeleteConfirm(null);
    } else {
      setShowDeleteConfirm(presetId);
      // Hide confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <select
          value={currentPreset}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="flex-1 p-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          {presetList.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        
        {onSavePreset && (
          <button
            onClick={() => setIsAddingPreset(!isAddingPreset)}
            className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
            title="Save current settings as preset"
          >
            <FiPlus size={20} />
          </button>
        )}
        
        {onDeletePreset && isCustomPreset && (
          <button
            onClick={() => handleDeletePreset(currentPreset)}
            className={`p-2 transition-colors ${showDeleteConfirm === currentPreset 
              ? 'text-red-500' 
              : 'text-red-400 hover:text-red-300'}`}
            title={showDeleteConfirm === currentPreset ? 'Click again to confirm delete' : 'Delete current preset'}
          >
            <FiTrash2 size={18} />
          </button>
        )}
      </div>
      
      {isAddingPreset && onSavePreset && (
        <div className="flex items-center space-x-2 mt-2">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Preset name"
            className="flex-1 p-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrentPreset()}
            autoFocus
          />
          <button
            onClick={handleSaveCurrentPreset}
            disabled={!newPresetName.trim()}
            className="p-2 text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save preset"
          >
            <FiCheck size={20} />
          </button>
        </div>
      )}
      
      {currentPreset && presets[currentPreset]?.description && (
        <p className="text-xs text-gray-400 mt-1">
          {presets[currentPreset].description}
        </p>
      )}
    </div>
  );
};

export default PresetSelector;
