import { useEffect, useRef, useState } from 'react';
import { DSPPresetName } from '../useAudioPlayer';

type EQProps = {
  audioContext: AudioContext | null;
  inputNode: AudioNode | null;
  outputNode: AudioNode | null;
  preset?: DSPPresetName;
  onUpdate?: (filters: {
    low: BiquadFilterNode;
    mid: BiquadFilterNode;
    high: BiquadFilterNode;
  }) => void;
};

export default function EQ({ 
  audioContext, 
  inputNode, 
  outputNode, 
  preset = 'flat',
  onUpdate 
}: EQProps) {
  const [lowGain, setLowGain] = useState(0);
  const [midGain, setMidGain] = useState(0);
  const [highGain, setHighGain] = useState(0);
  
  const lowRef = useRef<BiquadFilterNode | null>(null);
  const midRef = useRef<BiquadFilterNode | null>(null);
  const highRef = useRef<BiquadFilterNode | null>(null);
  const inputGainRef = useRef<GainNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const lowGainRef = useRef<GainNode | null>(null);
  const midGainRef = useRef<GainNode | null>(null);
  const highGainRef = useRef<GainNode | null>(null);
  
  // Initialize audio nodes
  useEffect(() => {
    if (!audioContext || !inputNode || !outputNode) return;
    
    // Create nodes
    const inputGain = audioContext.createGain();
    const outputGain = audioContext.createGain();
    const lowGainNode = audioContext.createGain();
    const midGainNode = audioContext.createGain();
    const highGainNode = audioContext.createGain();
    
    // Create filters
    const low = audioContext.createBiquadFilter();
    const mid = audioContext.createBiquadFilter();
    const high = audioContext.createBiquadFilter();
    
    // Configure filters
    low.type = 'lowshelf';
    low.frequency.value = 250;
    low.gain.value = 0;
    
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 1;
    mid.gain.value = 0;
    
    high.type = 'highshelf';
    high.frequency.value = 4000;
    high.gain.value = 0;
    
    // Store refs
    inputGainRef.current = inputGain;
    outputGainRef.current = outputGain;
    lowGainRef.current = lowGainNode;
    midGainRef.current = midGainNode;
    highGainRef.current = highGainNode;
    lowRef.current = low;
    midRef.current = mid;
    highRef.current = high;
    
    // Connect nodes
    inputNode.connect(inputGain);
    
    // Split into three bands
    inputGain.connect(low);
    inputGain.connect(mid);
    inputGain.connect(high);
    
    // Connect each band to its own gain
    low.connect(lowGainNode);
    mid.connect(midGainNode);
    high.connect(highGainNode);
    
    // Connect gains to output
    lowGainNode.connect(outputGain);
    midGainNode.connect(outputGain);
    highGainNode.connect(outputGain);
    
    // Connect to output node
    outputGain.connect(outputNode);
    
    // Notify parent component about the filters
    if (onUpdate) {
      onUpdate({ low, mid, high });
    }
    
    // Cleanup
    return () => {
      inputGain.disconnect();
      outputGain.disconnect();
      low.disconnect();
      mid.disconnect();
      high.disconnect();
      lowGainNode.disconnect();
      midGainNode.disconnect();
      highGainNode.disconnect();
    };
  }, [audioContext, inputNode, outputNode, onUpdate]);
  
  // Apply preset when it changes
  useEffect(() => {
    if (!lowRef.current || !midRef.current || !highRef.current) return;
    
    switch (preset) {
      case 'flat':
        setBandGains(0, 0, 0);
        break;
      case 'neutron':
        setBandGains(4, 2, 6);
        break;
      case 'ambient':
        setBandGains(6, -2, 4);
        break;
      case 'voice':
        setBandGains(-4, 8, 6);
        break;
    }
  }, [preset]);
  
  const setBandGains = (low: number, mid: number, high: number) => {
    const now = audioContext?.currentTime || 0;
    lowRef.current?.gain.linearRampToValueAtTime(low, now + 0.1);
    midRef.current?.gain.linearRampToValueAtTime(mid, now + 0.1);
    highRef.current?.gain.linearRampToValueAtTime(high, now + 0.1);
    setLowGain(low);
    setMidGain(mid);
    setHighGain(high);
  };
  
  const handleLowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBandGains(value, midGain, highGain);
  };
  
  const handleMidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBandGains(lowGain, value, highGain);
  };
  
  const handleHighChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBandGains(lowGain, midGain, value);
  };
  
  if (!audioContext || !inputNode || !outputNode) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg text-center">
        <p className="text-gray-400">Audio not initialized</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-white">Equalizer</h3>
      <div className="grid grid-cols-3 gap-4">
        {/* Low (Bass) */}
        <div className="flex flex-col items-center">
          <label className="text-sm text-gray-300 mb-1">Bass (250Hz)</label>
          <div className="h-40 flex items-end mb-2">
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={lowGain}
              onChange={handleLowChange}
              className="h-32 w-12 -rotate-90 accent-purple-500"
              aria-label="Bass control"
            />
          </div>
          <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded">
            {lowGain > 0 ? '+' : ''}{lowGain.toFixed(1)} dB
          </span>
        </div>
        
        {/* Mid */}
        <div className="flex flex-col items-center">
          <label className="text-sm text-gray-300 mb-1">Mid (1kHz)</label>
          <div className="h-40 flex items-end mb-2">
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={midGain}
              onChange={handleMidChange}
              className="h-32 w-12 -rotate-90 accent-purple-500"
              aria-label="Mid control"
            />
          </div>
          <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded">
            {midGain > 0 ? '+' : ''}{midGain.toFixed(1)} dB
          </span>
        </div>
        
        {/* High (Treble) */}
        <div className="flex flex-col items-center">
          <label className="text-sm text-gray-300 mb-1">Treble (4kHz)</label>
          <div className="h-40 flex items-end mb-2">
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={highGain}
              onChange={handleHighChange}
              className="h-32 w-12 -rotate-90 accent-purple-500"
              aria-label="Treble control"
            />
          </div>
          <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded">
            {highGain > 0 ? '+' : ''}{highGain.toFixed(1)} dB
          </span>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>Preset: {preset}</span>
        <div className="space-x-2">
          <button 
            onClick={() => setBandGains(0, 0, 0)}
            className="hover:text-white"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
