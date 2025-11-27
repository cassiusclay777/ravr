import React, { useCallback, useState } from 'react';
import { AudioTrack } from '../audio/TrackDetector';
import { audioPlayer } from '../audio/AutoTrackDetection';
import { TrackList } from './TrackList';
import styled from 'styled-components';

const UploaderContainer = styled.div`
  margin: 20px 0;
`;

const DropZone = styled.div`
  border: 2px dashed #666;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 1rem;

  &:hover {
    border-color: #888;
    background: rgba(255, 255, 255, 0.05);
  }
`;

const LoadingIndicator = styled.div`
  padding: 1rem;
  text-align: center;
  color: #aaa;
`;

const UploadHeader = styled.h3`
  margin-bottom: 10px;
  color: #fff;
`;

export const AudioFileUploader: React.FC = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>();

  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setTracks([]);
    setSelectedTrackId(undefined);
    
    try {
      const loadedTracks = await audioPlayer.loadFile(files[0]);
      setTracks(loadedTracks);
      if (loadedTracks.length > 0) {
        setSelectedTrackId(loadedTracks[0].id);
      }
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Nepodařilo se načíst audio soubor');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileChange(e.dataTransfer.files);
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleTrackSelect = useCallback((track: AudioTrack, index: number) => {
    setSelectedTrackId(track.id);
    audioPlayer.setTrack(index);
  }, []);

  return (
    <UploaderContainer>
      <UploadHeader>Automatická detekce stop</UploadHeader>
      <DropZone
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('audio-upload')?.click()}
      >
        <p>Přetáhněte audio soubor sem nebo klikněte pro výběr</p>
        <p>Podporované formáty: MP3, WAV, FLAC, OGG, AAC a další</p>
        <input
          id="audio-upload"
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files)}
        />
      </DropZone>
      
      {isLoading && <LoadingIndicator>Načítání stop...</LoadingIndicator>}
      {tracks.length > 0 && (
        <TrackList 
          tracks={tracks} 
          onSelectTrack={handleTrackSelect}
          selectedTrackId={selectedTrackId}
        />
      )}
    </UploaderContainer>
  );
};
