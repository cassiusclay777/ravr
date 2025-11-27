import React, { useState, useRef } from 'react';
import { FiZap, FiCpu, FiGlobe, FiPlay, FiPause, FiUpload } from 'react-icons/fi';
import { QuantumAudioProcessor, QUANTUM_PRESETS } from '../quantum/QuantumAudioProcessor';
import { NeuralAudioSynthesizer, NEURAL_PRESETS } from '../neural/NeuralAudioSynthesizer';
import { HolographicAudioEngine, HOLOGRAPHIC_PRESETS } from '../holographic/HolographicAudioEngine';

export const NextLevelAudioPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quantum' | 'neural' | 'holographic'>('quantum');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [processedAudio, setProcessedAudio] = useState<AudioBuffer | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const quantumProcessor = useRef(new QuantumAudioProcessor());
  const neuralSynthesizer = useRef(new NeuralAudioSynthesizer());
  const holographicEngine = useRef(new HolographicAudioEngine());

  const addResult = (result: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      addResult(`📁 Selected file: ${file.name}`);
    }
  };

  const processWithQuantum = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    addResult('🪐 Starting quantum audio processing...');

    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      setProcessingProgress(30);
      addResult('🌀 Applying quantum superposition...');

      // Process with quantum audio
      const quantumBuffer = await quantumProcessor.current.processWithSuperposition(audioBuffer);
      
      setProcessingProgress(70);
      addResult('🔗 Applying quantum entanglement...');

      // Apply quantum noise reduction
      const cleanBuffer = await quantumProcessor.current.applyQuantumNoiseReduction(quantumBuffer);
      
      setProcessingProgress(100);
      setProcessedAudio(cleanBuffer);
      
      const metrics = quantumProcessor.current.getQuantumMetrics();
      addResult(`✅ Quantum processing complete! Efficiency: ${(metrics.superpositionEfficiency * 100).toFixed(1)}%`);
      addResult(`📊 Noise reduction: ${(metrics.noiseReduction * 100).toFixed(1)}%`);

    } catch (error) {
      addResult(`❌ Quantum processing failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processWithNeural = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    addResult('🧠 Starting neural audio synthesis...');

    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      setProcessingProgress(20);
      addResult('🎵 Generating neural enhancements...');

      // Apply neural style transfer
      const styledBuffer = await neuralSynthesizer.current.applyStyleTransfer(audioBuffer, {
        genre: 'electronic',
        mood: 'energetic',
        instrument: 'synth',
        tempo: 128,
        complexity: 0.7
      });

      setProcessingProgress(60);
      addResult('✨ Applying neural effects...');

      // Apply neural enhancement
      const enhancedBuffer = await neuralSynthesizer.current.applyNeuralEffects(styledBuffer, 'enhance');

      setProcessingProgress(100);
      setProcessedAudio(enhancedBuffer);
      addResult('✅ Neural synthesis complete! Audio transformed with AI');

    } catch (error) {
      addResult(`❌ Neural synthesis failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processWithHolographic = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    addResult('🌌 Starting holographic audio processing...');

    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      setProcessingProgress(25);
      addResult('🎯 Calculating 3D wave fields...');

      // Process with holographic spatialization
      const spatialBuffer = await holographicEngine.current.processAudioHolographic(
        audioBuffer,
        [2, 1.5, 3] // Position in 3D space
      );

      setProcessingProgress(75);
      addResult('🌊 Applying wave field synthesis...');

      // Create moving sound source for dynamic experience
      const movingSourceId = holographicEngine.current.createMovingSoundSource(
        spatialBuffer,
        [1, 1, 1],
        [
          [1, 1, 1],
          [3, 1, 2],
          [2, 2, 3],
          [1, 1, 1]
        ],
        2 // speed
      );

      setProcessingProgress(100);
      setProcessedAudio(spatialBuffer);
      addResult(`✅ Holographic processing complete! Moving source: ${movingSourceId}`);
      addResult('🎧 Experience true 3D spatial audio!');

    } catch (error) {
      addResult(`❌ Holographic processing failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const playProcessedAudio = () => {
    if (!processedAudio) return;

    const audioContext = new AudioContext();
    const source = audioContext.createBufferSource();
    source.buffer = processedAudio;
    source.connect(audioContext.destination);
    source.start();
    
    addResult('▶️ Playing processed audio...');
  };

  const downloadProcessedAudio = async () => {
    if (!processedAudio) return;

    // Convert AudioBuffer to WAV for download
    const wavBuffer = audioBufferToWav(processedAudio);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextlevel-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addResult('💾 Downloaded processed audio as WAV file');
  };

  // Simple AudioBuffer to WAV converter
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    
    const interleaved = new Float32Array(length * channels);
    for (let channel = 0; channel < channels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        interleaved[i * channels + channel] = channelData[i];
      }
    }
    
    return interleaved.buffer;
  };

  return (
    <div className="glass-card rounded-[2rem] p-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="mb-2 text-3xl font-bold text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text">
          🚀 Next-Level Audio Upgrades
        </h2>
        <p className="text-white/60">Experience the future of audio processing</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setActiveTab('quantum')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'quantum'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          <FiZap className="inline mr-2" />
          Quantum Audio
        </button>
        <button
          onClick={() => setActiveTab('neural')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'neural'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          <FiCpu className="inline mr-2" />
          Neural Synthesis
        </button>
        <button
          onClick={() => setActiveTab('holographic')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'holographic'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          <FiGlobe className="inline mr-2" />
          Holographic 3D
        </button>
      </div>

      {/* File Selection */}
      <div className="space-y-4">
        <label className="block">
          <div className="p-6 text-center transition-colors border-2 border-dashed cursor-pointer border-white/30 rounded-2xl hover:border-white/50">
            <FiUpload className="mx-auto mb-2 text-2xl text-white/60" />
            <p className="font-medium text-white/80">Select Audio File</p>
            <p className="text-sm text-white/50">MP3, WAV, FLAC, etc.</p>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </label>

        {audioFile && (
          <div className="p-4 bg-white/10 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-white/90">{audioFile.name}</p>
                <p className="text-sm text-white/60">
                  {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Controls */}
      <div className="space-y-4">
        {activeTab === 'quantum' && (
          <button
            onClick={processWithQuantum}
            disabled={!audioFile || isProcessing}
            className="w-full px-6 py-4 font-bold text-white transition-all transform shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 rounded-2xl hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 rounded-full border-white/30 border-t-white animate-spin"></div>
                Quantum Processing... {processingProgress}%
              </>
            ) : (
              <>
                <FiZap className="inline mr-2" />
                Apply Quantum Processing
              </>
            )}
          </button>
        )}

        {activeTab === 'neural' && (
          <button
            onClick={processWithNeural}
            disabled={!audioFile || isProcessing}
            className="w-full px-6 py-4 font-bold text-white transition-all transform shadow-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 rounded-2xl hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 rounded-full border-white/30 border-t-white animate-spin"></div>
                Neural Processing... {processingProgress}%
              </>
            ) : (
              <>
                <FiCpu className="inline mr-2" />
                Apply Neural Synthesis
              </>
            )}
          </button>
        )}

        {activeTab === 'holographic' && (
          <button
            onClick={processWithHolographic}
            disabled={!audioFile || isProcessing}
            className="w-full px-6 py-4 font-bold text-white transition-all transform shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 rounded-2xl hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 rounded-full border-white/30 border-t-white animate-spin"></div>
                Holographic Processing... {processingProgress}%
              </>
            ) : (
              <>
                <FiGlobe className="inline mr-2" />
                Apply Holographic 3D
              </>
            )}
          </button>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="w-full h-2 rounded-full bg-white/10">
            <div
              className="h-2 transition-all duration-300 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white/90">Processing Results</h3>
          <div className="p-4 space-y-2 overflow-y-auto bg-black/40 rounded-xl max-h-64">
            {results.map((result, index) => (
              <div key={index} className="font-mono text-sm text-white/80">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio Controls */}
      {processedAudio && (
        <div className="flex space-x-4">
          <button
            onClick={playProcessedAudio}
            className="flex-1 px-4 py-3 font-semibold text-white transition-all bg-green-600 hover:bg-green-500 rounded-xl"
          >
            <FiPlay className="inline mr-2" />
            Play Result
          </button>
          <button
            onClick={downloadProcessedAudio}
            className="flex-1 px-4 py-3 font-semibold text-white transition-all bg-blue-600 hover:bg-blue-500 rounded-xl"
          >
            <FiUpload className="inline mr-2" />
            Download
          </button>
        </div>
      )}

      {/* Feature Descriptions */}
      <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-3">
        <div className="p-4 border bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 rounded-xl">
          <h4 className="mb-2 font-semibold text-blue-400">Quantum Audio</h4>
          <p className="text-xs text-white/60">
            Parallel processing with quantum superposition and entanglement
          </p>
        </div>
        <div className="p-4 border bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 rounded-xl">
          <h4 className="mb-2 font-semibold text-green-400">Neural Synthesis</h4>
          <p className="text-xs text-white/60">
            AI-powered style transfer and audio generation
          </p>
        </div>
        <div className="p-4 border bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 rounded-xl">
          <h4 className="mb-2 font-semibold text-purple-400">Holographic 3D</h4>
          <p className="text-xs text-white/60">
            True 3D spatial audio with wave field synthesis
          </p>
        </div>
      </div>
    </div>
  );
};
