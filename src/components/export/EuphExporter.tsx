import React, { useState } from 'react';
import { EUPHEncoder } from '../../formats/EUPHEncoder';
import { useAudioStore } from '../../store/audioStore';
import { useAutoPlayer } from '../../hooks/useAutoPlayer';

interface Props {
  disabled?: boolean;
}

export const EuphExporter: React.FC<Props> = ({ disabled = false }) => {
  const { currentTrack } = useAudioStore();
  const player = useAutoPlayer();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  const handleExport = async () => {
    if (!currentTrack) {
      alert('No audio loaded to export');
      return;
    }

    setExporting(true);
    setProgress(0);
    setStage('');

    try {
      // 1. Get audio data from current source
      setStage('Loading audio data...');
      setProgress(10);

      const response = await fetch(currentTrack.url);
      const arrayBuffer = await response.arrayBuffer();
      
      // 2. Decode audio to get AudioBuffer
      setStage('Decoding audio...');
      setProgress(20);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

      // 3. Prepare metadata
      setStage('Preparing metadata...');
      setProgress(30);

      const dspSettingsJson = player.exportDspSettings();
      const dspSettings = JSON.parse(dspSettingsJson);

      const euphMetadata = {
        title: currentTrack.name || 'Untitled',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        bitDepth: 16, // Standard for WAV conversion
        encodingProfile: 'lossless' as const,
        enhancementData: {
          aiProcessed: false,
          dspSettings: dspSettings
        }
      };

      // 4. Create encoder and encode
      setStage('Encoding EUPH format...');
      setProgress(60);

      const encoder = new EUPHEncoder();
      const euphData = await encoder.encodeAudioBuffer(
        audioBuffer,
        euphMetadata,
        {
          profile: 'lossless',
          compressionLevel: 6,
          includeAIData: true,
          includeDSPSettings: true,
          enableIntegrityCheck: true
        },
        (progressValue, stageName) => {
          setProgress(60 + Math.floor(progressValue * 0.3)); // 60-90% range
          setStage(stageName);
        }
      );

      // 5. Download file
      setStage('Creating download...');
      setProgress(90);

      const blob = new Blob([euphData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTrack.name.replace(/[^a-z0-9]/gi, '_')}.euph`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStage('Export complete!');
      setProgress(100);

      setTimeout(() => {
        alert(`EUPH file "${a.download}" exported successfully!`);
      }, 100);

    } catch (error) {
      console.error('EUPH export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
        setStage('');
      }, 1000);
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg euph-exporter">
      <h3 className="mb-2 text-lg font-semibold text-white">Export to EUPH</h3>
      <p className="mb-4 text-sm text-gray-400">
        Save current track with DSP settings and metadata
      </p>

      <button
        onClick={handleExport}
        disabled={disabled || exporting || !currentTrack}
        className={`
          w-full px-4 py-2 rounded font-medium transition-colors
          ${exporting || !currentTrack
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
        `}
      >
        {exporting ? `Exporting... ${progress}%` : 'Export to .euph'}
      </button>

      {exporting && (
        <div className="mt-3">
          <div className="w-full h-2 bg-gray-700 rounded-full">
            <div
              className="h-2 transition-all duration-300 bg-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          {stage && (
            <p className="mt-1 text-xs text-center text-gray-400">
              {stage}
            </p>
          )}
        </div>
      )}

      {!currentTrack && (
        <p className="mt-2 text-xs text-center text-gray-500">
          Load a track to enable export
        </p>
      )}
    </div>
  );
};

/**
 * Convert AudioBuffer to interleaved Float32Array
 */
function audioBufferToFloat32Array(audioBuffer: AudioBuffer): Float32Array {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  
  // Create interleaved data
  const interleaved = new Float32Array(length * channels);
  
  for (let ch = 0; ch < channels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      interleaved[i * channels + ch] = channelData[i];
    }
  }
  
  return interleaved;
}

// CSS styles (can be moved to separate CSS file)
const styles = `
.euph-exporter {
  border: 1px solid #374151;
}

.euph-exporter button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.euph-exporter button:disabled {
  cursor: not-allowed;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default EuphExporter;
