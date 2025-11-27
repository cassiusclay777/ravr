import React, { useState, useEffect, useRef } from 'react';
import { HybridDSPModule } from '../dsp/HybridDSPModule';

// Sample audio file (you might want to replace this with your own)
const SAMPLE_AUDIO_SRC = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

const AudioTestPage: React.FC = () => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [dspModule, setDspModule] = useState<HybridDSPModule | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // DSP Controls State
  const [eqSettings, setEqSettings] = useState({
    low: 0,
    mid: 0,
    high: 0
  });
  
  const [stereoWidth, setStereoWidth] = useState(0.5);
  
  const [compressorSettings, setCompressorSettings] = useState({
    threshold: -24,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
    knee: 0,
    makeupGain: 0
  });
  
  const [gainSettings, setGainSettings] = useState({
    input: 0,
    output: 0
  });

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize AudioContext and DSP Module
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      
      const dsp = new HybridDSPModule(ctx);
      setDspModule(dsp);
      
      return () => {
        // Clean up resources if needed
        if (ctx.state !== 'closed') {
          ctx.close();
        }
      };
    }
  }, []);

  // Connect audio element to DSP when both are ready
  useEffect(() => {
    if (audioRef.current && dspModule && audioContext) {
      // Create audio source from the audio element
      sourceRef.current = audioContext.createMediaElementSource(audioRef.current);
      
      // Connect: Source -> DSP -> Destination
      if (dspModule && sourceRef.current) {
        sourceRef.current.connect(dspModule.getInput() as unknown as AudioNode);
        dspModule.connect(audioContext.destination);
      }
      
      return () => {
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }
      };
    }
  }, [dspModule, audioContext]);

  // Update time display
  const updateTime = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
    animationFrameRef.current = requestAnimationFrame(updateTime);
  };

  // Setup time update
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateTime);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle play/pause
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error('Playback failed:', error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Update DSP settings when controls change
  useEffect(() => {
    if (dspModule) {
      dspModule.setEQ(eqSettings);
    }
  }, [eqSettings, dspModule]);

  useEffect(() => {
    if (dspModule) {
      dspModule.setStereoWidth(stereoWidth);
    }
  }, [stereoWidth, dspModule]);

  useEffect(() => {
    if (dspModule) {
      dspModule.setCompressor(compressorSettings);
    }
  }, [compressorSettings, dspModule]);

  useEffect(() => {
    if (dspModule) {
      dspModule.setGain(gainSettings);
    }
  }, [gainSettings, dspModule]);

  // Format time for display (mm:ss)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Slider component for consistent styling
  const Slider = ({
    label,
    min,
    max,
    step,
    value,
    onChange,
    unit = ''
  }: {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => void;
    unit?: string;
  }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm text-gray-400">
          {value.toFixed(2)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );

  // Section component for better organization
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-gray-800 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-semibold text-gold-500 mb-3">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gold-500 mb-8">RAVR DSP Module Tester</h1>
        
        {/* Audio Player */}
        <Section title="Audio Player">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={togglePlayback}
              className="w-12 h-12 bg-gold-500 hover:bg-gold-400 rounded-full flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gold-500" 
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
          <audio
            ref={audioRef}
            src={SAMPLE_AUDIO_SRC}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </Section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* EQ Controls */}
          <Section title="Equalizer">
            <Slider
              label="Low (250Hz)"
              min={-12}
              max={12}
              step={0.5}
              value={eqSettings.low}
              onChange={(value) => setEqSettings({...eqSettings, low: value})}
              unit="dB"
            />
            <Slider
              label="Mid (1kHz)"
              min={-12}
              max={12}
              step={0.5}
              value={eqSettings.mid}
              onChange={(value) => setEqSettings({...eqSettings, mid: value})}
              unit="dB"
            />
            <Slider
              label="High (4kHz)"
              min={-12}
              max={12}
              step={0.5}
              value={eqSettings.high}
              onChange={(value) => setEqSettings({...eqSettings, high: value})}
              unit="dB"
            />
          </Section>

          {/* Stereo Width */}
          <Section title="Stereo Width">
            <Slider
              label="Width"
              min={0}
              max={1}
              step={0.01}
              value={stereoWidth}
              onChange={setStereoWidth}
            />
          </Section>

          {/* Compressor */}
          <Section title="Compressor / Limiter">
            <Slider
              label="Threshold"
              min={-60}
              max={0}
              step={0.5}
              value={compressorSettings.threshold}
              onChange={(value) => setCompressorSettings({...compressorSettings, threshold: value})}
              unit="dB"
            />
            <Slider
              label="Ratio"
              min={1}
              max={20}
              step={0.1}
              value={compressorSettings.ratio}
              onChange={(value) => setCompressorSettings({...compressorSettings, ratio: value})}
            />
            <Slider
              label="Attack"
              min={0.001}
              max={1}
              step={0.001}
              value={compressorSettings.attack}
              onChange={(value) => setCompressorSettings({...compressorSettings, attack: value})}
              unit="s"
            />
            <Slider
              label="Release"
              min={0.001}
              max={1}
              step={0.01}
              value={compressorSettings.release}
              onChange={(value) => setCompressorSettings({...compressorSettings, release: value})}
              unit="s"
            />
            <Slider
              label="Knee"
              min={0}
              max={40}
              step={1}
              value={compressorSettings.knee}
              onChange={(value) => setCompressorSettings({...compressorSettings, knee: value})}
              unit="dB"
            />
            <Slider
              label="Makeup Gain"
              min={0}
              max={20}
              step={0.5}
              value={compressorSettings.makeupGain}
              onChange={(value) => setCompressorSettings({...compressorSettings, makeupGain: value})}
              unit="dB"
            />
          </Section>

          {/* Gain */}
          <Section title="Gain">
            <Slider
              label="Input Gain"
              min={-24}
              max={24}
              step={0.5}
              value={gainSettings.input}
              onChange={(value) => setGainSettings({...gainSettings, input: value})}
              unit="dB"
            />
            <Slider
              label="Output Gain"
              min={-24}
              max={24}
              step={0.5}
              value={gainSettings.output}
              onChange={(value) => setGainSettings({...gainSettings, output: value})}
              unit="dB"
            />
          </Section>
        </div>
      </div>
    </div>
  );
};

export default AudioTestPage;
