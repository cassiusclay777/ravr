import React, { useRef, useEffect, useState } from 'react';

interface LUFSMeterProps {
  analyser: AnalyserNode;
  targetLUFS?: number;
}

export const LUFSMeter: React.FC<LUFSMeterProps> = ({ 
  analyser, 
  targetLUFS = -14 
}) => {
  const [momentaryLUFS, setMomentaryLUFS] = useState(-60);
  const [shortTermLUFS, setShortTermLUFS] = useState(-60);
  const [integratedLUFS, setIntegratedLUFS] = useState(-60);
  const [truePeak, setTruePeak] = useState(-60);
  const [rms, setRMS] = useState(-60);
  
  const momentaryBuffer = useRef<number[]>([]);
  const shortTermBuffer = useRef<number[]>([]);
  const integratedBuffer = useRef<number[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    const sampleRate = analyser.context.sampleRate;
    
    const calculateLUFS = (samples: Float32Array): number => {
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
      }
      const meanSquare = sum / samples.length;
      const lufs = -0.691 + 10 * Math.log10(meanSquare + 1e-10);
      return lufs;
    };
    
    const calculateRMS = (samples: Float32Array): number => {
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
      }
      return 20 * Math.log10(Math.sqrt(sum / samples.length) + 1e-10);
    };
    
    const calculateTruePeak = (samples: Float32Array): number => {
      let peak = 0;
      for (let i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]));
      }
      return 20 * Math.log10(peak + 1e-10);
    };
    
    const update = () => {
      animationRef.current = requestAnimationFrame(update);
      
      analyser.getFloatTimeDomainData(dataArray);
      
      const currentLUFS = calculateLUFS(dataArray);
      const currentRMS = calculateRMS(dataArray);
      const currentPeak = calculateTruePeak(dataArray);
      
      // Update buffers
      momentaryBuffer.current.push(currentLUFS);
      if (momentaryBuffer.current.length > 30) { // 400ms at 75fps
        momentaryBuffer.current.shift();
      }
      
      shortTermBuffer.current.push(currentLUFS);
      if (shortTermBuffer.current.length > 225) { // 3 seconds
        shortTermBuffer.current.shift();
      }
      
      integratedBuffer.current.push(currentLUFS);
      
      // Calculate averages
      const momentary = momentaryBuffer.current.reduce((a, b) => a + b, 0) / momentaryBuffer.current.length;
      const shortTerm = shortTermBuffer.current.reduce((a, b) => a + b, 0) / shortTermBuffer.current.length;
      const integrated = integratedBuffer.current.reduce((a, b) => a + b, 0) / integratedBuffer.current.length;
      
      setMomentaryLUFS(momentary);
      setShortTermLUFS(shortTerm);
      setIntegratedLUFS(integrated);
      setTruePeak(currentPeak);
      setRMS(currentRMS);
    };
    
    update();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]);

  const getMeterColor = (value: number, target: number): string => {
    const diff = Math.abs(value - target);
    if (diff < 1) return '#00ff00';
    if (diff < 3) return '#ffff00';
    if (diff < 6) return '#ff8800';
    return '#ff0000';
  };

  const MeterBar: React.FC<{ value: number; label: string; target?: number }> = ({ 
    value, 
    label, 
    target 
  }) => {
    const normalized = Math.max(0, Math.min(1, (value + 60) / 60));
    const color = target ? getMeterColor(value, target) : '#00ffcc';
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-16">{label}</span>
        <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden relative">
          <div 
            className="h-full transition-all duration-100"
            style={{ 
              width: `${normalized * 100}%`,
              backgroundColor: color
            }}
          />
          {target && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white opacity-50"
              style={{ left: `${((target + 60) / 60) * 100}%` }}
            />
          )}
        </div>
        <span className="text-xs text-gray-300 w-12 text-right">
          {value.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 p-4 rounded border border-gray-700 space-y-2">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Audio Meters</h3>
      
      <MeterBar value={momentaryLUFS} label="M-LUFS" target={targetLUFS} />
      <MeterBar value={shortTermLUFS} label="S-LUFS" target={targetLUFS} />
      <MeterBar value={integratedLUFS} label="I-LUFS" target={targetLUFS} />
      
      <div className="h-px bg-gray-700 my-2" />
      
      <MeterBar value={truePeak} label="True Peak" />
      <MeterBar value={rms} label="RMS" />
      
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>Target: {targetLUFS} LUFS</span>
        <span>Crest: {(truePeak - rms).toFixed(1)} dB</span>
      </div>
    </div>
  );
};
