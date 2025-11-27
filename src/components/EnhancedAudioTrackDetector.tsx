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

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
`;

const UploadButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => props.variant === 'secondary' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'linear-gradient(to right, #4f46e5, #06b6d4)'};
  color: white;
  border: ${props => props.variant === 'secondary' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
  border-radius: 4px;
  padding: 0.6rem 1.2rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: ${props => props.variant === 'secondary' 
      ? 'rgba(255, 255, 255, 0.15)' 
      : 'linear-gradient(to right, #5b52f0, #0891b2)'};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin: 1rem 0;
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(to right, #4f46e5, #06b6d4);
    transition: width 0.3s ease;
  }
`;

const ScanStatus = styled.div`
  text-align: center;
  color: #ddd;
  font-size: 0.9rem;
  margin: 0.5rem 0;
  
  .current-file {
    color: #aaa;
    font-size: 0.8rem;
    margin-top: 0.25rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
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

const ResultsSummary = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
  
  .summary-title {
    color: #fff;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
    color: #ddd;
    font-size: 0.9rem;
  }
  
  .stat {
    .label { color: #aaa; }
    .value { color: #fff; font-weight: 500; }
  }
`;

const TrackList = styled.div`
  max-height: 400px;
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

interface EnhancedAudioTrackDetectorProps {
  onTrackDetected?: (track: AudioTrack) => void;
  onTracksLoaded?: (tracks: AudioTrack[]) => void;
}

export const EnhancedAudioTrackDetector: React.FC<EnhancedAudioTrackDetectorProps> = ({ onTrackDetected, onTracksLoaded }) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);

  const handleFileChange = useCallback(async (files: FileList | null, isBulk = false) => {
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setFeedback(null);
    setScanResults(null);
    
    try {
      if (isBulk || files.length > 1) {
        // Bulk processing
        const results = await BulkTrackDetector.scanMultipleFiles(files, (progress) => {
          setScanProgress(progress);
        });
        
        setScanResults(results);
        setTracks(results.tracks);
        
        if (onTracksLoaded) {
          onTracksLoaded(results.tracks);
        }
        
        if (results.tracks.length > 0) {
          setSelectedTrackId(results.tracks[0].id);
          if (onTrackDetected) {
            onTrackDetected(results.tracks[0]);
          }
        }
        
        setFeedback({
          message: `Skenování dokončeno: ${results.successCount}/${results.totalFiles} souborů úspěšně zpracováno`,
          type: results.tracks.length > 0 ? 'success' : 'error'
        });
      } else {
        // Single file processing
        const detectedTracks = await AutoTrackDetector.detectTracksFromFile(files[0]);
        setTracks(detectedTracks);
        
        if (onTracksLoaded) {
          onTracksLoaded(detectedTracks);
        }
        
        if (detectedTracks.length > 0) {
          setSelectedTrackId(detectedTracks[0].id);
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
      }
    } catch (error) {
      console.error('Error detecting tracks:', error);
      setFeedback({
        message: 'Chyba při detekci stop: ' + (error instanceof Error ? error.message : 'Neznámá chyba'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setScanProgress(null);
    }
  }, [onTrackDetected]);
  
  const handleDirectorySelect = useCallback(async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        setIsLoading(true);
        setFeedback(null);
        setScanResults(null);
        
        const results = await BulkTrackDetector.scanDirectory(dirHandle, (progress) => {
          setScanProgress(progress);
        });
        
        setScanResults(results);
        setTracks(results.tracks);
        
        if (results.tracks.length > 0) {
          setSelectedTrackId(results.tracks[0].id);
          if (onTrackDetected) {
            onTrackDetected(results.tracks[0]);
          }
        }
        
        setFeedback({
          message: `Skenování složky dokončeno: ${results.successCount}/${results.totalFiles} souborů úspěšně zpracováno`,
          type: results.tracks.length > 0 ? 'success' : 'error'
        });
      } else {
        setFeedback({
          message: 'Výběr složky není v tomto prohlížeči podporován',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Directory selection failed:', error);
      setFeedback({
        message: 'Chyba při výběru složky',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setScanProgress(null);
    }
  }, [onTrackDetected]);
  
  const handleAutoScan = useCallback(async () => {
    try {
      setIsLoading(true);
      setFeedback(null);
      setScanResults(null);
      
      // Nejprve zkusíme File System Access API
      if ('showDirectoryPicker' in window) {
        setFeedback({
          message: '🔍 Hledám hudební složky... Můžete vybrat Music, Downloads nebo jakoukoliv jinou složku s hudbou.',
          type: 'success'
        });
        
        // Automaticky otevře dialog pro výběr složky
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'read',
          startIn: 'music' // Zkusí začít ve složce Music
        });
        
        const results = await BulkTrackDetector.scanDirectory(dirHandle, (progress) => {
          setScanProgress(progress);
        });
        
        setScanResults(results);
        setTracks(results.tracks);
        
        if (results.tracks.length > 0) {
          setSelectedTrackId(results.tracks[0].id);
          if (onTrackDetected) {
            onTrackDetected(results.tracks[0]);
          }
        }
        
        setFeedback({
          message: `🎉 Automatické skenování dokončeno! Nalezeno ${results.tracks.length} skladeb z ${results.totalFiles} souborů.`,
          type: results.tracks.length > 0 ? 'success' : 'error'
        });
      } else {
        // Fallback pro starší prohlížeče
        setFeedback({
          message: '📱 Automatické skenování není v tomto prohlížeči podporováno. Zkuste "Více souborů" nebo "Celou složku".',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Auto scan failed:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setFeedback({
          message: 'Skenování bylo zrušeno uživatelem.',
          type: 'error'
        });
      } else {
        setFeedback({
          message: '🚀 Pro automatické skenování použijte "Celou složku" a vyberte vaši hudební složku!',
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
      setScanProgress(null);
    }
  }, [onTrackDetected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileChange(e.dataTransfer.files, e.dataTransfer.files.length > 1);
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
        <p>Přetáhněte audio soubory nebo složky sem</p>
        
        <ButtonGroup>
          <UploadButton onClick={() => document.getElementById('track-file-input')?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Jeden soubor
          </UploadButton>
          
          <UploadButton variant="secondary" onClick={() => document.getElementById('multiple-files-input')?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13,2 13,9 20,9" />
            </svg>
            Více souborů
          </UploadButton>
          
          <UploadButton variant="secondary" onClick={handleDirectorySelect} disabled={!('showDirectoryPicker' in window)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Celou složku
          </UploadButton>
          
          <UploadButton variant="secondary" onClick={handleAutoScan}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Najít vše 🚀
          </UploadButton>
        </ButtonGroup>
        
        <input
          id="track-file-input"
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files, false)}
        />
        
        <input
          id="multiple-files-input"
          type="file"
          accept="audio/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files, true)}
        />
      </DropZone>

      {isLoading && (
        <div>
          <LoadingIndicator>
            <div className="loader"></div>
            {scanProgress ? 'Skenuji soubory...' : 'Detekuji stopy...'}
          </LoadingIndicator>
          
          {scanProgress && (
            <>
              <ProgressBar>
                <div 
                  className="progress-fill"
                  style={{ width: `${(scanProgress.processed / scanProgress.total) * 100}%` }}
                />
              </ProgressBar>
              <ScanStatus>
                <div>{scanProgress.processed} / {scanProgress.total} souborů</div>
                {scanProgress.currentFile && (
                  <div className="current-file">Zpracovávám: {scanProgress.currentFile}</div>
                )}
              </ScanStatus>
            </>
          )}
        </div>
      )}

      {feedback && (
        <FeedbackMessage type={feedback.type}>
          {feedback.message}
        </FeedbackMessage>
      )}
      
      {scanResults && (
        <ResultsSummary>
          <div className="summary-title">📈 Výsledky skenování</div>
          <div className="summary-stats">
            <div className="stat">
              <div className="label">Celkem souborů:</div>
              <div className="value">{scanResults.totalFiles}</div>
            </div>
            <div className="stat">
              <div className="label">Úspěšně:</div>
              <div className="value">{scanResults.successCount}</div>
            </div>
            <div className="stat">
              <div className="label">Stop detekovaných:</div>
              <div className="value">{scanResults.tracks.length}</div>
            </div>
            <div className="stat">
              <div className="label">Chyby:</div>
              <div className="value">{scanResults.errors.length}</div>
            </div>
          </div>
        </ResultsSummary>
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
