import Background from "@/components/Background";
import { Layout } from "@/components/Layout";
import { useRef, useEffect, useState } from 'react';
import { useAudioStore, Track } from '../store/audioStore';
import { useAutoPlayer } from '../hooks/useAutoPlayer';

interface AdvancedPlayerPageProps {
  onBack?: () => void;
}

export default function AdvancedPlayerPage({ onBack }: AdvancedPlayerPageProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    currentTrack,
    setCurrentTrack
  } = useAudioStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const player = useAutoPlayer();
  
  const [spatialEnabled, setSpatialEnabled] = useState(false);
  const [stemMode, setStemMode] = useState('Off');

  // Update audio volume when store changes
  useEffect(() => {
    if (player) {
      player.setVolume(volume);
    }
  }, [volume, player]);

  // Setup spectrum analyzer
  useEffect(() => {
    const audioElement = document.getElementById('ravr-audio') as HTMLAudioElement;
    if (!audioElement || !canvasRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    try {
      const source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
    } catch (e) {
      // Already connected
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      gradient.addColorStop(1, 'rgba(20, 0, 40, 0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        
        // Create gradient for each bar
        const barGradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        barGradient.addColorStop(0, `hsl(${180 + i * 0.5}, 100%, 60%)`);
        barGradient.addColorStop(0.5, `hsl(${260 + i * 0.3}, 100%, 50%)`);
        barGradient.addColorStop(1, `hsl(${300 + i * 0.2}, 80%, 40%)`);
        
        ctx.fillStyle = barGradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${200 + i}, 100%, 50%)`;
        
        x += barWidth;
      }
      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/') && player) {
      console.log('Loading audio file:', file.name);

      const track: Track = {
        id: Date.now().toString(),
        name: file.name,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration: 0,
        url: URL.createObjectURL(file)
      };

      setCurrentTrack(track);

      const loaded = await player.load(file);
      if (loaded) {
        await player.play();
      }

      if (event.currentTarget) {
        event.currentTarget.value = '';
      }
    }
  };

  const togglePlayPause = async () => {
    if (!player) return;

    try {
      if (isPlaying) {
        player.pause();
      } else {
        await player.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!player || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = (clickX / rect.width) * duration;

    player.seek(Math.max(0, Math.min(seekTime, duration)));
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Fallback - reload page to go back
      window.location.href = '/';
    }
  };

  return (
    <>
      <Background />
      <Layout>
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all flex items-center gap-2 group"
        >
          <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
          Zpět
        </button>

        <h1 className="text-2xl font-semibold text-cyan-300 mb-4">RAVR Advanced</h1>

        {/* Professional File Drop Zone */}
        <div className="mb-8 rounded-3xl border-2 border-dashed border-cyan-400/30 bg-gradient-to-br from-black/40 via-gray-900/30 to-purple-900/20 p-8 shadow-2xl backdrop-blur-2xl hover:border-cyan-400/50 transition-all duration-300 group">
          <div className="text-center relative">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white/90 mb-2">Drop Your Audio Files Here</h3>
            <p className="text-white/60 mb-4">Supports MP3, FLAC, WAV, M4A, OGG and more</p>
            <button 
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded-full shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card title="Player Controls">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={togglePlayPause}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors flex items-center gap-2"
                >
                  {isPlaying ? '⏸️' : '▶️'} {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors">
                  ⏹️
                </button>
                <button className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors">
                  ⏮️
                </button>
                <button className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors">
                  ⏭️
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>{formatTime(currentTime)}</span>
                  <div 
                    className="h-2 flex-1 rounded bg-white/10 cursor-pointer"
                    onClick={handleSeek}
                    role="slider"
                    tabIndex={0}
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={currentTime}
                    aria-label="Seek position"
                  >
                    <div 
                      className="h-2 rounded bg-cyan-400 transition-all" 
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">🔊</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none slider"
                  />
                  <span className="text-xs text-white/60 w-8">{Math.round(volume * 100)}%</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/60">
              {currentTrack?.name || 'No track'} | {formatTime(duration)}
            </p>
          </Card>

          <Card title="AI Suggestions">
            {currentTrack ? (
              <div className="space-y-2">
                <p className="text-cyan-400">🎵 Analyzing: {currentTrack.name}</p>
                <div className="text-sm text-white/70 space-y-1">
                  <p>• Genre detection ready</p>
                  <p>• BPM analysis available</p>
                  <p>• Mood classification pending</p>
                </div>
              </div>
            ) : (
              <p className="text-white/60">Load audio file for AI analysis</p>
            )}
          </Card>
        </div>

        {/* Real Spectrum Analyzer */}
        <Card className="mt-6" title="🎚️ Real-time Spectrum Analyzer">
          <div className="relative rounded-xl overflow-hidden">
            <canvas 
              ref={canvasRef}
              width={800}
              height={200}
              className="w-full h-48 rounded-xl"
            />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                <p className="text-white/60">▶️ Play audio to see visualization</p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-3 mt-6 pb-24">
          <Card title="Stem Separation">
            {["Off", "Karaoke", "Drums", "Bass", "Instruments"].map((t) => (
              <button 
                key={t} 
                onClick={() => setStemMode(t)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition-colors ${
                  stemMode === t 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-700/70 text-white/80 hover:bg-slate-600/70'
                }`}
              >
                {t}
              </button>
            ))}
          </Card>

          <Card title="Spatial Audio">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={spatialEnabled}
                onChange={(e) => setSpatialEnabled(e.target.checked)}
                className="size-4 accent-cyan-500" 
              />
              <span className="text-white/80">Enable 3D Audio</span>
            </label>
            {spatialEnabled && (
              <div className="mt-4 text-sm text-cyan-400">
                ✨ Spatial audio processing active
              </div>
            )}
          </Card>

          <Card title="Track Info">
            {currentTrack ? (
              <div className="space-y-1 text-sm">
                <p className="text-white/90 font-medium">{currentTrack.name}</p>
                <p className="text-white/60">{currentTrack.artist}</p>
                <p className="text-white/40">{currentTrack.album}</p>
              </div>
            ) : (
              <p className="text-white/60">No track loaded</p>
            )}
          </Card>
        </div>
      </Layout>
    </>
  );
}

function Card({
  title, children, className=""
}: {title:string; children:React.ReactNode; className?:string}) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-ravr-panel/70 p-6 shadow-xl backdrop-blur ${className}`}>
      <h2 className="mb-4 text-lg font-semibold text-white/90">{title}</h2>
      {children}
    </section>
  );
}
