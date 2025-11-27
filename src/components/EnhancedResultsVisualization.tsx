import React, { useState, useMemo } from 'react';
import { AudioTrack } from '../audio/AutoTrackDetector';
import { ScanResults } from '../audio/BulkTrackDetector';
import styled from 'styled-components';

const VisualizationContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 0.75rem 1.5rem;
  background: ${props => props.active ? 'rgba(79, 70, 229, 0.3)' : 'transparent'};
  color: ${props => props.active ? '#fff' : '#aaa'};
  border: none;
  border-bottom: 2px solid ${props => props.active ? '#4f46e5' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }
`;

const ChartContainer = styled.div`
  height: 200px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
  display: flex;
  align-items: end;
  gap: 4px;
  overflow-x: auto;
`;

const Bar = styled.div<{ height: number; color: string }>`
  min-width: 20px;
  height: ${props => props.height}%;
  background: ${props => props.color};
  border-radius: 2px 2px 0 0;
  position: relative;
  transition: all 0.3s;
  
  &:hover {
    opacity: 0.8;
    transform: scaleY(1.05);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`;

const StatCard = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #4ade80;
    margin-bottom: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.85rem;
    color: #aaa;
  }
`;

const GenreCloud = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const GenreTag = styled.span<{ size: number }>`
  background: rgba(79, 70, 229, 0.2);
  color: #a5b4fc;
  padding: 0.3rem 0.8rem;
  border-radius: 15px;
  font-size: ${props => Math.max(0.7, Math.min(1.2, props.size))}rem;
  border: 1px solid rgba(79, 70, 229, 0.3);
`;

const FormatPieChart = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: conic-gradient(
    #4f46e5 0deg 120deg,
    #06b6d4 120deg 240deg,
    #10b981 240deg 300deg,
    #f59e0b 300deg 360deg
  );
  margin: 1rem auto;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 30px;
    left: 30px;
    width: 90px;
    height: 90px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 50%;
  }
`;

type TabType = 'overview' | 'formats' | 'duration' | 'quality' | 'genres';

interface EnhancedResultsVisualizationProps {
  tracks: AudioTrack[];
  scanResults?: ScanResults;
}

export const EnhancedResultsVisualization: React.FC<EnhancedResultsVisualizationProps> = ({
  tracks,
  scanResults
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const statistics = useMemo(() => {
    if (tracks.length === 0) return null;

    const formats = tracks.reduce((acc, track) => {
      acc[track.format] = (acc[track.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalDuration = tracks.reduce((acc, track) => acc + track.duration, 0);
    const avgDuration = totalDuration / tracks.length;

    const sampleRates = tracks.reduce((acc, track) => {
      acc[track.sampleRate] = (acc[track.sampleRate] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const channels = tracks.reduce((acc, track) => {
      const type = track.channels === 1 ? 'Mono' : 'Stereo';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Simulace žánrů (v reálné aplikaci by se použila AI detekce)
    const mockGenres = ['Electronic', 'Rock', 'Pop', 'Jazz', 'Classical', 'Hip-Hop', 'Ambient'];
    const genres = tracks.reduce((acc, track) => {
      const genre = mockGenres[Math.floor(Math.random() * mockGenres.length)];
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      formats,
      totalDuration,
      avgDuration,
      sampleRates,
      channels,
      genres,
      totalTracks: tracks.length,
      uniqueArtists: new Set(tracks.filter(t => t.artist).map(t => t.artist)).size,
      uniqueAlbums: new Set(tracks.filter(t => t.album).map(t => t.album)).size
    };
  }, [tracks]);

  if (!statistics) return null;

  const renderOverview = () => (
    <div>
      <StatsGrid>
        <StatCard>
          <div className="stat-value">{statistics.totalTracks}</div>
          <div className="stat-label">Celkem skladeb</div>
        </StatCard>
        <StatCard>
          <div className="stat-value">{Math.floor(statistics.totalDuration / 3600)}h {Math.floor((statistics.totalDuration % 3600) / 60)}m</div>
          <div className="stat-label">Celková délka</div>
        </StatCard>
        <StatCard>
          <div className="stat-value">{statistics.uniqueArtists}</div>
          <div className="stat-label">Umělců</div>
        </StatCard>
        <StatCard>
          <div className="stat-value">{statistics.uniqueAlbums}</div>
          <div className="stat-label">Alb</div>
        </StatCard>
        <StatCard>
          <div className="stat-value">{Math.floor(statistics.avgDuration / 60)}:{Math.floor(statistics.avgDuration % 60).toString().padStart(2, '0')}</div>
          <div className="stat-label">Průměrná délka</div>
        </StatCard>
        <StatCard>
          <div className="stat-value">{Object.keys(statistics.formats).length}</div>
          <div className="stat-label">Formátů</div>
        </StatCard>
      </StatsGrid>
    </div>
  );

  const renderFormats = () => (
    <div>
      <ChartContainer>
        {Object.entries(statistics.formats).map(([format, count], index) => (
          <Bar
            key={format}
            height={(count / statistics.totalTracks) * 100}
            color={`hsl(${index * 60}, 70%, 60%)`}
            title={`${format}: ${count} skladeb`}
          />
        ))}
      </ChartContainer>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#aaa' }}>
        {Object.entries(statistics.formats).map(([format, count]) => (
          <div key={format}>
            <strong>{format}</strong><br />
            {count} skladeb
          </div>
        ))}
      </div>
    </div>
  );

  const renderGenres = () => (
    <div>
      <GenreCloud>
        {Object.entries(statistics.genres).map(([genre, count]) => (
          <GenreTag key={genre} size={count / statistics.totalTracks * 3}>
            {genre} ({count})
          </GenreTag>
        ))}
      </GenreCloud>
    </div>
  );

  const renderQuality = () => (
    <div>
      <StatsGrid>
        {Object.entries(statistics.sampleRates).map(([rate, count]) => (
          <StatCard key={rate}>
            <div className="stat-value">{parseInt(rate) / 1000}kHz</div>
            <div className="stat-label">{count} skladeb</div>
          </StatCard>
        ))}
      </StatsGrid>
      <StatsGrid>
        {Object.entries(statistics.channels).map(([type, count]) => (
          <StatCard key={type}>
            <div className="stat-value">{type}</div>
            <div className="stat-label">{count} skladeb</div>
          </StatCard>
        ))}
      </StatsGrid>
    </div>
  );

  return (
    <VisualizationContainer>
      <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>📊 Analýza kolekce</h3>
      
      <TabContainer>
        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          📈 Přehled
        </Tab>
        <Tab active={activeTab === 'formats'} onClick={() => setActiveTab('formats')}>
          🎵 Formáty
        </Tab>
        <Tab active={activeTab === 'genres'} onClick={() => setActiveTab('genres')}>
          🎭 Žánry
        </Tab>
        <Tab active={activeTab === 'quality'} onClick={() => setActiveTab('quality')}>
          🔊 Kvalita
        </Tab>
      </TabContainer>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'formats' && renderFormats()}
      {activeTab === 'genres' && renderGenres()}
      {activeTab === 'quality' && renderQuality()}
    </VisualizationContainer>
  );
};
