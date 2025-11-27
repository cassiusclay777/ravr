import React, { useState, useEffect } from 'react';
import { AudioTrack } from '../audio/AutoTrackDetector';
import { AIGenreDetection, GenreAnalysis, AudioAnalysis } from '../ai/AIGenreDetection';
import styled from 'styled-components';

const AnalysisContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
`;

const AnalysisButton = styled.button<{ analyzing: boolean }>`
  background: ${props => props.analyzing 
    ? 'rgba(249, 115, 22, 0.2)' 
    : 'linear-gradient(to right, #7c3aed, #a855f7)'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.8rem 1.5rem;
  font-weight: 600;
  cursor: ${props => props.analyzing ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  
  &:hover {
    transform: ${props => props.analyzing ? 'none' : 'translateY(-1px)'};
    box-shadow: ${props => props.analyzing ? 'none' : '0 4px 12px rgba(124, 58, 237, 0.3)'};
  }
  
  svg {
    width: 18px;
    height: 18px;
    animation: ${props => props.analyzing ? 'spin 1s linear infinite' : 'none'};
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin: 1rem 0;
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(to right, #7c3aed, #a855f7);
    transition: width 0.3s ease;
  }
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
`;

const GenreCard = styled.div<{ color: string }>`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 1rem;
  border-left: 4px solid ${props => props.color};
  
  .genre-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.5rem;
  }
  
  .confidence {
    font-size: 0.9rem;
    color: ${props => props.color};
    margin-bottom: 0.75rem;
  }
  
  .characteristics {
    font-size: 0.8rem;
    color: #aaa;
    
    .characteristic {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
      display: inline-block;
      margin: 0.2rem 0.3rem 0.2rem 0;
    }
  }
`;

const AnalysisCard = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 1rem;
  
  .analysis-title {
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.75rem;
  }
  
  .analysis-item {
    display: flex;
    justify-content: space-between;
    margin: 0.5rem 0;
    
    .label {
      color: #aaa;
      font-size: 0.9rem;
    }
    
    .value {
      color: #fff;
      font-weight: 500;
      font-size: 0.9rem;
    }
  }
  
  .mood-indicator {
    padding: 0.3rem 0.8rem;
    border-radius: 15px;
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
    
    &.happy { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    &.energetic { background: rgba(249, 115, 22, 0.2); color: #f97316; }
    &.calm { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    &.sad { background: rgba(107, 114, 128, 0.2); color: #6b7280; }
    &.aggressive { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    &.melancholic { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
  }
`;

const SummaryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
  
  .stat {
    text-align: center;
    
    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #a855f7;
      margin-bottom: 0.25rem;
    }
    
    .stat-label {
      font-size: 0.8rem;
      color: #aaa;
    }
  }
`;

interface AIAnalysisPanelProps {
  tracks: AudioTrack[];
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ tracks }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [genreResults, setGenreResults] = useState<Map<string, GenreAnalysis>>(new Map());
  const [audioAnalysis, setAudioAnalysis] = useState<Map<string, AudioAnalysis>>(new Map());
  const [showResults, setShowResults] = useState(false);

  const startAnalysis = async () => {
    if (tracks.length === 0) return;
    
    setIsAnalyzing(true);
    setProgress(0);
    setShowResults(false);
    
    try {
      // Genre analysis
      const genres = await AIGenreDetection.batchAnalyze(tracks, (processed, total) => {
        setProgress((processed / total) * 50); // First 50% for genre analysis
      });
      setGenreResults(genres);
      
      // Audio analysis
      const audioAnalysisResults = new Map<string, AudioAnalysis>();
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const analysis = await AIGenreDetection.getAudioAnalysis(track);
        audioAnalysisResults.set(track.id, analysis);
        setProgress(50 + ((i + 1) / tracks.length) * 50); // Second 50% for audio analysis
        
        // Small delay to show progress
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      setAudioAnalysis(audioAnalysisResults);
      
      setShowResults(true);
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const genreDistribution = React.useMemo(() => {
    const genres: Record<string, number> = {};
    genreResults.forEach(result => {
      genres[result.genre] = (genres[result.genre] || 0) + 1;
    });
    return genres;
  }, [genreResults]);

  const averageConfidence = React.useMemo(() => {
    if (genreResults.size === 0) return 0;
    const totalConfidence = Array.from(genreResults.values())
      .reduce((sum, result) => sum + result.confidence, 0);
    return Math.round((totalConfidence / genreResults.size) * 100);
  }, [genreResults]);

  const moodDistribution = React.useMemo(() => {
    const moods: Record<string, number> = {};
    audioAnalysis.forEach(analysis => {
      moods[analysis.mood] = (moods[analysis.mood] || 0) + 1;
    });
    return moods;
  }, [audioAnalysis]);

  if (tracks.length === 0) return null;

  return (
    <AnalysisContainer>
      <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>🤖 AI Analýza</h3>
      
      <AnalysisButton 
        analyzing={isAnalyzing} 
        onClick={startAnalysis}
        disabled={isAnalyzing}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
        {isAnalyzing ? `Analyzuji... ${Math.round(progress)}%` : `Analyzovat ${tracks.length} skladeb`}
      </AnalysisButton>
      
      {isAnalyzing && (
        <ProgressBar>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </ProgressBar>
      )}
      
      {showResults && (
        <>
          <SummaryStats>
            <div className="stat">
              <div className="stat-value">{Object.keys(genreDistribution).length}</div>
              <div className="stat-label">Žánrů</div>
            </div>
            <div className="stat">
              <div className="stat-value">{averageConfidence}%</div>
              <div className="stat-label">Přesnost</div>
            </div>
            <div className="stat">
              <div className="stat-value">{Object.keys(moodDistribution).length}</div>
              <div className="stat-label">Nálad</div>
            </div>
          </SummaryStats>
          
          <h4 style={{ color: '#fff', margin: '1.5rem 0 0.5rem 0' }}>🎭 Detekované žánry</h4>
          <ResultsGrid>
            {Object.entries(genreDistribution).map(([genre, count]) => {
              const sampleResult = Array.from(genreResults.values()).find(r => r.genre === genre);
              return (
                <GenreCard key={genre} color={AIGenreDetection.getGenreColor(genre)}>
                  <div className="genre-name">{genre}</div>
                  <div className="confidence">{count} skladeb</div>
                  <div className="characteristics">
                    {sampleResult?.characteristics.slice(0, 3).map(char => (
                      <span key={char} className="characteristic">{char}</span>
                    ))}
                  </div>
                </GenreCard>
              );
            })}
          </ResultsGrid>
          
          <h4 style={{ color: '#fff', margin: '1.5rem 0 0.5rem 0' }}>🎵 Audio charakteristiky</h4>
          <ResultsGrid>
            <AnalysisCard>
              <div className="analysis-title">Nálady</div>
              {Object.entries(moodDistribution).map(([mood, count]) => (
                <div key={mood} className="analysis-item">
                  <span className="label">{mood.charAt(0).toUpperCase() + mood.slice(1)}:</span>
                  <span className={`mood-indicator ${mood}`}>{count} skladeb</span>
                </div>
              ))}
            </AnalysisCard>
            
            <AnalysisCard>
              <div className="analysis-title">Průměrné hodnoty</div>
              <div className="analysis-item">
                <span className="label">Tempo:</span>
                <span className="value">
                  {Math.round(Array.from(audioAnalysis.values()).reduce((sum, a) => sum + a.tempo, 0) / audioAnalysis.size)} BPM
                </span>
              </div>
              <div className="analysis-item">
                <span className="label">Energie:</span>
                <span className="value">
                  {Math.round(Array.from(audioAnalysis.values()).reduce((sum, a) => sum + a.energy, 0) / audioAnalysis.size * 100)}%
                </span>
              </div>
              <div className="analysis-item">
                <span className="label">Tanečnost:</span>
                <span className="value">
                  {Math.round(Array.from(audioAnalysis.values()).reduce((sum, a) => sum + a.danceability, 0) / audioAnalysis.size * 100)}%
                </span>
              </div>
            </AnalysisCard>
          </ResultsGrid>
        </>
      )}
    </AnalysisContainer>
  );
};
