/**
 * AdvancedDSPPanel - UI pro pokročilý DSP (EQ, Compressor, Reverb)
 */

import React, { useState, useEffect, useRef } from 'react';
import { AdvancedDSP, ParametricEQBand } from '../dsp/AdvancedDSP';

interface AdvancedDSPPanelProps {
  audioContext: AudioContext;
}

export const AdvancedDSPPanel: React.FC<AdvancedDSPPanelProps> = ({ audioContext }) => {
  const dspRef = useRef<AdvancedDSP | null>(null);
  const [activeTab, setActiveTab] = useState<'eq' | 'compressor' | 'reverb'>('eq');
  const [eqBands, setEqBands] = useState<ParametricEQBand[]>([]);
  const [compressorReduction, setCompressorReduction] = useState(0);

  useEffect(() => {
    // Initialize DSP
    dspRef.current = new AdvancedDSP(audioContext, 10); // 10-band EQ
    setEqBands(dspRef.current.getAllEQBands());

    // Monitor compressor reduction
    const interval = setInterval(() => {
      if (dspRef.current) {
        setCompressorReduction(dspRef.current.getCompressorReduction());
      }
    }, 100);

    return () => {
      clearInterval(interval);
      dspRef.current?.dispose();
    };
  }, [audioContext]);

  const handleEQChange = (index: number, gain: number) => {
    if (!dspRef.current) return;
    dspRef.current.setEQBand(index, { gain });
    setEqBands(dspRef.current.getAllEQBands());
  };

  const handleResetEQ = () => {
    if (!dspRef.current) return;
    dspRef.current.resetEQ();
    setEqBands(dspRef.current.getAllEQBands());
  };

  const handleCompressorChange = (param: string, value: number) => {
    if (!dspRef.current) return;
    dspRef.current.setCompressor({ [param]: value } as any);
  };

  const handleLoadImpulseResponse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!dspRef.current || !e.target.files?.[0]) return;
    try {
      await dspRef.current.loadImpulseResponseFromFile(e.target.files[0]);
      alert('Impulse Response loaded successfully!');
    } catch (error) {
      alert('Failed to load Impulse Response');
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
          <span className="text-2xl">🎛️</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Advanced DSP Chain</h2>
          <p className="text-sm text-slate-400">Professional audio processing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        {['eq', 'compressor', 'reverb'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-medium capitalize transition-all ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* EQ Tab */}
      {activeTab === 'eq' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">10-Band Parametric EQ</h3>
            <button
              onClick={handleResetEQ}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {eqBands.map((band, index) => (
              <div key={index} className="flex flex-col items-center">
                {/* Frequency label */}
                <div className="text-xs text-slate-400 mb-2 text-center">
                  {band.frequency >= 1000
                    ? `${(band.frequency / 1000).toFixed(1)}k`
                    : `${band.frequency}`}
                </div>

                {/* Vertical slider */}
                <div className="relative h-32 w-full flex justify-center">
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={band.gain}
                    onChange={(e) => handleEQChange(index, parseFloat(e.target.value))}
                    className="absolute h-32 w-6 appearance-none bg-transparent transform -rotate-90 origin-center"
                    style={{
                      background: 'linear-gradient(to right, #334155 0%, #334155 100%)',
                      accentColor: band.gain > 0 ? '#06b6d4' : band.gain < 0 ? '#ef4444' : '#64748b',
                    }}
                  />
                </div>

                {/* Gain value */}
                <div className={`text-xs font-mono mt-2 ${
                  band.gain > 0 ? 'text-cyan-400' : band.gain < 0 ? 'text-red-400' : 'text-slate-500'
                }`}>
                  {band.gain >= 0 ? '+' : ''}{band.gain.toFixed(1)} dB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compressor Tab */}
      {activeTab === 'compressor' && (
        <div className="space-y-6">
          {/* Reduction Meter */}
          <div className="p-4 bg-slate-900/50 rounded-lg">
            <div className="text-sm text-slate-400 mb-2">Gain Reduction</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-100"
                  style={{ width: `${Math.abs(compressorReduction) * 10}%` }}
                />
              </div>
              <div className="text-white font-mono text-sm w-16 text-right">
                {compressorReduction.toFixed(1)} dB
              </div>
            </div>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-white font-medium mb-2">Threshold</label>
            <input
              type="range"
              min={-60}
              max={0}
              step={1}
              defaultValue={-24}
              onChange={(e) => handleCompressorChange('threshold', parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>-60 dB</span>
              <span>0 dB</span>
            </div>
          </div>

          {/* Ratio */}
          <div>
            <label className="block text-white font-medium mb-2">Ratio</label>
            <input
              type="range"
              min={1}
              max={20}
              step={0.1}
              defaultValue={4}
              onChange={(e) => handleCompressorChange('ratio', parseFloat(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1:1</span>
              <span>20:1</span>
            </div>
          </div>

          {/* Attack */}
          <div>
            <label className="block text-white font-medium mb-2">Attack</label>
            <input
              type="range"
              min={0.001}
              max={0.1}
              step={0.001}
              defaultValue={0.005}
              onChange={(e) => handleCompressorChange('attack', parseFloat(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 ms</span>
              <span>100 ms</span>
            </div>
          </div>

          {/* Release */}
          <div>
            <label className="block text-white font-medium mb-2">Release</label>
            <input
              type="range"
              min={0.01}
              max={1}
              step={0.01}
              defaultValue={0.25}
              onChange={(e) => handleCompressorChange('release', parseFloat(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>10 ms</span>
              <span>1000 ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Reverb Tab */}
      {activeTab === 'reverb' && (
        <div className="space-y-6">
          {/* Load Impulse Response */}
          <div>
            <label className="block text-white font-medium mb-3">Impulse Response</label>
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="audio/*"
                onChange={handleLoadImpulseResponse}
                className="hidden"
                id="ir-upload"
              />
              <label
                htmlFor="ir-upload"
                className="cursor-pointer inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                📁 Load IR File
              </label>
              <p className="text-sm text-slate-400 mt-3">
                Podporované formáty: WAV, AIFF, FLAC
              </p>
            </div>
          </div>

          {/* Wet/Dry Mix */}
          <div>
            <label className="block text-white font-medium mb-2">Wet Mix</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              defaultValue={0.3}
              onChange={(e) => {
                if (dspRef.current) {
                  dspRef.current.setConvolutionReverb({ wet: parseFloat(e.target.value) });
                }
              }}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0% (Dry)</span>
              <span>100% (Wet)</span>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="text-sm text-blue-300">
              💡 <strong>Tip:</strong> Můžeš použít impulse responses z oblíbených prostor
              (koncertní sály, katedrály) nebo studio reverb presety.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedDSPPanel;
