import React, { useCallback, useState } from 'react';
import { AudioTrack, AutoTrackDetector } from '../audio/AutoTrackDetector';
import { BulkTrackDetector, ScanProgress, ScanResults } from '../audio/BulkTrackDetector';
import styled from 'styled-components';

const DetectorContainer = styled.div`
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

const DropZone = styled.div`
  border: 2px dashed #666;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  &:hover {
    border-color: #888;
    background: rgba(255, 255, 255, 0.05);
  }
`;

const UploadButton = styled.button`
  background: linear-gradient(to right, #4f46e5, #06b6d4);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.6rem 1.2rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const TrackList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-top: 1rem;
`;

const TrackItem = styled.div`
  padding: 0.5rem 1rem;
  margin: 0.5rem 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  
  &.selected {
    background: rgba(79, 70, 229, 0.3);
    border-left: 3px solid #4f46e5;
  }
`;

const TrackName = styled.div`
  font-weight: 500;
  font-size: 1.1rem;
  color: #fff;
`;

const TrackDetails = styled.div`
  font-size: 0.9rem;
  color: #aaa;
  margin-top: 0.3rem;
`;

const LoadingIndicator = styled.div`
  padding: 1rem;
  text-align: center;
  color: #aaa;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  
  .loader {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const FeedbackMessage = styled.div<{ type: 'success' | 'error' }>`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  background-color: ${props => props.type === 'success' ? 'rgba(46, 160, 67, 0.15)' : 'rgba(201, 40, 40, 0.15)'};
  color: ${props => props.type === 'success' ? '#4ade80' : '#f87171'};
`;

interface AudioTrackDetectorProps {
  onTrackDetected?: (track: AudioTrack) => void;
}

export const AudioTrackDetector: React.FC<AudioTrackDetectorProps> = ({ onTrackDetected }) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsLoading(true);
    try {
      const detectedTracks = await AutoTrackDetector.detectTracksFromFile(files[0]);
      setTracks(detectedTracks);
      
      // Pokud byla detekována stopa
      if (detectedTracks.length > 0) {
        setSelectedTrackId(detectedTracks[0].id);
        
        // Pokud je nastavený callback, předáme mu stopu
        if (onTrackDetected) {
          onTrackDetected(detectedTracks[0]);
        }
        
        setFeedback({
          message: `Úspěšně detekováno ${detectedTracks.length} stop${detectedTracks.length > 1 ? 'y' : 'a'}`,
          type: 'success'
        });
      } else {
        setFeedback({
          message: 'Nepodařilo se detekovat žádné stopy v souboru',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error detecting tracks:', error);
      setFeedback({
        message: 'Chyba při detekci stop: ' + (error instanceof Error ? error.message : 'Neznámá chyba'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [onTrackDetected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileChange(e.dataTransfer.files);
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <DetectorContainer>
      <DropZone
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <p>Přetáhněte audio soubor sem</p>
        <UploadButton onClick={() => document.getElementById('track-file-input')?.click()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Vybrat soubor
        </UploadButton>
        <input
          id="track-file-input"
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files)}
        />
      </DropZone>

      {isLoading && (
        <LoadingIndicator>
          <div className="loader"></div>
          Detekuji stopy...
        </LoadingIndicator>
      )}

      {feedback && (
        <FeedbackMessage type={feedback.type}>
          {feedback.message}
        </FeedbackMessage>
      )}

      {tracks.length > 0 && (
        <TrackList>
          <h3>Detekované stopy ({tracks.length})</h3>
          {tracks.map((track) => (
            <TrackItem 
              key={track.id}
              onClick={() => {
                setSelectedTrackId(track.id);
                if (onTrackDetected) {
                  onTrackDetected(track);
                }
              }}
              className={selectedTrackId === track.id ? 'selected' : ''}
            >
              <TrackName>{track.name}</TrackName>
              <TrackDetails>
                {track.artist && `Umělec: ${track.artist}`}
                {track.album && ` • Album: ${track.album}`}
                {` • Formát: ${track.format}`}
                {` • Trvání: ${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60).toString().padStart(2, '0')}`}
                {` • ${track.channels === 1 ? 'Mono' : 'Stereo'}`}
                {` • ${track.sampleRate / 1000} kHz`}
              </TrackDetails>
            </TrackItem>
          ))}
        </TrackList>
      )}
    </DetectorContainer>
  );
};
