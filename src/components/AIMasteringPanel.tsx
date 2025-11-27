import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import AIMastering, { Genre } from '../ai/AIMastering';

const GENRES: Genre[] = ['pop', 'rock', 'classical', 'jazz', 'electronic', 'hiphop', 'metal'];

const GENRE_DESCRIPTIONS: Record<Genre, string> = {
  pop: '🎤 Bright vocals, punchy mids',
  rock: '🎸 Full bass, crisp highs',
  classical: '🎻 Natural dynamics, minimal processing',
  jazz: '🎷 Warm lows, smooth highs',
  electronic: '🎹 Deep bass, sparkling highs',
  hiphop: '🎧 Heavy bass, clear vocals',
  metal: '🤘 Powerful low-end, aggressive mids'
};

function AIMasteringPanel() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [intensity, setIntensity] = useState(70);
  const [selectedGenre, setSelectedGenre] = useState<Genre>('pop');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'processing' | 'done' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const masteringEngine = useRef<AIMastering | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const processedBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    const init = async () => {
      setStatus('loading');
      setStatusMessage('Loading AI engine...');
      
      masteringEngine.current = new AIMastering();
      try {
        await masteringEngine.current.initialize(selectedGenre);
        setStatus('ready');
        setStatusMessage('Ready - Upload an audio file');
      } catch (error) {
        console.error('Init error:', error);
        setStatus('ready');
        setStatusMessage('Ready (DSP mode) - Upload an audio file');
      }
    };

    init();

    return () => {
      if (masteringEngine.current) {
        masteringEngine.current.dispose();
      }
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch {}
      }
    };
  }, []);

  const handleGenreChange = async (genre: Genre) => {
    if (masteringEngine.current && !isProcessing) {
      setSelectedGenre(genre);
      await masteringEngine.current.changeGenre(genre);
      setStatusMessage(`Genre: ${genre.charAt(0).toUpperCase() + genre.slice(1)}`);
    }
  };

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIntensity = parseInt(e.target.value);
    setIntensity(newIntensity);
    if (masteringEngine.current) {
      masteringEngine.current.setIntensity(newIntensity / 100);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !masteringEngine.current) return;

    setFileName(file.name);
    setIsProcessing(true);
    setStatus('processing');
    setStatusMessage('Decoding audio...');
    setProgress(10);

    try {
      // Create AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      
      // Resume if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      setProgress(20);
      setStatusMessage('Reading file...');

      // Read file
      const arrayBuffer = await file.arrayBuffer();
      
      setProgress(40);
      setStatusMessage('Decoding audio data...');

      // Decode audio
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      setProgress(60);
      setStatusMessage(`Processing with ${selectedGenre} preset...`);

      // Process with AI Mastering
      const processedBuffer = await masteringEngine.current.process(audioBuffer);
      processedBufferRef.current = processedBuffer;
      
      setProgress(90);
      setStatusMessage('Starting playback...');

      // Stop previous playback
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch {}
      }
      
      // Create new source and play
      const source = audioContext.createBufferSource();
      source.buffer = processedBuffer;
      source.connect(audioContext.destination);
      source.start();
      sourceNodeRef.current = source;
      
      source.onended = () => {
        setStatusMessage('Playback finished - Ready');
      };

      setProgress(100);
      setStatus('done');
      setStatusMessage('✅ Playing mastered audio!');
      
    } catch (error) {
      console.error('Processing error:', error);
      setStatus('error');
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = () => {
    if (sourceNodeRef.current) {
      try { 
        sourceNodeRef.current.stop();
        setStatusMessage('Stopped - Ready');
      } catch {}
    }
  };

  const handleDownload = () => {
    if (!processedBufferRef.current || !audioContextRef.current) return;

    const buffer = processedBufferRef.current;
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mastered_${fileName || 'audio'}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ai-mastering-panel p-6 bg-gray-800/80 backdrop-blur rounded-xl shadow-2xl text-white border border-white/10">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <span className="text-3xl">🎚️</span> AI Mastering
      </h2>
      <p className="text-white/60 text-sm mb-6">Automatic mastering with genre-specific presets</p>
      
      {/* Genre Selection */}
      <div className="mb-6">
        <fieldset className="border border-gray-600/50 rounded-lg p-4">
          <legend className="text-sm font-medium px-2 text-cyan-400">Genre Preset</legend>
          <div className="flex flex-wrap gap-2 mb-2">
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => handleGenreChange(genre)}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedGenre === genre
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-700/70 text-gray-300 hover:bg-gray-600/70'
                } disabled:opacity-50`}
              >
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/50 mt-2">{GENRE_DESCRIPTIONS[selectedGenre]}</p>
        </fieldset>
      </div>
      
      {/* Intensity Slider */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Intensity: <span className="text-cyan-400">{intensity}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={intensity}
          onChange={handleIntensityChange}
          disabled={isProcessing}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <div className="flex justify-between text-xs text-white/40 mt-1">
          <span>Subtle</span>
          <span>Balanced</span>
          <span>Aggressive</span>
        </div>
      </div>
      
      {/* File Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Upload Audio</label>
        <div className="flex items-center gap-3">
          <label className={`px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all ${
            isProcessing 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500'
          }`}>
            <input
              type="file"
              accept=".mp3,.wav,.flac,.aac,.ogg,.m4a"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
            {isProcessing ? '⏳ Processing...' : '📂 Choose File'}
          </label>
          {fileName && (
            <span className="text-sm text-white/70 truncate max-w-[200px]">{fileName}</span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mb-4">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Status */}
      <div className={`p-4 rounded-lg text-sm ${
        status === 'error' ? 'bg-red-900/50 border border-red-500/50' :
        status === 'done' ? 'bg-green-900/50 border border-green-500/50' :
        status === 'processing' ? 'bg-cyan-900/50 border border-cyan-500/50' :
        'bg-gray-700/50 border border-gray-600/50'
      }`}>
        <span className="font-medium">Status:</span> {statusMessage}
      </div>

      {/* Action Buttons */}
      {status === 'done' && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            ⏹️ Stop
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg transition-colors"
          >
            💾 Download WAV
          </button>
        </div>
      )}
    </div>
  );
}

export default AIMasteringPanel;
