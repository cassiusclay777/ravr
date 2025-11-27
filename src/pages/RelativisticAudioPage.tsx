import React, { useState } from 'react';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { RelativisticEffectsPanel } from '../components/effects/RelativisticEffectsPanel';
import { RelativisticVisualizer } from '../components/visualizers/RelativisticVisualizer';

export function RelativisticAudioPage() {
  const audioEngine = useAudioEngine();
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    await audioEngine.loadFile(file);
  };

  // Calculate metrics from current params
  const velocity = Math.sqrt(
    audioEngine.relativisticParams.velocity.x ** 2 +
    audioEngine.relativisticParams.velocity.y ** 2 +
    audioEngine.relativisticParams.velocity.z ** 2
  );

  const v = velocity; // Already normalized (0-1)
  const speedOfLight = 299792458;
  const velocityPercent = Math.round(v * 100);

  const lorentzFactor = v > 0 ? 1 / Math.sqrt(Math.max(0.0001, 1 - v * v)) : 1.0;
  const timeDilation = lorentzFactor;
  const dopplerFactor = v > 0 ? Math.sqrt((1 + v) / (1 - v)) : 1.0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          ⚡ Relativistic Audio Experience
        </h1>
        <p className="text-xl text-gray-400">
          Experience sound at near-light speed - powered by Einstein's theory of special relativity
        </p>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* File Upload Section */}
        <div className="bg-gray-900 rounded-lg p-8 border-2 border-dashed border-gray-700 hover:border-blue-500 transition-colors">
          <div className="text-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="space-y-4">
                <div className="text-6xl">🎵</div>
                <div>
                  <p className="text-xl font-semibold mb-2">
                    {fileName || 'Upload Audio File'}
                  </p>
                  <p className="text-sm text-gray-400">
                    Click to browse or drag & drop audio file
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Supports: MP3, WAV, FLAC, OGG, and more
                  </p>
                </div>
              </div>
            </label>
          </div>

          {/* Playback Controls */}
          {fileName && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={audioEngine.toggle}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors"
              >
                {audioEngine.isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>

              <div className="flex-1 max-w-md">
                <input
                  type="range"
                  min="0"
                  max={audioEngine.duration || 100}
                  value={audioEngine.currentTime}
                  onChange={(e) => audioEngine.seek(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatTime(audioEngine.currentTime)}</span>
                  <span>{formatTime(audioEngine.duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Volume:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioEngine.volume}
                  onChange={(e) => audioEngine.setVolume(Number(e.target.value))}
                  className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-400 w-12">
                  {Math.round(audioEngine.volume * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Relativistic Effects Panel */}
        {audioEngine.ctx && (
          <RelativisticEffectsPanel
            audioContext={audioEngine.ctx}
            enabled={audioEngine.relativisticEnabled}
            onToggle={audioEngine.setRelativisticEnabled}
            onParamsChange={audioEngine.setRelativisticParams}
          />
        )}

        {/* Visualizer */}
        {audioEngine.relativisticEnabled && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">📊 Real-Time Visualization</h2>
            <RelativisticVisualizer
              audioContext={audioEngine.ctx!}
              analyser={audioEngine.analyser}
              velocity={velocityPercent}
              timeDilation={timeDilation}
              dopplerFactor={dopplerFactor}
              enabled={audioEngine.relativisticEnabled}
            />
          </div>
        )}

        {/* Educational Section */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-8 border border-blue-500/30">
          <h2 className="text-2xl font-bold mb-4">🎓 The Physics Behind It</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-2">Special Relativity</h3>
              <p className="text-gray-300 mb-3">
                Einstein's theory states that time and space are not absolute. As you approach the speed of light,
                time slows down (time dilation) and lengths contract (Lorentz contraction).
              </p>
              <div className="bg-gray-900/50 p-3 rounded font-mono text-xs">
                γ = 1/√(1 - v²/c²)
              </div>
              <p className="text-gray-400 mt-2 text-xs">
                Lorentz factor (γ) determines how much time slows down
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Audio Effects</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>Pitch Shift:</strong> Doppler effect changes frequency as you move</li>
                <li>• <strong>Time Stretch:</strong> Audio plays slower due to time dilation</li>
                <li>• <strong>Waveform Distortion:</strong> Lorentz contraction affects wave shape</li>
                <li>• <strong>Gravitational Warping:</strong> Strong gravity bends spacetime</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">Real-World Examples</h3>
              <ul className="space-y-2 text-gray-300 text-xs">
                <li>• GPS satellites experience time 38 microseconds/day faster due to weaker gravity</li>
                <li>• Muons from cosmic rays live longer due to time dilation at 99.9% c</li>
                <li>• At 90% speed of light, time passes at 43% normal rate (γ ≈ 2.29)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">Try These Scenarios</h3>
              <ul className="space-y-2 text-gray-300 text-xs">
                <li>• <strong>Spaceship:</strong> Set velocity to 50% c and hear time slow down</li>
                <li>• <strong>Black Hole:</strong> Enable strong gravity to warp spacetime</li>
                <li>• <strong>Light Speed:</strong> Hit "Jump to Light Speed" for extreme effects!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-8">
          <p>
            Built with ❤️ using React, Web Audio API, and Einstein's equations
          </p>
          <p className="mt-2">
            E = mc² | c = 299,792,458 m/s | γ = 1/√(1 - v²/c²)
          </p>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
