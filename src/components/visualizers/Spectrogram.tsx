import React, { useRef, useEffect } from 'react';

interface SpectrogramProps {
  analyser: AnalyserNode;
  width?: number;
  height?: number;
  colorMap?: 'jet' | 'viridis' | 'plasma' | 'inferno';
}

export const Spectrogram: React.FC<SpectrogramProps> = ({ 
  analyser, 
  width = 800, 
  height = 400,
  colorMap = 'jet'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const tempCanvasRef = useRef<HTMLCanvasElement>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Create temp canvas for scrolling
    tempCanvasRef.current = document.createElement('canvas');
    tempCanvasRef.current.width = width;
    tempCanvasRef.current.height = height;
    const tempCtx = tempCanvasRef.current.getContext('2d');
    if (!tempCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const getColor = (value: number): string => {
      const intensity = value / 255;
      
      switch (colorMap) {
        case 'jet':
          const r = Math.min(255, Math.max(0, 4 * intensity * 255 - 510));
          const g = Math.min(255, Math.max(0, Math.abs(2 * intensity * 255 - 255)));
          const b = Math.min(255, Math.max(0, 510 - 4 * intensity * 255));
          return `rgb(${r},${g},${b})`;
        
        case 'viridis':
          const vr = Math.floor(68 + intensity * (59 - 68));
          const vg = Math.floor(1 + intensity * (189 - 1));
          const vb = Math.floor(84 + intensity * (90 - 84));
          return `rgb(${vr},${vg},${vb})`;
        
        case 'plasma':
          const pr = Math.floor(13 + intensity * (239 - 13));
          const pg = Math.floor(8 + intensity * (66 - 8));
          const pb = Math.floor(135 + intensity * (244 - 135));
          return `rgb(${pr},${pg},${pb})`;
        
        case 'inferno':
          const ir = Math.floor(0 + intensity * 252);
          const ig = Math.floor(0 + intensity * (255 - intensity * 100));
          const ib = Math.floor(4 + intensity * (38 - 4));
          return `rgb(${ir},${ig},${ib})`;
        
        default:
          return `hsl(${240 - intensity * 240}, 100%, ${intensity * 50}%)`;
      }
    };

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Copy current canvas to temp, shifted left
      tempCtx.drawImage(canvas, -2, 0);
      
      // Draw temp back to main canvas
      ctx.drawImage(tempCanvasRef.current!, 0, 0);
      
      // Draw new frequency column
      const barHeight = height / bufferLength;
      
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        ctx.fillStyle = getColor(value);
        ctx.fillRect(width - 2, height - (i + 1) * barHeight, 2, barHeight);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, width, height, colorMap]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height}
      className="border border-gray-700 rounded"
    />
  );
};
