import { useState } from 'react';
import { useVisualizer } from '../hooks/useVisualizer';
import { FiEye, FiEyeOff, FiSliders, FiX } from 'react-icons/fi';
import { HexColorPicker } from 'react-colorful';

const VISUALIZER_TYPES = [
  { value: 'spectrum', label: 'Spectrum' },
  { value: 'waveform', label: 'Waveform' },
  { value: 'bars', label: 'Bars' },
  { value: 'none', label: 'None' },
] as const;

const PRESET_COLORS = [
  '#00ffff', // Cyan
  '#ff00ff', // Magenta
  '#ffff00', // Yellow
  '#00ff00', // Green
  '#ff9900', // Orange
  '#ff3366', // Pink
];

export const VisualizerControls = () => {
  const {
    visualizerState,
    setVisualizerType,
    toggleVisualizer,
    setVisualizerOpacity,
    setVisualizerColor,
  } = useVisualizer();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2">
      <button
        onClick={toggleVisualizer}
        className="p-2 bg-gray-800 bg-opacity-70 text-white rounded-full hover:bg-opacity-100 transition-all"
        title={visualizerState.isVisible ? 'Hide visualizer' : 'Show visualizer'}
      >
        {visualizerState.isVisible ? <FiEyeOff /> : <FiEye />}
      </button>
      
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 bg-gray-800 bg-opacity-70 text-white rounded-full hover:bg-opacity-100 transition-all"
        title="Visualizer settings"
      >
        <FiSliders />
      </button>

      {showSettings && (
        <div className="absolute bottom-12 right-0 w-64 bg-gray-800 bg-opacity-90 backdrop-blur-md rounded-lg p-4 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-medium">Visualizer Settings</h3>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-white"
            >
              <FiX />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {VISUALIZER_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setVisualizerType(value as any)}
                    className={`text-xs py-1 px-2 rounded ${
                      visualizerState.type === value
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Opacity: {Math.round(visualizerState.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={visualizerState.opacity}
                onChange={(e) => setVisualizerOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white cursor-pointer"
                  style={{ backgroundColor: visualizerState.color }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                <div className="flex-1 grid grid-cols-6 gap-1">
                  {PRESET_COLORS.map((color) => (
                    <div
                      key={color}
                      className="w-6 h-6 rounded-full cursor-pointer"
                      style={{ backgroundColor: color }}
                      onClick={() => setVisualizerColor(color)}
                    />
                  ))}
                </div>
              </div>
              
              {showColorPicker && (
                <div className="mt-2">
                  <HexColorPicker 
                    color={visualizerState.color}
                    onChange={setVisualizerColor}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualizerControls;
