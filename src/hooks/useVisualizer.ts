import { useState, useEffect } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';

type VisualizerType = 'spectrum' | 'waveform' | 'bars' | 'none';

interface VisualizerState {
  type: VisualizerType;
  isVisible: boolean;
  opacity: number;
  color: string;
}

export const useVisualizer = () => {
  const { analyser } = useAudioEngine();
  const [visualizerState, setVisualizerState] = useState<VisualizerState>({
    type: 'spectrum',
    isVisible: true,
    opacity: 0.7,
    color: 'rgba(0, 255, 255, 0.8)',
  });

  const setVisualizerType = (type: VisualizerType) => {
    setVisualizerState(prev => ({
      ...prev,
      type,
      isVisible: type !== 'none',
    }));
  };

  const toggleVisualizer = () => {
    setVisualizerState(prev => ({
      ...prev,
      isVisible: !prev.isVisible,
    }));
  };

  const setVisualizerOpacity = (opacity: number) => {
    setVisualizerState(prev => ({
      ...prev,
      opacity: Math.max(0, Math.min(1, opacity)),
    }));
  };

  const setVisualizerColor = (color: string) => {
    setVisualizerState(prev => ({
      ...prev,
      color,
    }));
  };

  return {
    visualizerState,
    setVisualizerType,
    toggleVisualizer,
    setVisualizerOpacity,
    setVisualizerColor,
    analyser,
  };
};

export default useVisualizer;
