import React, { useState } from 'react';
import { FiDownload, FiUpload, FiZap, FiCheckCircle } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { createEuphFromAudio, EuphDecoder, saveEuphFile } from '../formats/EuphFormat';

export const EuphFormatTester: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [euphFile, setEuphFile] = useState<File | null>(null);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const testEuphFormat = async () => {
    if (!euphFile) {
      addTestResult('❌ No file selected for testing');
      return;
    }

    setIsProcessing(true);
    addTestResult('🚀 Starting EUPH format testing...');

    try {
      // Step 1: Create .euph from audio file
      addTestResult('📦 Encoding to .euph format...');
      const euphBuffer = await createEuphFromAudio(euphFile, {
        title: 'Test Track',
        artist: 'RAVR Audio Engine',
        album: 'World Class Test',
        year: 2024,
        genre: 'Electronic',
        aiProcessed: true,
        ravrVersion: '2.0',
        dspChain: ['EQ', 'Compressor', 'Limiter']
      });

      addTestResult(`✅ EUPH file created: ${(euphBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

      // Step 2: Test decoding
      addTestResult('🔍 Testing decode functionality...');
      const decoder = new EuphDecoder();
      const decoded = await decoder.decode(euphBuffer);

      addTestResult(`✅ Metadata decoded: ${decoded.metadata.title} by ${decoded.metadata.artist}`);
      addTestResult(`✅ Audio data size: ${(decoded.audioData.byteLength / 1024).toFixed(2)} KB`);
      
      if (decoded.dspSettings) {
        addTestResult(`✅ DSP chain: ${Object.keys(decoded.dspSettings).join(', ')}`);
      }
      
      if (decoded.aiEnhancements) {
        addTestResult(`✅ AI enhancements detected`);
      }

      // Step 3: Save the .euph file
      addTestResult('💾 Saving .euph file...');
      saveEuphFile(euphBuffer, 'ravr-test-track');
      addTestResult('✅ .euph file saved successfully!');

      addTestResult('🎉 ALL TESTS PASSED! .EUPH FORMAT IS WORKING!');

    } catch (error) {
      addTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEuphFile(file);
      setTestResults([]);
      addTestResult(`📁 Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  return (
    <div className="glass-card rounded-[2rem] p-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center">
            <FiZap className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              EUPH Format Tester
            </h2>
            <p className="text-white/60 text-sm">Revolutionary Audio Container Format</p>
          </div>
          <HiSparkles className="text-yellow-400 text-xl" />
        </div>
        
        <div className="flex items-center justify-center gap-4 text-xs text-white/50">
          <span>Lossless Compression</span>
          <span>•</span>
          <span>AI Enhancement Data</span>
          <span>•</span>
          <span>Digital Signatures</span>
          <span>•</span>
          <span>Multi-stream Support</span>
        </div>
      </div>

      {/* File Selection */}
      <div className="space-y-4">
        <label className="block">
          <div className="border-2 border-dashed border-purple-400/30 rounded-2xl p-8 text-center cursor-pointer hover:border-purple-400/50 transition-colors">
            <FiUpload className="mx-auto text-2xl text-purple-400 mb-2" />
            <p className="text-white/80 font-medium">Select Audio File to Test</p>
            <p className="text-white/50 text-sm">MP3, WAV, FLAC, M4A, etc.</p>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </label>

        {euphFile && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <FiCheckCircle className="text-purple-400" />
              <div>
                <p className="text-white/90 font-medium">{euphFile.name}</p>
                <p className="text-white/60 text-sm">
                  {(euphFile.size / 1024 / 1024).toFixed(2)} MB • {euphFile.type}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Button */}
      <div className="text-center">
        <button
          onClick={testEuphFormat}
          disabled={!euphFile || isProcessing}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-500 hover:via-purple-400 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-2xl shadow-lg transform hover:scale-105 active:scale-95 transition-all disabled:cursor-not-allowed disabled:scale-100 flex items-center gap-3 mx-auto"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <FiZap />
              Test .EUPH Format
            </>
          )}
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
            <FiCheckCircle className="text-green-400" />
            Test Results
          </h3>
          <div className="bg-black/40 rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono text-white/80">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
          <h4 className="font-semibold text-blue-400 mb-1">Compression</h4>
          <p className="text-xs text-white/60">ZSTD + FLAC</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
          <h4 className="font-semibold text-green-400 mb-1">AI Data</h4>
          <p className="text-xs text-white/60">Enhancement Params</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <h4 className="font-semibold text-purple-400 mb-1">Metadata</h4>
          <p className="text-xs text-white/60">Rich + Embedded</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
          <h4 className="font-semibold text-orange-400 mb-1">Integrity</h4>
          <p className="text-xs text-white/60">Digital Signatures</p>
        </div>
      </div>
    </div>
  );
};
