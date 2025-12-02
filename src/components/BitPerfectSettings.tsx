/**
 * BitPerfectSettings - UI pro nastavení Bit-Perfect Hi-Res Audio
 */

import React, { useState, useEffect } from 'react';
import { bitPerfectAudio, BitPerfectConfig } from '../audio/BitPerfectAudio';

export const BitPerfectSettings: React.FC = () => {
  const [config, setConfig] = useState<BitPerfectConfig>(bitPerfectAudio.getConfig());
  const [currentFormat, setCurrentFormat] = useState(bitPerfectAudio.getCurrentFormat());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFormat(bitPerfectAudio.getCurrentFormat());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = (updates: Partial<BitPerfectConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    bitPerfectAudio.setConfig(newConfig);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-2xl">🎧</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Bit-Perfect Hi-Res Audio</h2>
          <p className="text-sm text-slate-400">Lossless audio playback až 384kHz/32-bit</p>
        </div>
      </div>

      {/* Current Format Display */}
      {currentFormat && (
        <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="text-sm text-cyan-400 font-semibold mb-2">Aktuální formát:</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-400">Typ:</span>
              <span className="ml-2 text-white font-mono">{currentFormat.type}</span>
            </div>
            <div>
              <span className="text-slate-400">Sample Rate:</span>
              <span className="ml-2 text-white font-mono">{currentFormat.sampleRate} Hz</span>
            </div>
            <div>
              <span className="text-slate-400">Bit Depth:</span>
              <span className="ml-2 text-white font-mono">{currentFormat.bitDepth} bit</span>
            </div>
            <div>
              <span className="text-slate-400">Kanály:</span>
              <span className="ml-2 text-white font-mono">{currentFormat.channels}</span>
            </div>
          </div>
        </div>
      )}

      {/* Enable/Disable */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
            className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
          />
          <div>
            <div className="text-white font-medium">Zapnout Bit-Perfect Mode</div>
            <div className="text-sm text-slate-400">Bypass OS audio mixer pro čistší zvuk</div>
          </div>
        </label>
      </div>

      {/* Sample Rate */}
      <div className="mb-6">
        <label className="block text-white font-medium mb-3">Sample Rate</label>
        <select
          value={config.sampleRate}
          onChange={(e) => handleConfigChange({ sampleRate: parseInt(e.target.value) })}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        >
          <option value={44100}>44.1 kHz (CD Quality)</option>
          <option value={48000}>48 kHz (Studio)</option>
          <option value={96000}>96 kHz (Hi-Res)</option>
          <option value={192000}>192 kHz (Ultra Hi-Res)</option>
          <option value={384000}>384 kHz (Maximum)</option>
        </select>
        <p className="text-xs text-slate-400 mt-2">
          Vyšší sample rate = lepší kvalita, ale vyšší nároky na CPU
        </p>
      </div>

      {/* Bit Depth */}
      <div className="mb-6">
        <label className="block text-white font-medium mb-3">Bit Depth</label>
        <div className="grid grid-cols-3 gap-3">
          {[16, 24, 32].map((depth) => (
            <button
              key={depth}
              onClick={() => handleConfigChange({ bitDepth: depth })}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                config.bitDepth === depth
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {depth}-bit
            </button>
          ))}
        </div>
      </div>

      {/* Buffer Size */}
      <div className="mb-6">
        <label className="block text-white font-medium mb-3">
          Buffer Size: <span className="text-cyan-400">{config.bufferSize}</span> samples
        </label>
        <input
          type="range"
          min={256}
          max={4096}
          step={256}
          value={config.bufferSize}
          onChange={(e) => handleConfigChange({ bufferSize: parseInt(e.target.value) })}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>256 (Nízká latence)</span>
          <span>4096 (Vyšší stabilita)</span>
        </div>
      </div>

      {/* DSD Mode */}
      <div className="mb-6">
        <label className="block text-white font-medium mb-3">DSD Playback Mode</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleConfigChange({ dsdMode: 'PCM' })}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              config.dsdMode === 'PCM'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            PCM Conversion
          </button>
          <button
            onClick={() => handleConfigChange({ dsdMode: 'Native' })}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              config.dsdMode === 'Native'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Native DSD
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          PCM: Univerzální kompatibilita | Native: Pro DSD-capable DAC
        </p>
      </div>

      {/* Bypass System Mixer */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.bypassSystemMixer}
            onChange={(e) => handleConfigChange({ bypassSystemMixer: e.target.checked })}
            className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
          />
          <div>
            <div className="text-white font-medium">Bypass System Mixer</div>
            <div className="text-sm text-slate-400">Přímý výstup na USB DAC (audiophile mode)</div>
          </div>
        </label>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="text-sm text-blue-300">
          💡 <strong>Tip:</strong> Pro nejlepší kvalitu použijte 192kHz/24-bit s externím USB DAC.
          Vyšší nastavení je vhodné pouze pro master quality audio soubory.
        </div>
      </div>
    </div>
  );
};

export default BitPerfectSettings;
