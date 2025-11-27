import React, { useState, useRef, useEffect } from 'react';
import WaveformCanvas from './WaveformCanvas';
import AudioPreviewPlayer from './AudioPreviewPlayer';
import AudioInfo from './AudioInfo';
import { AudioDecoder, AudioMetadata } from './services/audioDecoder';
import { AudioAnalyzer, AnalyzeSettings } from './services/audioAnalyzer';
import { PlayerService } from './services/playerService';
import { AudioContextManager } from '../../audio/AudioContextManager';
import './styles/audioPreview.css';

interface AudioPreviewProps {
  file?: File;
  audioUrl?: string;
  className?: string;
  showWaveform?: boolean;
  showPlayer?: boolean;
  showInfo?: boolean;
  width?: number;
  height?: number;
}

export default function AudioPreview({
  file,
  audioUrl,
  className = '',
  showWaveform = true,
  showPlayer = true,
  showInfo = true,
  width = 800,
  height = 200,
}: AudioPreviewProps) {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [channelData, setChannelData] = useState<Float32Array[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisSettings, setAnalysisSettings] = useState<AnalyzeSettings | null>(null);

  const audioContextManagerRef = useRef<AudioContextManager | null>(null);
  const decoderRef = useRef<AudioDecoder | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const playerServiceRef = useRef<PlayerService | null>(null);

  // Initialize services
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audioContextManager = new AudioContextManager();
      audioContextManagerRef.current = audioContextManager;
      
      const decoder = new AudioDecoder(audioContextManager.context);
      decoderRef.current = decoder;
      
      const analyzer = new AudioAnalyzer(audioContextManager.context);
      analyzerRef.current = analyzer;
      
      const playerService = new PlayerService(audioContextManager);
      playerServiceRef.current = playerService;

      // Set up player service events
      playerService.onPlayStateChange((isPlaying) => {
        // Handle play state changes if needed
      });

      playerService.onTimeUpdate((currentTime) => {
        // Handle time updates if needed
      });

      playerService.onEnded(() => {
        // Handle playback ended if needed
      });

      playerService.onError((error) => {
        setError(`Playback error: ${error.message}`);
      });
    }

    return () => {
      if (playerServiceRef.current) {
        playerServiceRef.current.dispose();
      }
    };
  }, []);

  // Load audio file
  useEffect(() => {
    const loadAudio = async () => {
      if (!decoderRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        let decodedAudio;
        
        if (file) {
          decodedAudio = await decoderRef.current.decodeFile(file);
        } else if (audioUrl) {
          decodedAudio = await decoderRef.current.decodeFromUrl(audioUrl);
        } else {
          return;
        }

        setAudioBuffer(decodedAudio.audioBuffer);
        setMetadata(decodedAudio.metadata);
        setChannelData(decodedAudio.channelData);

        // Set up player service
        if (playerServiceRef.current) {
          playerServiceRef.current.setAudioBuffer(decodedAudio.audioBuffer);
        }

        // Set default analysis settings
        const defaultSettings = AudioAnalyzer.getDefaultSettings(decodedAudio.audioBuffer.duration);
        setAnalysisSettings(defaultSettings);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audio file');
        console.error('Audio loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [file, audioUrl]);

  const handleSeek = (time: number) => {
    if (playerServiceRef.current) {
      playerServiceRef.current.seek(time);
    }
  };

  const handleVolumeChange = (volume: number) => {
    if (playerServiceRef.current) {
      playerServiceRef.current.setVolume(volume);
    }
  };

  const handlePlayPause = (isPlaying: boolean) => {
    if (playerServiceRef.current) {
      if (isPlaying) {
        playerServiceRef.current.play();
      } else {
        playerServiceRef.current.pause();
      }
    }
  };

  if (isLoading) {
    return (
      <div className={`audio-preview-container ${className}`}>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading audio file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`audio-preview-container ${className}`}>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!audioBuffer || !metadata || channelData.length === 0) {
    return (
      <div className={`audio-preview-container ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <p>No audio file loaded</p>
          <p className="empty-hint">Drop an audio file here or use the file prop</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`audio-preview-container ${className}`}>
      {showWaveform && analysisSettings && (
        <div className="waveform-section">
          {channelData.map((channel, index) => (
            <WaveformCanvas
              key={index}
              width={width}
              height={height}
              sampleRate={metadata.sampleRate}
              channelData={channel}
              channelIndex={index}
              totalChannels={metadata.channels}
              minTime={analysisSettings.minTime}
              maxTime={analysisSettings.maxTime}
              minAmplitude={analysisSettings.minAmplitude}
              maxAmplitude={analysisSettings.maxAmplitude}
              waveformVerticalScale={analysisSettings.waveformVerticalScale}
            />
          ))}
        </div>
      )}

      {showPlayer && (
        <div className="player-section">
          <AudioPreviewPlayer
            audioBuffer={audioBuffer}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onPlayPause={handlePlayPause}
          />
        </div>
      )}

      {showInfo && (
        <div className="info-section">
          <AudioInfo metadata={metadata} />
        </div>
      )}
    </div>
  );
}

