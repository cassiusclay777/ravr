import React, { useState, useEffect } from 'react';
import { DSPModule, DSPModuleType } from '../../dsp/types';
import { moduleRegistry } from '../../dsp/ModuleRegistry';
import { ModularDspChain } from '../../dsp/ModularDspChain';

interface Props {
  chain: ModularDspChain;
}

export const DspChainPanel: React.FC<Props> = ({ chain }) => {
  const [modules, setModules] = useState<DSPModule[]>([]);
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  useEffect(() => {
    // Load available module types
    const available = moduleRegistry.listModules();
    setAvailableModules(available);

    // Load current chain
    refreshModules();
  }, [chain]);

  const refreshModules = () => {
    setModules(chain.getModules());
  };

  const handleAddModule = (type: string) => {
    const module = chain.addModule(type as DSPModuleType);
    if (module) {
      refreshModules();
    }
  };

  const handleRemoveModule = (id: string) => {
    if (confirm('Remove this module?')) {
      chain.removeModule(id);
      refreshModules();
      if (selectedModule === id) {
        setSelectedModule(null);
      }
    }
  };

  const handleToggleEnabled = (id: string) => {
    const isEnabled = chain.isModuleEnabled(id);
    chain.setModuleEnabled(id, !isEnabled);
    refreshModules();
  };

  const handleDragStart = (e: React.DragEvent, moduleId: string) => {
    setDraggedModule(moduleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedModule) {
      const currentIndex = modules.findIndex(m => m.id === draggedModule);
      if (currentIndex !== -1 && currentIndex !== targetIndex) {
        chain.moveModule(draggedModule, targetIndex);
        refreshModules();
      }
      setDraggedModule(null);
    }
  };

  const handleSelectModule = (moduleId: string) => {
    setSelectedModule(selectedModule === moduleId ? null : moduleId);
  };

  const handleParameterChange = (moduleId: string, paramName: string, value: number) => {
    const module = chain.getModule(moduleId);
    if (!module) return;

    const currentParams = getModuleParameters(module);
    const newParams = { ...currentParams, [paramName]: value };
    
    chain.setModuleParameters(moduleId, newParams);
    refreshModules();
  };

  const getModuleParameters = (module: DSPModule): Record<string, any> => {
    if (typeof (module as any).getParameters === 'function') {
      return (module as any).getParameters();
    }
    if (typeof (module as any).getParams === 'function') {
      return (module as any).getParams();
    }
    return {};
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">DSP Chain</h2>

        {/* Add Module Dropdown */}
        <select
          aria-label="Add DSP module to chain"
          onChange={(e) => {
            if (e.target.value) {
              handleAddModule(e.target.value);
              e.target.value = '';
            }
          }}
          className="px-3 py-1 text-sm text-white bg-gray-800 border border-gray-600 rounded cursor-pointer"
        >
          <option value="">+ Add Module</option>
          {availableModules.map((mod) => (
            <option key={mod.type} value={mod.type}>
              {mod.name || mod.type}
            </option>
          ))}
        </select>
      </div>

      {/* Module List */}
      <div className="space-y-2">
        {modules.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No modules. Add one from the dropdown above.
          </div>
        )}

        {modules.map((module, index) => (
          <div
            key={module.id}
            draggable
            onDragStart={(e) => handleDragStart(e, module.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className={`
              p-3 bg-gray-800 border rounded-lg transition-all cursor-move
              ${draggedModule === module.id ? 'opacity-50 border-blue-500' : 'border-gray-700'}
              ${!chain.isModuleEnabled(module.id) ? 'opacity-40' : ''}
            `}
          >
            {/* Module Header */}
            <div className="flex items-center gap-3">
              {/* Drag Handle */}
              <div className="text-gray-500 cursor-grab">⋮⋮</div>

              {/* Module Info */}
              <div className="flex-1">
                <div className="font-medium text-white">{module.type}</div>
                <div className="text-xs text-gray-500">{module.id}</div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Enable/Disable */}
                <button
                  onClick={() => handleToggleEnabled(module.id)}
                  className={`
                    px-2 py-1 text-xs rounded transition-colors
                    ${chain.isModuleEnabled(module.id)
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                    }
                  `}
                >
                  {chain.isModuleEnabled(module.id) ? 'ON' : 'OFF'}
                </button>

                {/* Edit */}
                <button
                  onClick={() => handleSelectModule(module.id)}
                  className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  {selectedModule === module.id ? 'Close' : 'Edit'}
                </button>

                {/* Remove */}
                <button
                  onClick={() => handleRemoveModule(module.id)}
                  className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Parameter Editor (expanded) */}
            {selectedModule === module.id && (
              <div className="pt-3 mt-3 border-t border-gray-700">
                <ModuleParameterEditor
                  module={module}
                  parameters={getModuleParameters(module)}
                  onChange={(paramName, value) => handleParameterChange(module.id, paramName, value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chain Summary */}
      {modules.length > 0 && (
        <div className="p-3 mt-4 text-sm text-gray-400 bg-gray-800 rounded">
          <strong>Chain:</strong> {modules.map(m => m.type).join(' → ')}
        </div>
      )}
    </div>
  );
};

// Parameter Editor Component
interface ParameterEditorProps {
  module: DSPModule;
  parameters: Record<string, any>;
  onChange: (paramName: string, value: number) => void;
}

const ModuleParameterEditor: React.FC<ParameterEditorProps> = ({
  module,
  parameters,
  onChange
}) => {
  const renderParameterControl = (key: string, value: any) => {
    if (typeof value === 'number') {
      // Determine reasonable min/max values based on parameter name
      let min = -100;
      let max = 100;
      let step = 1;

      if (key.toLowerCase().includes('gain') || key.toLowerCase().includes('volume')) {
        min = -24;
        max = 24;
        step = 0.1;
      } else if (key.toLowerCase().includes('freq') || key.toLowerCase().includes('frequency')) {
        min = 20;
        max = 20000;
        step = 1;
      } else if (key.toLowerCase().includes('q') || key.toLowerCase().includes('quality')) {
        min = 0.1;
        max = 10;
        step = 0.1;
      } else if (key.toLowerCase().includes('ratio')) {
        min = 1;
        max = 20;
        step = 0.1;
      } else if (key.toLowerCase().includes('threshold')) {
        min = -60;
        max = 0;
        step = 0.1;
      } else if (key.toLowerCase().includes('attack') || key.toLowerCase().includes('release')) {
        min = 0.001;
        max = 1;
        step = 0.001;
      }

      return (
        <div key={key} className="flex items-center gap-3">
          <label className="w-20 text-xs text-gray-400 capitalize">
            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(key, parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-xs text-right text-white">
            {typeof value === 'number' ? value.toFixed(2) : String(value)}
          </span>
        </div>
      );
    }

    return (
      <div key={key} className="flex items-center gap-3">
        <label className="w-20 text-xs text-gray-400 capitalize">
          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
        </label>
        <span className="text-xs text-white">{String(value)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-white">Parameters</h4>
      {Object.entries(parameters).length === 0 ? (
        <p className="text-xs text-gray-500">No parameters available</p>
      ) : (
        Object.entries(parameters).map(([key, value]) => renderParameterControl(key, value))
      )}
    </div>
  );
};

export default DspChainPanel;
