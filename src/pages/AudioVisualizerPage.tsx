import React, { useState, useRef, useEffect } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { SpectrumVisualizer } from '../components/SpectrumVisualizer';
import { AudioOutputSelector } from '../components/AudioOutputSelector';
import { DSPChainBuilder } from '../components/DSPChainBuilder';
import styled from 'styled-components';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1a202c;
  color: #e2e8f0;
  padding: 1rem;
`;

const VisualizerContainer = styled.div`
  flex: 1;
  position: relative;
  margin-bottom: 1rem;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const ControlsContainer = styled.div`
  background: #2d3748;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const Section = styled.section`
  margin-bottom: 1.5rem;
  
  h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #e2e8f0;
    font-size: 1.25rem;
  }
`;

const FileInput = styled.div`
  margin-bottom: 1rem;
  
  input[type="file"] {
    display: none;
  }
  
  label {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: #4299e1;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover {
      background: #3182ce;
    }
  }
`;

const PlaybackControls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
  
  button {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 4px;
    background: #4299e1;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover {
      background: #3182ce;
    }
    
    &:disabled {
      background: #4a5568;
      cursor: not-allowed;
    }
  }
`;

const TimeDisplay = styled.div`
  font-family: monospace;
  font-size: 0.9rem;
  color: #a0aec0;
`;

export const AudioVisualizerPage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize audio player
  const {
    play,
    pause,
    loadAudio,
    isPlaying: playerIsPlaying,
    currentTime: playerCurrentTime,
    duration: playerDuration,
    audioRef,
    analyzerNode,
    dspControls,
    applyDeviceProfile,
  } = useAudioPlayer();
  
  // Update local state when player state changes
  useEffect(() => {
    setIsPlaying(playerIsPlaying);
  }, [playerIsPlaying]);
  
  useEffect(() => {
    setCurrentTime(playerCurrentTime);
  }, [playerCurrentTime]);
  
  useEffect(() => {
    setDuration(playerDuration);
  }, [playerDuration]);
  
  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    const success = await loadAudio(file);
    
    if (success) {
      // Auto-play when file is loaded (browsers may block this)
      try {
        await play();
      } catch (err) {
        console.error('Autoplay was prevented:', err);
      }
    }
  };
  
  // Handle play/pause
  const togglePlayback = async () => {
    if (isPlaying) {
      pause();
    } else {
      try {
        await play();
      } catch (err) {
        console.error('Playback failed:', err);
      }
    }
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Handle audio output device change
  const handleOutputDeviceChange = async (deviceId: string) => {
    if (!audioRef.current) return;
    
    try {
      // @ts-ignore - setSinkId is not in the TypeScript types yet
      await audioRef.current.setSinkId(deviceId);
    } catch (err) {
      console.error('Error setting audio output device:', err);
    }
  };
  
  // Handle DSP chain changes
  const handleDSPChainChange = (modules: any[]) => {
    console.log('DSP chain updated:', modules);
    // Here you would connect the DSP modules to your audio graph
    // This is a simplified example - in a real app, you'd need to handle the connections
  };
  
  return (
    <PageContainer>
      <VisualizerContainer>
        <SpectrumVisualizer analyzer={analyzerNode} width={800} height={400} />
      </VisualizerContainer>
      
      <ControlsContainer>
        <Section>
          <h2>Audio Source</h2>
          <FileInput>
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              onChange={handleFileChange}
            />
            <label onClick={() => fileInputRef.current?.click()}>
              {selectedFile ? selectedFile.name : 'Select Audio File'}
            </label>
          </FileInput>
          
          <PlaybackControls>
            <button 
              onClick={togglePlayback}
              disabled={!selectedFile}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <TimeDisplay>
              {formatTime(currentTime)} / {formatTime(duration)}
            </TimeDisplay>
          </PlaybackControls>
        </Section>
        
        <Section>
          <h2>Audio Output</h2>
          <AudioOutputSelector 
            onDeviceSelect={handleOutputDeviceChange}
            currentDeviceId="default"
          />
        </Section>
        
        <Section>
          <h2>DSP Chain</h2>
          <DSPChainBuilder 
            context={audioRef.current?.context || new AudioContext()}
            onChainChange={handleDSPChainChange}
          />
        </Section>
      </ControlsContainer>
      
      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </PageContainer>
  );
};

export default AudioVisualizerPage;
