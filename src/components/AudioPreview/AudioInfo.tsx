import React from 'react';
import { AudioMetadata } from './services/audioDecoder';
import './styles/audioPreview.css';

interface AudioInfoProps {
  metadata: AudioMetadata;
  className?: string;
}

export default function AudioInfo({ metadata, className = '' }: AudioInfoProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const formatBitrate = (): string => {
    if (metadata.format === 'EUPH') {
      return 'Variable (EUPH)';
    }
    
    // Estimate bitrate based on format and quality
    const estimatedBitrate = metadata.bitDepth * metadata.sampleRate * metadata.channels;
    if (estimatedBitrate > 1000000) {
      return `${Math.round(estimatedBitrate / 1000000)} Mbps`;
    } else {
      return `${Math.round(estimatedBitrate / 1000)} kbps`;
    }
  };

  return (
    <div className={`audio-info ${className}`}>
      <div className="audio-info-header">
        <h3>Audio Information</h3>
      </div>
      
      <div className="audio-info-content">
        <div className="info-section">
          <h4>Basic Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Title:</span>
              <span className="info-value">{metadata.title}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Artist:</span>
              <span className="info-value">{metadata.artist}</span>
            </div>
            {metadata.album && (
              <div className="info-item">
                <span className="info-label">Album:</span>
                <span className="info-value">{metadata.album}</span>
              </div>
            )}
            {metadata.year && (
              <div className="info-item">
                <span className="info-label">Year:</span>
                <span className="info-value">{metadata.year}</span>
              </div>
            )}
            {metadata.genre && (
              <div className="info-item">
                <span className="info-label">Genre:</span>
                <span className="info-value">{metadata.genre}</span>
              </div>
            )}
          </div>
        </div>

        <div className="info-section">
          <h4>Technical Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Format:</span>
              <span className="info-value format-badge">{metadata.format}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Duration:</span>
              <span className="info-value">{formatDuration(metadata.duration)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Sample Rate:</span>
              <span className="info-value">{metadata.sampleRate.toLocaleString()} Hz</span>
            </div>
            <div className="info-item">
              <span className="info-label">Bit Depth:</span>
              <span className="info-value">{metadata.bitDepth} bit</span>
            </div>
            <div className="info-item">
              <span className="info-label">Channels:</span>
              <span className="info-value">
                {metadata.channels === 1 ? 'Mono' : 
                 metadata.channels === 2 ? 'Stereo' : 
                 `${metadata.channels} channels`}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Bitrate:</span>
              <span className="info-value">{formatBitrate()}</span>
            </div>
          </div>
        </div>

        {metadata.format === 'EUPH' && (
          <div className="info-section">
            <h4>EUPH Format Features</h4>
            <div className="euph-features">
              <div className="feature-item">
                <span className="feature-icon">🎵</span>
                <span className="feature-text">Lossless compression with GZIP</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span className="feature-text">Digital signatures for integrity</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🤖</span>
                <span className="feature-text">AI enhancement parameters</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎛️</span>
                <span className="feature-text">Embedded DSP settings</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

