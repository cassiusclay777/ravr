import React, { useEffect, useRef, useState } from 'react';
import { AudioContextManager } from '../audio/AudioContextManager';
import { createEQNode } from '../audio/nodes/EQNode';
import { createCompressorNode } from '../audio/nodes/CompressorNode';
import Visualizer from './Visualizer';

const AudioEngineTest: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [eqBands, setEqBands] = useState({
    low: 0,
    mid: 0,
    high: 0
  });
  
  const audioContextManager = useRef<AudioContextManager | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize audio context and nodes
  useEffect(() => {
    // Initialize audio context manager
    audioContextManager.current = new AudioContextManager();
    
    try {
      // Create DSP nodes
      audioContextManager.current.createGainNode('masterGain');
      audioContextManager.current.createEQNode('eq');
      audioContextManager.current.createCompressorNode('compressor');
      
      // Set up the audio graph
      audioContextManager.current.connectNodes('source', 'masterGain');
      audioContextManager.current.connectNodes('masterGain', 'eq');
      audioContextManager.current.connectNodes('eq', 'compressor');
      
      // Get the analyser node for visualization
      analyserRef.current = audioContextManager.current.getAnalyser();
      
      // Load test audio file
      loadAudio('/test-audio.mp3');
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
    
    return () => {
      // Cleanup
      if (audioContextManager.current) {
        audioContextManager.current.cleanup();
      }
    };
  }, []);

  // Update volume when it changes
  useEffect(() => {
    if (audioContextManager.current) {
      const gainNode = audioContextManager.current.getNode('masterGain');
      if (gainNode && 'node' in gainNode && gainNode.node instanceof GainNode) {
        gainNode.node.gain.value = volume;
      }
    }
  }, [volume]);

  // Update EQ bands when they change
  useEffect(() => {
    if (audioContextManager.current) {
      const eqNode = audioContextManager.current.getNode('eq') as any;
      if (eqNode) {
        eqNode.lowGain.value = eqBands.low;
        eqNode.midGain.value = eqBands.mid;
        eqNode.highGain.value = eqBands.high;
      }
    }
  }, [eqBands]);

  const loadAudio = async (url: string) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextManager.current!.context.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  };

  const togglePlayback = async () => {
    if (!audioContextManager.current || !audioBufferRef.current) return;
    
    const context = audioContextManager.current.context;
    
    if (isPlaying) {
      // Stop playback
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start playback
      await context.resume();
      
      // Create new source node
      const source = context.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.loop = true;
      
      // Connect to the audio graph
      audioContextManager.current.setSourceNode(source);
      
      // Start playback
      source.start();
      sourceNodeRef.current = source;
      setIsPlaying(true);
      
      // Set up onended handler
      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };
    }
  };

  const handleBandChange = (band: 'low' | 'mid' | 'high', value: number) => {
    setEqBands(prev => ({
      ...prev,
      [band]: value
    }));
  };

  return (
    <div className="audio-engine-test">
      <h2>Audio Engine Test</h2>
      
      <div className="controls">
        <button onClick={togglePlayback}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <div className="volume-control">
          <label>Volume:</label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>
        
        <div className="eq-controls">
          <div className="eq-band">
            <label>Bass</label>
            <input 
              type="range" 
              min="-12" 
              max="12" 
              step="0.5" 
              value={eqBands.low}
              onChange={(e) => handleBandChange('low', parseFloat(e.target.value))}
            />
          </div>
          
          <div className="eq-band">
            <label>Mid</label>
            <input 
              type="range" 
              min="-12" 
              max="12" 
              step="0.5" 
              value={eqBands.mid}
              onChange={(e) => handleBandChange('mid', parseFloat(e.target.value))}
            />
          </div>
          
          <div className="eq-band">
            <label>Treble</label>
            <input 
              type="range" 
              min="-12" 
              max="12" 
              step="0.5" 
              value={eqBands.high}
              onChange={(e) => handleBandChange('high', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
      
      {analyserRef.current && (
        <div className="visualizer-container">
          <Visualizer analyzer={analyserRef.current} />
        </div>
      )}
      
      <style>{`
        .audio-engine-test {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .controls {
          margin: 20px 0;
        }
        
        .volume-control, .eq-band {
          margin: 15px 0;
        }
        
        .eq-controls {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        
        .eq-band {
          flex: 1;
        }
        
        .visualizer-container {
          margin-top: 30px;
          height: 150px;
          background: #1a1a1a;
          border-radius: 8px;
          overflow: hidden;
        }
        
        button {
          padding: 10px 20px;
          font-size: 16px;
          cursor: pointer;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          margin-right: 15px;
        }
        
        button:hover {
          background: #357abd;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          color: #666;
        }
        
        input[type="range"] {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default AudioEngineTest;
