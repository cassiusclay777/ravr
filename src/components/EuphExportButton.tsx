/**
 * EUPH Export Button Component
 * Allows exporting current track to EUPH format with AI and DSP data
 */

import React, { useState } from 'react';
import { usePlayer } from '@/state/playerStore';
import { convertToEuph, downloadEuphFile } from '@/utils/euphHelper';
import type { EUPHMetadata } from '@/formats/EUPHCodec';

interface EuphExportButtonProps {
  className?: string;
  currentAudioUrl?: string;
  audioElement?: HTMLAudioElement | null;
}

export function EuphExportButton({ className, currentAudioUrl, audioElement }: EuphExportButtonProps) {
  const { current } = usePlayer();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    if (!current?.url && !currentAudioUrl) {
      alert('No track loaded to export');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(10);

      const url = current?.url || currentAudioUrl!;
      
      // Fetch the audio file
      const response = await fetch(url);
      const audioBlob = await response.blob();
      
      setExportProgress(30);

      // Get audio properties from audio element if available
      const duration = audioElement?.duration || current?.duration || 0;
      
      // Prepare metadata
      const metadata: Partial<EUPHMetadata> = {
        title: current?.name || 'Untitled',
        artist: current?.artist,
        album: current?.album,
        duration,
        sampleRate: 44100, // You could get this from AudioContext
        channels: 2,
        bitDepth: 16,
        encodingProfile: 'balanced',
      };

      setExportProgress(50);

      // Convert to EUPH
      const euphBlob = await convertToEuph(audioBlob, metadata, {
        includeAIData: true,
        includeDSPSettings: true,
        // TODO: Get actual AI and DSP data from your stores
      });

      setExportProgress(90);

      // Download
      const filename = current?.name?.replace(/\.[^/.]+$/, '') || 'audio';
      downloadEuphFile(euphBlob, filename);

      setExportProgress(100);
      
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Failed to export EUPH:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const isDisabled = (!current?.url && !currentAudioUrl) || isExporting;

  return (
    <button
      onClick={handleExport}
      disabled={isDisabled}
      className={`relative overflow-hidden px-4 py-2 rounded-lg font-medium transition-all ${
        isDisabled
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg'
      } ${className || ''}`}
      title="Export current track to EUPH format (with AI & DSP data)"
    >
      {/* Progress bar background */}
      {isExporting && (
        <div
          className="absolute inset-0 bg-white/20 transition-all duration-300"
          style={{ width: `${exportProgress}%` }}
        />
      )}
      
      {/* Button content */}
      <span className="relative flex items-center gap-2">
        {isExporting ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting... {exportProgress}%
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Export to EUPH ✨
          </>
        )}
      </span>
    </button>
  );
}
