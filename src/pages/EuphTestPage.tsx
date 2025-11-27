import React, { useState, useRef } from 'react';
import { EUPHCodec, EUPHMetadata } from '../formats/EUPHCodec';

export const EuphTestPage: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [encodedSize, setEncodedSize] = useState<number>(0);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const euphInputRef = useRef<HTMLInputElement>(null);

  const handleEncodeAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('Reading audio file...');
      const arrayBuffer = await file.arrayBuffer();
      setOriginalSize(arrayBuffer.byteLength);

      // Create metadata
      const metadata: EUPHMetadata = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        duration: 180, // 3 minutes example
        sampleRate: 44100,
        channels: 2,
        bitDepth: 16,
        encodingProfile: 'balanced'
      };

      // Encode to EUPH
      setStatus('Encoding to EUPH format...');
      const encoded = await EUPHCodec.encode(
        arrayBuffer,
        metadata,
        {
          profile: 'balanced',
          compressionLevel: 6,
          includeAIData: false,
          includeDSPSettings: false,
          enableIntegrityCheck: true
        },
        (prog, stage) => {
          setProgress(prog);
          setStatus(stage);
        }
      );

      setEncodedSize(encoded.byteLength);
      setStatus('✅ Encoding complete!');

      // Download encoded file
      const blob = new Blob([encoded], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.[^/.]+$/, '.euph');
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      setStatus(`❌ Error: ${error}`);
      console.error(error);
    }
  };

  const handleDecodeEuph = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('Reading EUPH file...');
      const arrayBuffer = await file.arrayBuffer();

      // Validate first
      if (!EUPHCodec.validate(arrayBuffer)) {
        throw new Error('Invalid EUPH file format');
      }

      // Get file info
      setStatus('Reading file info...');
      const info = await EUPHCodec.getInfo(arrayBuffer);
      setFileInfo(info);

      // Decode
      setStatus('Decoding EUPH file...');
      const decoded = await EUPHCodec.decode(
        arrayBuffer,
        (prog, stage) => {
          setProgress(prog);
          setStatus(stage);
        }
      );

      setStatus('✅ Decoding complete!');

      // Download decoded audio
      const blob = new Blob([decoded.audioData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.euph', '_decoded.wav');
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      setStatus(`❌ Error: ${error}`);
      console.error(error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const compressionRatio = originalSize > 0 ? ((1 - encodedSize / originalSize) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            📦 EUPH Format Codec
          </h1>
          <p className="text-gray-300 text-lg">
            Lossless audio compression with metadata and AI enhancement data
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-gray-400 text-sm mb-1">Original Size</div>
            <div className="text-2xl font-bold text-white">{formatBytes(originalSize)}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-gray-400 text-sm mb-1">EUPH Size</div>
            <div className="text-2xl font-bold text-blue-400">{formatBytes(encodedSize)}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-gray-400 text-sm mb-1">Compression</div>
            <div className="text-2xl font-bold text-green-400">{compressionRatio}%</div>
          </div>
        </div>

        {/* Encode Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">📥 Encode Audio → EUPH</h2>
          <p className="text-gray-300 mb-4">
            Convert audio files to EUPH format with compression and metadata
          </p>

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.flac"
            onChange={handleEncodeAudio}
            className="hidden"
          />

          <button
            onClick={() => audioInputRef.current?.click()}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-semibold text-lg"
          >
            Select Audio File to Encode
          </button>
        </div>

        {/* Decode Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">📤 Decode EUPH → Audio</h2>
          <p className="text-gray-300 mb-4">
            Extract audio data from EUPH files
          </p>

          <input
            ref={euphInputRef}
            type="file"
            accept=".euph"
            onChange={handleDecodeEuph}
            className="hidden"
          />

          <button
            onClick={() => euphInputRef.current?.click()}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all font-semibold text-lg"
          >
            Select EUPH File to Decode
          </button>
        </div>

        {/* Progress Section */}
        {progress > 0 && progress < 100 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">{status}</span>
              <span className="text-blue-400 font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status */}
        {status && (
          <div className={`rounded-lg p-4 mb-6 ${
            status.startsWith('✅')
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : status.startsWith('❌')
              ? 'bg-red-500/20 border border-red-500/30 text-red-400'
              : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
          }`}>
            <p className="font-semibold">{status}</p>
          </div>
        )}

        {/* File Info */}
        {fileInfo && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">📄 File Information</h3>
            <div className="space-y-2 text-gray-300">
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="font-mono text-blue-400">{fileInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span>Chunks:</span>
                <span className="font-mono text-blue-400">{fileInfo.chunkCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Size:</span>
                <span className="font-mono text-blue-400">{formatBytes(fileInfo.totalSize)}</span>
              </div>
              {fileInfo.metadata && (
                <>
                  <hr className="border-white/20 my-4" />
                  <div className="flex justify-between">
                    <span>Title:</span>
                    <span className="font-mono text-blue-400">{fileInfo.metadata.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Artist:</span>
                    <span className="font-mono text-blue-400">{fileInfo.metadata.artist}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sample Rate:</span>
                    <span className="font-mono text-blue-400">{fileInfo.metadata.sampleRate} Hz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Channels:</span>
                    <span className="font-mono text-blue-400">{fileInfo.metadata.channels}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-2">ℹ️ About EUPH Format</h3>
          <p className="text-gray-300 text-sm mb-3">
            EUPH (Enhanced Universal Processed Hybrid) is a lossless audio format with:
          </p>
          <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
            <li>Gzip compression for smaller file sizes</li>
            <li>Rich metadata support (title, artist, album, etc.)</li>
            <li>AI enhancement data storage</li>
            <li>DSP settings embedding</li>
            <li>CRC32 checksums for integrity</li>
            <li>Chunk-based structure for extensibility</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
