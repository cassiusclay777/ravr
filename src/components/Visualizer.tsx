import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyzer: AnalyserNode | null;
}

export default function Visualizer({ analyzer }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const bufferLength = 32; // Reduced number of bars for better performance
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    if (!analyzer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const barWidth = (WIDTH / bufferLength) * 1.5;
    let x = 0;

    analyzer.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * HEIGHT * 0.8;
      const hue = 40 + (i / bufferLength) * 60; // Yellow to orange gradient
      
      ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
      ctx.fillRect(
        x,
        HEIGHT - barHeight,
        barWidth * 0.6, // Make bars slightly thinner than the gaps
        barHeight
      );
      
      x += barWidth + 2; // Add some space between bars
    }

    animationFrameId.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    if (analyzer) {
      animationFrameId.current = requestAnimationFrame(draw);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyzer]);

  return (
    <div className="w-full h-24 bg-black/20 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={800}
        height={96}
        className="w-full h-full"
      />
    </div>
  );
}