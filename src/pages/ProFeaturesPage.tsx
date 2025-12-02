/**
 * ProFeaturesPage - World-Class Audio Features
 * Obsahuje BitPerfect, Advanced DSP, AI Features, Network Streaming
 */

import React, { useState } from 'react';
import BitPerfectSettings from '../components/BitPerfectSettings';
import AdvancedDSPPanel from '../components/AdvancedDSPPanel';
import AIFeaturesPanel from '../components/AIFeaturesPanel';
import AudioReactive3D from '../visualizer/AudioReactive3D';
import { PresetManager } from '../presets/PresetManager';

export const ProFeaturesPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'bitperfect' | 'dsp' | 'ai' | 'viz' | 'network'>('bitperfect');
  const [audioContext] = useState(() => new AudioContext());
  const [analyzerNode] = useState(() => {
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 2048;
    return analyzer;
  });

  const sections = [
    { id: 'bitperfect', name: 'Bit-Perfect Audio', icon: '🎧', color: 'cyan' },
    { id: 'dsp', name: 'Advanced DSP', icon: '🎛️', color: 'purple' },
    { id: 'ai', name: 'AI Features', icon: '🤖', color: 'pink' },
    { id: 'viz', name: '3D Visualizer', icon: '🎨', color: 'blue' },
    { id: 'network', name: 'Network Streaming', icon: '🌐', color: 'green' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-600 bg-clip-text text-transparent mb-2">
            ⚡ Pro Features
          </h1>
          <p className="text-slate-400 text-lg">
            World-class audio processing na dosah ruky
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeSection === section.id
                  ? `bg-${section.color}-500 text-white shadow-lg shadow-${section.color}-500/50`
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.name}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {activeSection === 'bitperfect' && <BitPerfectSettings />}

          {activeSection === 'dsp' && <AdvancedDSPPanel audioContext={audioContext} />}

          {activeSection === 'ai' && <AIFeaturesPanel />}

          {activeSection === 'viz' && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">3D Audio-Reactive Visualizer</h2>
                  <p className="text-sm text-slate-400">Particle grid + tančící postava sync s BPM</p>
                </div>
              </div>

              {/* Visualizer Container */}
              <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
                <AudioReactive3D
                  analyzer={analyzerNode}
                  settings={{
                    particleCount: 1000,
                    particleSize: 2,
                    particleColor: '#00ffff',
                    reactivityIntensity: 0.8,
                    showCharacter: true,
                    characterDanceIntensity: 0.9,
                  }}
                />
              </div>

              {/* Controls */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Particle Count</label>
                  <input
                    type="range"
                    min={100}
                    max={2000}
                    defaultValue={1000}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Reactivity</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    defaultValue={0.8}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-white font-medium">Show Dancing Character</div>
                    <div className="text-sm text-slate-400">Zobrazit tančící postavu sync s beaty</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeSection === 'network' && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🌐</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Network Streaming</h2>
                  <p className="text-sm text-slate-400">SMB, FTP, UPnP/DLNA, Chromecast</p>
                </div>
              </div>

              {/* Network Sources */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-3">Add Network Source</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                      <div className="text-2xl mb-2">📁</div>
                      <div className="text-white font-medium">SMB Share</div>
                      <div className="text-xs text-slate-400">Network folder</div>
                    </button>
                    <button className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                      <div className="text-2xl mb-2">🔐</div>
                      <div className="text-white font-medium">SFTP</div>
                      <div className="text-xs text-slate-400">Secure FTP</div>
                    </button>
                    <button className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                      <div className="text-2xl mb-2">📡</div>
                      <div className="text-white font-medium">UPnP/DLNA</div>
                      <div className="text-xs text-slate-400">Media servers</div>
                    </button>
                    <button className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                      <div className="text-2xl mb-2">📺</div>
                      <div className="text-white font-medium">Chromecast</div>
                      <div className="text-xs text-slate-400">Cast devices</div>
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="text-sm text-green-300">
                    💡 <strong>Poznámka:</strong> Network streaming vyžaduje server-side proxy
                    pro protokoly jako SMB, SFTP, FTP. HTTP/HTTPS streaming funguje přímo.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preset Sharing */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-4">💾 Preset Sharing</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => {
                  const presets = PresetManager.getAllPresets();
                  if (presets.length > 0) {
                    PresetManager.downloadPreset(presets[0].id, 'json');
                  }
                }}
                className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <div className="text-2xl mb-2">📄</div>
                <div className="text-white font-medium">Export JSON</div>
              </button>
              <button
                onClick={() => {
                  const presets = PresetManager.getAllPresets();
                  if (presets.length > 0) {
                    PresetManager.downloadPreset(presets[0].id, 'md');
                  }
                }}
                className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <div className="text-2xl mb-2">📝</div>
                <div className="text-white font-medium">Export Markdown</div>
              </button>
              <button
                onClick={async () => {
                  const presets = PresetManager.getAllPresets();
                  if (presets.length > 0) {
                    const url = PresetManager.exportToShareableURL(presets[0].id);
                    if (url) {
                      await navigator.clipboard.writeText(url);
                      alert('Shareable URL copied to clipboard!');
                    }
                  }
                }}
                className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <div className="text-2xl mb-2">🔗</div>
                <div className="text-white font-medium">Share URL</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProFeaturesPage;
