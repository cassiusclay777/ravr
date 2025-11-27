import React, { useState, useMemo } from 'react';
import { AudioTrack } from '../audio/AutoTrackDetector';
import styled from 'styled-components';

const ExportContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const ExportButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => props.variant === 'secondary' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'linear-gradient(to right, #10b981, #059669)'};
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
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const PlaylistSection = styled.div`
  margin: 1.5rem 0;
`;

const PlaylistGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`;

const PlaylistCard = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  &:hover {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(79, 70, 229, 0.5);
  }
  
  .playlist-title {
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.5rem;
  }
  
  .playlist-description {
    font-size: 0.85rem;
    color: #aaa;
    margin-bottom: 0.5rem;
  }
  
  .playlist-count {
    font-size: 0.8rem;
    color: #4ade80;
  }
`;

const Modal = styled.div<{ show: boolean }>`
  display: ${props => props.show ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  align-items: center;
  justify-content: center;
`;

const ModalContent = styled.div`
  background: #1a1a2e;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

interface ExportPlaylistGeneratorProps {
  tracks: AudioTrack[];
}

export const ExportPlaylistGenerator: React.FC<ExportPlaylistGeneratorProps> = ({ tracks }) => {
  const [showModal, setShowModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>('');

  const playlistSuggestions = useMemo(() => {
    if (tracks.length === 0) return [];

    // Simulace inteligentních playlist na základě metadat
    const suggestions = [
      {
        title: "🎵 Všechny skladby",
        description: "Kompletní kolekce",
        tracks: tracks,
        count: tracks.length
      },
      {
        title: "💿 High-Quality Audio",
        description: "FLAC a vysoké bitrate",
        tracks: tracks.filter(t => t.format === 'FLAC' || (t.bitrate && t.bitrate > 256000)),
        count: tracks.filter(t => t.format === 'FLAC' || (t.bitrate && t.bitrate > 256000)).length
      },
      {
        title: "📻 Stereo Mix",
        description: "Pouze stereo nahrávky",
        tracks: tracks.filter(t => t.channels === 2),
        count: tracks.filter(t => t.channels === 2).length
      },
      {
        title: "⏰ Dlouhé skladby",
        description: "Skladby delší než 5 minut",
        tracks: tracks.filter(t => t.duration > 300),
        count: tracks.filter(t => t.duration > 300).length
      },
      {
        title: "🚀 Krátké hity",
        description: "Skladby kratší než 4 minuty",
        tracks: tracks.filter(t => t.duration < 240),
        count: tracks.filter(t => t.duration < 240).length
      }
    ].filter(playlist => playlist.count > 0);

    // Přidáme playlisty podle umělců (pokud máme metadata)
    const artistPlaylists = tracks
      .filter(t => t.artist)
      .reduce((acc, track) => {
        if (!acc[track.artist!]) {
          acc[track.artist!] = [];
        }
        acc[track.artist!].push(track);
        return acc;
      }, {} as Record<string, AudioTrack[]>);

    Object.entries(artistPlaylists)
      .filter(([_, tracks]) => tracks.length > 2)
      .slice(0, 5)
      .forEach(([artist, artistTracks]) => {
        suggestions.push({
          title: `🎤 ${artist}`,
          description: `Skladby od ${artist}`,
          tracks: artistTracks,
          count: artistTracks.length
        });
      });

    return suggestions;
  }, [tracks]);

  const exportToJSON = (playlistTracks: AudioTrack[]) => {
    const exportData = {
      name: "RAVR Audio Collection",
      created: new Date().toISOString(),
      tracks: playlistTracks.map(track => ({
        name: track.name,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        format: track.format,
        sampleRate: track.sampleRate,
        channels: track.channels,
        bitrate: track.bitrate
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ravr-playlist.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToM3U = (playlistTracks: AudioTrack[]) => {
    let m3uContent = '#EXTM3U\n';
    playlistTracks.forEach(track => {
      m3uContent += `#EXTINF:${Math.floor(track.duration)},${track.artist || 'Unknown'} - ${track.name}\n`;
      m3uContent += `${track.file.name}\n`;
    });

    const blob = new Blob([m3uContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ravr-playlist.m3u';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = (playlistTracks: AudioTrack[]) => {
    const headers = ['Name', 'Artist', 'Album', 'Duration', 'Format', 'Sample Rate', 'Channels', 'Bitrate'];
    let csvContent = headers.join(',') + '\n';
    
    playlistTracks.forEach(track => {
      const row = [
        `"${track.name}"`,
        `"${track.artist || ''}"`,
        `"${track.album || ''}"`,
        track.duration.toString(),
        track.format,
        track.sampleRate.toString(),
        track.channels.toString(),
        (track.bitrate || '').toString()
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ravr-tracks.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: string, playlistTracks: AudioTrack[]) => {
    switch (format) {
      case 'json':
        exportToJSON(playlistTracks);
        break;
      case 'm3u':
        exportToM3U(playlistTracks);
        break;
      case 'csv':
        exportToCSV(playlistTracks);
        break;
    }
  };

  if (tracks.length === 0) return null;

  return (
    <ExportContainer>
      <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>🔄 Export & Playlisty</h3>
      
      <ButtonGroup>
        <ExportButton onClick={() => handleExport('json', tracks)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          JSON Export
        </ExportButton>
        
        <ExportButton variant="secondary" onClick={() => handleExport('m3u', tracks)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19V6l12 7-12 7z"/>
          </svg>
          M3U Playlist
        </ExportButton>
        
        <ExportButton variant="secondary" onClick={() => handleExport('csv', tracks)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          CSV Tabulka
        </ExportButton>
      </ButtonGroup>

      <PlaylistSection>
        <h4 style={{ color: '#fff', margin: '1rem 0 0.5rem 0' }}>🎵 Automatické playlisty</h4>
        <PlaylistGrid>
          {playlistSuggestions.map((playlist, index) => (
            <PlaylistCard
              key={index}
              onClick={() => {
                setShowModal(true);
                setExportFormat(`playlist-${index}`);
              }}
            >
              <div className="playlist-title">{playlist.title}</div>
              <div className="playlist-description">{playlist.description}</div>
              <div className="playlist-count">{playlist.count} skladeb</div>
            </PlaylistCard>
          ))}
        </PlaylistGrid>
      </PlaylistSection>

      <Modal show={showModal}>
        <ModalContent>
          <h3 style={{ color: '#fff', marginTop: 0 }}>Export playlistu</h3>
          <p style={{ color: '#aaa' }}>Vyberte formát pro export:</p>
          
          <ButtonGroup>
            <ExportButton onClick={() => {
              const playlistIndex = parseInt(exportFormat.split('-')[1]);
              const playlist = playlistSuggestions[playlistIndex];
              if (playlist) {
                handleExport('json', playlist.tracks);
                setShowModal(false);
              }
            }}>
              JSON
            </ExportButton>
            <ExportButton variant="secondary" onClick={() => {
              const playlistIndex = parseInt(exportFormat.split('-')[1]);
              const playlist = playlistSuggestions[playlistIndex];
              if (playlist) {
                handleExport('m3u', playlist.tracks);
                setShowModal(false);
              }
            }}>
              M3U
            </ExportButton>
            <ExportButton variant="secondary" onClick={() => {
              const playlistIndex = parseInt(exportFormat.split('-')[1]);
              const playlist = playlistSuggestions[playlistIndex];
              if (playlist) {
                handleExport('csv', playlist.tracks);
                setShowModal(false);
              }
            }}>
              CSV
            </ExportButton>
          </ButtonGroup>
          
          <button 
            onClick={() => setShowModal(false)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#aaa',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Zrušit
          </button>
        </ModalContent>
      </Modal>
    </ExportContainer>
  );
};
