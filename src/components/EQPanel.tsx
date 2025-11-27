import React, { useState, useEffect } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { EQChain } from '../dsp/EQChain';
import { EQPresetManager, EQPreset } from '../dsp/EQPresets';

interface EQPanelProps {
  eqChain?: EQChain;
}

export const EQPanel: React.FC<EQPanelProps> = ({ eqChain }) => {
  const [gains, setGains] = useState<number[]>(Array(10).fill(0));
  const [selectedDevice, setSelectedDevice] = useState<'headphones' | 'speakers' | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [showGenreSelector, setShowGenreSelector] = useState(false);
  
  const frequencies = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

  useEffect(() => {
    if (eqChain) {
      const bands = eqChain.getBands();
      setGains(bands.map(band => band.gain));
    }
  }, [eqChain]);

  const handleGainChange = (bandIndex: number, value: number | number[]) => {
    const gainValue = Array.isArray(value) ? value[0] : value;
    
    if (eqChain) {
      eqChain.setBandGain(bandIndex, gainValue);
    }
    
    setGains(prev => {
      const newGains = [...prev];
      newGains[bandIndex] = gainValue;
      return newGains;
    });
  };

  const resetEQ = () => {
    if (eqChain) {
      eqChain.reset();
    }
    setGains(Array(10).fill(0));
    setSelectedDevice(null);
    setSelectedGenre(null);
  };

  const applyPreset = (preset: EQPreset) => {
    if (eqChain) {
      preset.gains.forEach((gain, index) => {
        eqChain.setBandGain(index, gain);
      });
    }
    setGains([...preset.gains]);
  };

  const handleDeviceSelect = (device: 'headphones' | 'speakers') => {
    setSelectedDevice(device);
    setShowDeviceSelector(false);
    setShowGenreSelector(true);
  };

  const handleGenreSelect = (genre: string) => {
    if (selectedDevice) {
      const preset = EQPresetManager.getPresetByDeviceAndGenre(selectedDevice, genre);
      if (preset) {
        applyPreset(preset);
        setSelectedGenre(genre);
      }
    }
    setShowGenreSelector(false);
  };

  return (
    <div className="bg-ravr-panel rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🎛️</span>
          10-Band Equalizer
          {selectedDevice && selectedGenre && (
            <span className="text-sm bg-ravr-accent/20 text-ravr-accent px-2 py-1 rounded">
              {selectedDevice === 'headphones' ? '🎧' : '🔊'} {selectedGenre}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDeviceSelector(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-lg transition-colors text-sm font-bold"
          >
            🤖 AI Setup
          </button>
          <button
            onClick={resetEQ}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Device Selector Modal */}
      {showDeviceSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-ravr-panel rounded-xl p-6 border border-gray-800 max-w-md w-full mx-4">
            <h4 className="text-lg font-bold text-white mb-4">🎵 What are you using?</h4>
            <div className="space-y-3">
              <button
                onClick={() => handleDeviceSelect('headphones')}
                className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              >
                <div className="text-2xl mb-2">🎧</div>
                <div className="font-bold text-white">Headphones</div>
                <div className="text-sm text-gray-400">Optimized for personal listening</div>
              </button>
              <button
                onClick={() => handleDeviceSelect('speakers')}
                className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              >
                <div className="text-2xl mb-2">🔊</div>
                <div className="font-bold text-white">Speakers</div>
                <div className="text-sm text-gray-400">Room-compensated sound</div>
              </button>
            </div>
            <button
              onClick={() => setShowDeviceSelector(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Genre Selector Modal */}
      {showGenreSelector && selectedDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-ravr-panel rounded-xl p-6 border border-gray-800 max-w-md w-full mx-4">
            <h4 className="text-lg font-bold text-white mb-4">🎶 What genre are you listening to?</h4>
            <div className="space-y-2">
              {EQPresetManager.getPresetsForDevice(selectedDevice).map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleGenreSelect(preset.genre)}
                  className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                >
                  <div className="font-bold text-white">{preset.name}</div>
                  <div className="text-xs text-gray-400">{preset.description}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGenreSelector(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-10 gap-4">
        {frequencies.map((freq, i) => (
          <div key={freq} className="flex flex-col items-center space-y-3">
            <div className="text-xs text-gray-400 font-mono text-center min-h-[2rem] flex items-center">
              {freq}
            </div>
            
            <div className="h-48 flex items-center">
              <Slider
                vertical
                min={-12}
                max={12}
                step={0.5}
                value={gains[i]}
                onChange={(value) => handleGainChange(i, value)}
                className="eq-slider"
                styles={{
                  track: {
                    backgroundColor: gains[i] >= 0 ? '#38bdf8' : '#ef4444',
                    width: 6
                  },
                  handle: {
                    backgroundColor: '#38bdf8',
                    borderColor: '#0284c7',
                    width: 16,
                    height: 16,
                    marginLeft: -5,
                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
                  },
                  rail: {
                    backgroundColor: '#374151',
                    width: 6
                  }
                }}
              />
            </div>
            
            <div className="text-xs text-gray-300 font-mono min-h-[1rem] text-center">
              {gains[i] > 0 ? '+' : ''}{gains[i].toFixed(1)}dB
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-center">
        <div className="flex items-center space-x-4 text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-ravr-accent rounded"></div>
            <span>Boost</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Cut</span>
          </div>
          {selectedDevice && selectedGenre && (
            <div className="flex items-center space-x-2 ml-6">
              <div className="w-3 h-3 bg-green-500 rounded animate-pulse"></div>
              <span>AI Optimized</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
