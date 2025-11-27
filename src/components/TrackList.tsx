import React from 'react';
import { AudioTrack } from '../audio/TrackDetector';
import styled from 'styled-components';

const TrackListContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-top: 1rem;
`;

const TrackItem = styled.div`
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const TrackInfo = styled.div`
  flex: 1;
  margin-right: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TrackName = styled.div`
  font-weight: 500;
  color: #fff;
`;

const TrackMeta = styled.div`
  font-size: 0.8rem;
  color: #aaa;
`;

interface TrackListProps {
  tracks: AudioTrack[];
  onSelectTrack?: (track: AudioTrack, index: number) => void;
  selectedTrackId?: string;
}

export const TrackList: React.FC<TrackListProps> = ({ 
  tracks, 
  onSelectTrack,
  selectedTrackId 
}) => {
  if (tracks.length === 0) {
    return <div>Žádné stopy nenalezeny</div>;
  }

  return (
    <TrackListContainer>
      {tracks.map((track, index) => (
        <TrackItem 
          key={track.id} 
          onClick={() => onSelectTrack?.(track, index)}
          style={{ 
            background: selectedTrackId === track.id 
              ? 'rgba(76, 175, 80, 0.3)' 
              : 'rgba(255, 255, 255, 0.1)' 
          }}
        >
          <TrackInfo>
            <TrackName>{track.name}</TrackName>
            <TrackMeta>
              {track.artist && `${track.artist} • `}
              {track.format} • {Math.floor(track.duration / 60)}:
              {Math.floor(track.duration % 60).toString().padStart(2, '0')}
              {track.channels === 1 ? ' • Mono' : ' • Stereo'} • 
              {track.sampleRate / 1000}kHz
            </TrackMeta>
          </TrackInfo>
        </TrackItem>
      ))}
    </TrackListContainer>
  );
};
