import { useEffect, useRef, useState } from 'react';
import { useVisualizer } from '../hooks/useVisualizer';

interface VisualizerFullProps {
  isActive: boolean;
}

export default function VisualizerFull({ isActive }: VisualizerFullProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const { analyser, visualizerState } = useVisualizer();
  const [audioData, setAudioData] = useState<Uint8Array>();

  useEffect(() => {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    setAudioData(dataArray);
  }, [analyser]);

  useEffect(() => {
    if (!isActive || !canvasRef.current || !analyser || !audioData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      if (!isActive) return;

      analyser.getByteFrequencyData(audioData);

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(10, 13, 18, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create gradient based on visualizer color
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, visualizerState.color);
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.8)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');

      // Draw spectrum bars
      const barWidth = canvas.width / audioData.length;
      let x = 0;

      for (let i = 0; i < audioData.length; i++) {
        const barHeight = (audioData[i] / 255) * canvas.height * 0.8;

        // Main bar
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

        // Glow effect
        ctx.shadowColor = visualizerState.color;
        ctx.shadowBlur = 20;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        ctx.shadowBlur = 0;

        // Top glow dot
        if (barHeight > 50) {
          ctx.beginPath();
          ctx.arc(x + barWidth / 2, canvas.height - barHeight - 10, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#00ffff';
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        x += barWidth;
      }

      // Add floating particles
      drawParticles(ctx, canvas, audioData);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyser, audioData, visualizerState.color]);

  const drawParticles = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: Uint8Array,
  ) => {
    const particleCount = 50;
    const time = Date.now() * 0.001;

    for (let i = 0; i < particleCount; i++) {
      const intensity = data[Math.floor((i * data.length) / particleCount)] / 255;
      if (intensity < 0.3) continue;

      const x = (i / particleCount) * canvas.width + Math.sin(time + i) * 50;
      const y = canvas.height * 0.3 + Math.cos(time * 0.5 + i) * 100 * intensity;
      const size = intensity * 4;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 255, ${intensity * 0.8})`;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.1) 0%, rgba(10, 13, 18, 0.9) 70%)',
          filter: 'blur(0.5px)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20" />
    </div>
  );
}
