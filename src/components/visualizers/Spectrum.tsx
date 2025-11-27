import React, { useEffect, useRef } from 'react';

type SpectrumProps = {
  analyser?: AnalyserNode | null;
  width?: number;
  height?: number;
  barWidth?: number;
};

const Spectrum: React.FC<SpectrumProps> = ({ analyser, width = 320, height = 80, barWidth = 2 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(17, 24, 39, 1)'; // bg-gray-900
      ctx.fillRect(0, 0, width, height);

      const barCount = Math.floor(width / (barWidth + 1));
      const step = Math.max(1, Math.floor(bufferLength / barCount));

      for (let i = 0; i < barCount; i++) {
        const v = dataArray[i * step] / 255; // 0..1
        const barHeight = v * height;

        // gradient from cyan to emerald
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#22d3ee'); // cyan-400
        gradient.addColorStop(1, '#34d399'); // emerald-400
        ctx.fillStyle = gradient;

        const x = i * (barWidth + 1);
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, width, height, barWidth]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height, display: 'block', borderRadius: 8, background: 'rgba(0,0,0,0.4)' }}
    />
  );
};

export default Spectrum;
