import { useEffect, useRef } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';

type VisualizerType = 'spectrum' | 'waveform' | 'bars';

interface AudioVisualizerProps {
  type?: VisualizerType;
  width?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  fillColor?: string;
  glowColor?: string;
  glowBlur?: number;
}

export const AudioVisualizer = ({
  type = 'spectrum',
  width = 800,
  height = 200,
  barWidth = 4,
  gap = 2,
  fillColor = 'rgba(0, 255, 255, 0.8)',
  glowColor = 'cyan',
  glowBlur = 10,
}: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const { analyser } = useAudioEngine();

  useEffect(() => {
    if (!analyser || !canvasRef.current) {
      // If no analyser is available, clear the canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      
      if (!ctx || !canvas) return;
      
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      
      // Get frequency or time domain data based on visualizer type
      if (type === 'waveform') {
        analyser.getByteTimeDomainData(dataArray);
      } else {
        analyser.getByteFrequencyData(dataArray);
      }

      ctx.fillStyle = fillColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glowBlur;
      ctx.lineWidth = barWidth;
      
      const barCount = Math.floor(width / (barWidth + gap));
      const barStep = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * barStep] / 255;
        const barHeight = value * height;
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        if (type === 'waveform') {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + barWidth, y);
          ctx.stroke();
        } else {
          ctx.fillRect(x, y, barWidth, barHeight);
          
          // Add reflection for bars
          if (type === 'bars') {
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.fillStyle = fillColor; // Reset fill style
          }
        }
      }
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyser, type, barWidth, gap, fillColor, glowColor, glowBlur, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: -1,
        opacity: 0.7,
      }}
    />
  );
};

export default AudioVisualizer;
