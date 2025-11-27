import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioContextManager } from './AudioContextManager';
import { AudioPreset, PRESETS, DEFAULT_PRESET, PresetName } from './presets';

export const useAudioEngine = () => {
  const [audioContext, setAudioContext] = useState<AudioContextManager | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentPreset, setCurrentPreset] = useState<PresetName>(DEFAULT_PRESET);
  const [customPresets, setCustomPresets] = useState<Record<string, AudioPreset>>({});
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize audio context on mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        const context = new AudioContextManager();
        setAudioContext(context);
        
        // Get the analyser node from the context
        analyserRef.current = context.getAnalyser();
        
        // Set up animation frame for time updates
        const updateTime = () => {
          if (context) {
            setCurrentTime(context.getCurrentTime());
            setDuration(context.getDuration());
          }
          animationFrameRef.current = requestAnimationFrame(updateTime);
        };
        
        updateTime();
        
        return () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          context.cleanup();
        };
      } catch (error) {
        console.error('Error initializing audio context:', error);
      }
    };
    
    initAudio();
    
    return () => {
      if (audioContext) {
        audioContext.cleanup();
      }
    };
  }, []);

  // Play/pause toggle
  const togglePlayback = async () => {
    if (!audioContext) return;
    
    try {
      if (isPlaying) {
        await audioContext.suspend();
      } else {
        await audioContext.resume();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  // Load audio file
  const loadAudio = async (url: string) => {
    if (!audioContext) return;
    
    try {
      await audioContext.loadAudio(url);
      setDuration(audioContext.getDuration() || 0);
      return true;
    } catch (error) {
      console.error('Error loading audio:', error);
      return false;
    }
  };

  // Seek to position
  const seek = (time: number) => {
    if (audioContext?.seek) {
      audioContext.seek(time);
      setCurrentTime(time);
    }
  };

  // Set volume (0-1)
  const setVolumeLevel = (level: number) => {
    if (audioContext?.setVolume) {
      audioContext.setVolume(level);
      setVolume(level);
    }
  };

  // Apply a preset to the audio context
  const applyPreset = useCallback((presetName: PresetName) => {
    if (!audioContext) return;
    
    const preset = PRESETS[presetName] || customPresets[presetName];
    if (!preset) return;
    
    // Apply each module in the preset
    preset.modules.forEach(moduleConfig => {
      const node = audioContext.getNode(moduleConfig.id);
      if (node && node.node) {
        // Update node parameters
        if (moduleConfig.params) {
          Object.entries(moduleConfig.params).forEach(([paramName, value]) => {
            const param = (node.node as any)[paramName];
            if (param && typeof param.value !== 'undefined') {
              param.value = value;
            }
          });
        }
      }
    });
    
    setCurrentPreset(presetName);
  }, [audioContext, customPresets]);

  // Save current settings as a custom preset
  const saveCustomPreset = useCallback((preset: Omit<AudioPreset, 'id'>, id?: string) => {
    const presetId = id || `custom-${Date.now()}`;
    const newPreset = { ...preset, id: presetId };
    
    setCustomPresets(prev => {
      const updated = {
        ...prev,
        [presetId]: newPreset
      };
      
      // Save to localStorage
      try {
        localStorage.setItem('audioPresets', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving presets:', error);
      }
      
      return updated;
    });

    return presetId;
  }, []);

  // Delete a custom preset
  const deleteCustomPreset = useCallback((presetId: string) => {
    if (presetId in customPresets) {
      const newPresets = { ...customPresets };
      delete newPresets[presetId];
      
      setCustomPresets(newPresets);
      
      // Save to localStorage
      try {
        localStorage.setItem('audioPresets', JSON.stringify(newPresets));
      } catch (error) {
        console.error('Error saving presets:', error);
      }
      
      // If the deleted preset was active, switch to default
      if (currentPreset === presetId) {
        setCurrentPreset(DEFAULT_PRESET);
        applyPreset(DEFAULT_PRESET);
      }
    }
  }, [customPresets, currentPreset, applyPreset]);

  // Load saved presets from localStorage on mount
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('audioPresets');
      if (savedPresets) {
        setCustomPresets(JSON.parse(savedPresets));
      }
      
      const savedPreset = localStorage.getItem('currentPreset') as PresetName;
      if (savedPreset && (savedPreset in PRESETS || savedPreset in customPresets)) {
        setCurrentPreset(savedPreset);
        // Apply the preset after a short delay to ensure audio context is ready
        const timer = setTimeout(() => {
          applyPreset(savedPreset);
        }, 100);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  }, []);

  // Save current preset to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('currentPreset', currentPreset);
    } catch (error) {
      console.error('Error saving current preset:', error);
    }
  }, [currentPreset]);

  return {
    audioContext,
    isPlaying,
    currentTime,
    duration,
    volume,
    currentPreset,
    presets: { ...PRESETS, ...customPresets },
    analyser: analyserRef.current,
    togglePlayback,
    loadAudio,
    seek,
    setVolume: setVolumeLevel,
    applyPreset,
    saveCustomPreset,
    deleteCustomPreset,
  };
};

export default useAudioEngine;
