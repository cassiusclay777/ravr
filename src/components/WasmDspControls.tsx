import React, { useState } from 'react';
import { FiCpu, FiZap, FiSliders } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useAudioEngine } from '../hooks/useAudioEngine';

const WasmDspControls: React.FC = () => {
  const { wasmDsp, wasmEnabled, useWasm, setUseWasm, eq, setEq } = useAudioEngine();
  
  const [compressor, setCompressor] = useState({
    threshold: -20,
    ratio: 4,
    attack: 5,
    release: 100,
  });
  
  const [limiter, setLimiter] = useState({
    threshold: -0.5,
  });
  
  const [reverb, setReverb] = useState({
    mix: 0.2,
  });

  const handleEqChange = (band: 'low' | 'mid' | 'high', value: number) => {
    setEq(band, value);
  };

  const handleCompressorChange = (param: keyof typeof compressor, value: number) => {
    const newComp = { ...compressor, [param]: value };
    setCompressor(newComp);
    
    if (wasmDsp && wasmEnabled) {
      wasmDsp.setCompressor(newComp.threshold, newComp.ratio, newComp.attack, newComp.release);
    }
  };

  const handleLimiterChange = (value: number) => {
    setLimiter({ threshold: value });
    
    if (wasmDsp && wasmEnabled) {
      wasmDsp.setLimiter(value);
    }
  };

  const handleReverbChange = (value: number) => {
    setReverb({ mix: value });
    
    if (wasmDsp && wasmEnabled) {
      wasmDsp.setReverb(value);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiCpu className="text-cyan-400 text-2xl" />
          <div>
            <h3 className="text-xl font-bold text-white/90">WASM DSP Engine</h3>
            <p className="text-sm text-white/60">Ultra-low latency audio processing</p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          wasmEnabled 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-orange-500/20 text-orange-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            wasmEnabled ? 'bg-green-400 animate-pulse' : 'bg-orange-400'
          }`}></div>
          <span className="text-sm font-semibold">
            {wasmEnabled ? 'WASM Active' : 'Web Audio Fallback'}
          </span>
        </div>
      </div>

      {/* Toggle WASM */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
        <div className="flex items-center gap-2">
          <FiZap className="text-yellow-400" />
          <span className="text-white/80">Enable WASM Processing</span>
        </div>
        <button
          onClick={() => setUseWasm(!useWasm)}
          className={`w-12 h-6 rounded-full transition-all ${
            useWasm ? 'bg-cyan-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
            useWasm ? 'translate-x-6' : 'translate-x-1'
          }`}></div>
        </button>
      </div>

      {/* EQ Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FiSliders className="text-blue-400" />
          <h4 className="text-lg font-semibold text-white/90">3-Band Parametric EQ</h4>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Low */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Low (80Hz)</span>
              <span className="text-cyan-400 font-mono">{eq.low.toFixed(1)} dB</span>
            </div>
            <Slider
              min={-12}
              max={12}
              step={0.1}
              value={eq.low}
              onChange={(value) => handleEqChange('low', Array.isArray(value) ? value[0] : value)}
              styles={{
                track: { backgroundColor: 'rgb(34 197 94)', height: 6 },
                handle: { 
                  borderColor: 'rgb(34 197 94)', 
                  backgroundColor: '#ffffff',
                  height: 20,
                  width: 20,
                  marginTop: -7,
                },
                rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
              }}
            />
          </div>

          {/* Mid */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Mid (1kHz)</span>
              <span className="text-blue-400 font-mono">{eq.mid.toFixed(1)} dB</span>
            </div>
            <Slider
              min={-12}
              max={12}
              step={0.1}
              value={eq.mid}
              onChange={(value) => handleEqChange('mid', Array.isArray(value) ? value[0] : value)}
              styles={{
                track: { backgroundColor: 'rgb(59 130 246)', height: 6 },
                handle: { 
                  borderColor: 'rgb(59 130 246)', 
                  backgroundColor: '#ffffff',
                  height: 20,
                  width: 20,
                  marginTop: -7,
                },
                rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
              }}
            />
          </div>

          {/* High */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">High (10kHz)</span>
              <span className="text-purple-400 font-mono">{eq.high.toFixed(1)} dB</span>
            </div>
            <Slider
              min={-12}
              max={12}
              step={0.1}
              value={eq.high}
              onChange={(value) => handleEqChange('high', Array.isArray(value) ? value[0] : value)}
              styles={{
                track: { backgroundColor: 'rgb(147 51 234)', height: 6 },
                handle: { 
                  borderColor: 'rgb(147 51 234)', 
                  backgroundColor: '#ffffff',
                  height: 20,
                  width: 20,
                  marginTop: -7,
                },
                rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
              }}
            />
          </div>
        </div>
      </div>

      {/* Compressor Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HiSparkles className="text-orange-400" />
          <h4 className="text-lg font-semibold text-white/90">Dynamics Compressor</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Threshold</span>
              <span className="text-orange-400 font-mono">{compressor.threshold} dB</span>
            </div>
            <Slider
              min={-60}
              max={0}
              value={compressor.threshold}
              onChange={(value) => handleCompressorChange('threshold', Array.isArray(value) ? value[0] : value)}
              styles={{
                track: { backgroundColor: 'rgb(249 115 22)', height: 6 },
                handle: { 
                  borderColor: 'rgb(249 115 22)', 
                  backgroundColor: '#ffffff',
                  height: 20,
                  width: 20,
                  marginTop: -7,
                },
                rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
              }}
            />
          </div>

          {/* Ratio */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Ratio</span>
              <span className="text-orange-400 font-mono">{compressor.ratio}:1</span>
            </div>
            <Slider
              min={1}
              max={20}
              step={0.1}
              value={compressor.ratio}
              onChange={(value) => handleCompressorChange('ratio', Array.isArray(value) ? value[0] : value)}
              styles={{
                track: { backgroundColor: 'rgb(249 115 22)', height: 6 },
                handle: { 
                  borderColor: 'rgb(249 115 22)', 
                  backgroundColor: '#ffffff',
                  height: 20,
                  width: 20,
                  marginTop: -7,
                },
                rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
              }}
            />
          </div>

          {/* Attack */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Attack</span>
              <span className="text-orange-400 font-mono">{compressor.attack} ms</span>
            </div>
            <Slider
              min={0.1}
              max={100}
              step={0.1}
              value={compressor.attack}
              onChange={(value) => handleCompressorChange('attack', Array.isArray(value) ? value[0] : value)}
              styles={{
                track: { backgroundColor: 'rgb(249 115 22)', height: 6 },
                handle: { 
                  borderColor: 'rgb(249 115 22)', 
                  backgroundColor: '#ffffff',
                  height: 20,
                  width: 20,
                  marginTop: -7,
                },
                rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
              }}
            />
          </div>

          {/* Release */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Release</span>
              <span className="text-orange-400 font-mono">{compressor.release} ms</span>
            </div>
            <Slider
              min={10}
              max={1000}
              value={compressor.release}
              onChange={(value) => handleCompressorChange('release', Array.isArray(value) ? value[0] : value)}
              styles={{
                track: { backgroundColor: 'rgb(249 115 22)', height: 6 },
                handle: { 
                  borderColor: 'rgb(249 115 22)', 
                  backgroundColor: '#ffffff',
                  height: 20,
                  width: 20,
                  marginTop: -7,
                },
                rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
              }}
            />
          </div>
        </div>
      </div>

      {/* Limiter */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-white/90">Brick-wall Limiter</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/70">Threshold</span>
            <span className="text-red-400 font-mono">{limiter.threshold.toFixed(2)} dB</span>
          </div>
          <Slider
            min={-12}
            max={0}
            step={0.1}
            value={limiter.threshold}
            onChange={(value) => handleLimiterChange(Array.isArray(value) ? value[0] : value)}
            styles={{
              track: { backgroundColor: 'rgb(239 68 68)', height: 6 },
              handle: { 
                borderColor: 'rgb(239 68 68)', 
                backgroundColor: '#ffffff',
                height: 20,
                width: 20,
                marginTop: -7,
              },
              rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
            }}
          />
        </div>
      </div>

      {/* Reverb */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-white/90">Reverb</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/70">Wet/Dry Mix</span>
            <span className="text-cyan-400 font-mono">{(reverb.mix * 100).toFixed(0)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={reverb.mix}
            onChange={(value) => handleReverbChange(Array.isArray(value) ? value[0] : value)}
            styles={{
              track: { backgroundColor: 'rgb(6 182 212)', height: 6 },
              handle: { 
                borderColor: 'rgb(6 182 212)', 
                backgroundColor: '#ffffff',
                height: 20,
                width: 20,
                marginTop: -7,
              },
              rail: { backgroundColor: 'rgba(255,255,255,0.1)', height: 6 },
            }}
          />
        </div>
      </div>

      {/* Performance Stats */}
      {wasmEnabled && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <FiZap className="text-lg" />
            <span className="font-semibold">Performance Boost Active</span>
          </div>
          <div className="text-sm text-white/60 space-y-1">
            <p>✓ 10x faster DSP processing via Rust/WASM</p>
            <p>✓ Zero-latency audio worklet processing</p>
            <p>✓ SIMD-optimized algorithms</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasmDspControls;
