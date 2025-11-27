import React, { useState } from 'react';
import { EnhancedAudioTrackDetector } from '../components/EnhancedAudioTrackDetector';
import { ScanMethodsInfo } from '../components/ScanMethodsInfo';
import { EnhancedResultsVisualization } from '../components/EnhancedResultsVisualization';
import { ExportPlaylistGenerator } from '../components/ExportPlaylistGenerator';
import { AIAnalysisPanel } from '../components/AIAnalysisPanel';
import { AudioTrack } from '../audio/AutoTrackDetector';
import styled from 'styled-components';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const PageTitle = styled.h2`
  color: #fff;
  margin-bottom: 20px;
  font-size: 1.75rem;
  
  @media (max-width: 640px) {
    font-size: 1.5rem;
  }
`;

const PageDescription = styled.p`
  color: #ccc;
  margin-bottom: 20px;
  max-width: 800px;
  line-height: 1.6;
`;

const FeatureBox = styled.div`
  background: rgba(10, 10, 20, 0.4);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-left: 3px solid #4f46e5;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const PageGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const TrackInfoPanel = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  
  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #fff;
  }
  
  p {
    margin: 0.5rem 0;
    color: #ddd;
  }
  
  .label {
    color: #aaa;
    font-size: 0.9rem;
  }
  
  .value {
    color: #fff;
    font-weight: 500;
  }
`;

const TrackDetectionPage: React.FC = () => {
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [allTracks, setAllTracks] = useState<AudioTrack[]>([]);
  
  const handleTrackDetected = (track: AudioTrack) => {
    setSelectedTrack(track);
  };

  const handleTracksDetected = (tracks: AudioTrack[]) => {
    setAllTracks(tracks);
    if (tracks.length > 0) {
      setSelectedTrack(tracks[0]);
    }
  };
  
  return (
    <PageContainer>
      <PageTitle>Automatická detekce stop</PageTitle>
      
      <FeatureBox>
        <PageDescription>
          Nahrajte audio soubor pro automatickou detekci stop. Systém analyzuje metadata 
          z různých formátů (MP3, WAV, FLAC, OGG, AAC) a detekuje stopy. Podporuje ID3 tagy, 
          Vorbis komentáře a další formáty metadat.
        </PageDescription>
      </FeatureBox>
      
      <ScanMethodsInfo />
      
      <PageGrid>
        <div>
          <EnhancedAudioTrackDetector 
            onTrackDetected={handleTrackDetected}
            onTracksLoaded={handleTracksDetected}
          />
        </div>
        
        {selectedTrack && (
          <TrackInfoPanel>
            <h3>Informace o stopě</h3>
            
            <p>
              <span className="label">Název:</span>{" "}
              <span className="value">{selectedTrack.name}</span>
            </p>
            
            {selectedTrack.artist && (
              <p>
                <span className="label">Interpret:</span>{" "}
                <span className="value">{selectedTrack.artist}</span>
              </p>
            )}
            
            {selectedTrack.album && (
              <p>
                <span className="label">Album:</span>{" "}
                <span className="value">{selectedTrack.album}</span>
              </p>
            )}
            
            <p>
              <span className="label">Formát:</span>{" "}
              <span className="value">{selectedTrack.format}</span>
            </p>
            
            <p>
              <span className="label">Trvání:</span>{" "}
              <span className="value">
                {Math.floor(selectedTrack.duration / 60)}:
                {Math.floor(selectedTrack.duration % 60).toString().padStart(2, '0')}
              </span>
            </p>
            
            <p>
              <span className="label">Počet kanálů:</span>{" "}
              <span className="value">{selectedTrack.channels === 1 ? 'Mono' : 'Stereo'}</span>
            </p>
            
            <p>
              <span className="label">Vzorkovací frekvence:</span>{" "}
              <span className="value">{selectedTrack.sampleRate / 1000} kHz</span>
            </p>
            
            {selectedTrack.bitrate && (
              <p>
                <span className="label">Bitrate:</span>{" "}
                <span className="value">{Math.round(selectedTrack.bitrate / 1000)} kbps</span>
              </p>
            )}
          </TrackInfoPanel>
        )}
      </PageGrid>
      
      {allTracks.length > 0 && (
        <>
          <EnhancedResultsVisualization tracks={allTracks} />
          <ExportPlaylistGenerator tracks={allTracks} />
          <AIAnalysisPanel tracks={allTracks} />
        </>
      )}
    </PageContainer>
  );
};

export default TrackDetectionPage;
