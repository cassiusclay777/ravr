import React, { useRef, useEffect } from 'react';

interface OscilloscopeProps {
  analyser: AnalyserNode;
  width?: number;
  height?: number;
  lineColor?: string;
  lineWidth?: number;
  trigger?: boolean;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  analyser,
  width = 800,
  height = 300,
  lineColor = '#00ffcc',
  lineWidth = 2,
  trigger = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const findTriggerPoint = (data: Float32Array): number => {
      if (!trigger) return 0;
      
      const threshold = 0.01;
      for (let i = 0; i < data.length - 1; i++) {
        if (data[i] < threshold && data[i + 1] >= threshold) {
          return i;
        }
      }
      return 0;
    };

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getFloatTimeDomainData(dataArray);
      
      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);
      
      // Draw grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Horizontal lines
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Vertical lines
      for (let i = 0; i <= 8; i++) {
        const x = (width / 8) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
      
      // Draw waveform
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      
      const triggerPoint = findTriggerPoint(dataArray);
      const sliceWidth = width / (bufferLength - triggerPoint);
      let x = 0;
      
      for (let i = triggerPoint; i < bufferLength; i++) {
        const v = dataArray[i];
        const y = (v + 1) * height / 2;
        
        if (i === triggerPoint) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
      
      // Draw center line
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, width, height, lineColor, lineWidth, trigger]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-700 rounded bg-gray-900"
    />
  );
};
