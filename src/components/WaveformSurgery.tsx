import React, { useRef, useEffect, useState, useCallback } from 'react';

interface WaveformSurgeryProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onEQPoint: (frequency: number, gain: number) => void;
}

export const WaveformSurgery: React.FC<WaveformSurgeryProps> = ({
  audioBuffer,
  currentTime,
  duration,
  onSeek,
  onEQPoint
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [eqPoints, setEQPoints] = useState<Array<{x: number, y: number, freq: number, gain: number}>>([]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / width);
    
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      const startSample = x * samplesPerPixel;
      let min = 1;
      let max = -1;
      
      for (let i = 0; i < samplesPerPixel; i++) {
        const sample = channelData[startSample + i] || 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      
      const yMin = ((min + 1) / 2) * height;
      const yMax = ((max + 1) / 2) * height;
      
      if (x === 0) {
        ctx.moveTo(x, yMin);
      } else {
        ctx.lineTo(x, yMin);
      }
      ctx.lineTo(x, yMax);
    }
    
    ctx.stroke();
    
    // Draw frequency spectrum overlay
    drawSpectrogram(ctx, width, height);
    
    // Draw EQ points
    eqPoints.forEach(point => {
      ctx.fillStyle = point.gain > 0 ? '#ff4444' : '#4444ff';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw frequency label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`${point.freq.toFixed(0)}Hz`, point.x + 10, point.y - 10);
      ctx.fillText(`${point.gain.toFixed(1)}dB`, point.x + 10, point.y + 5);
    });
    
    // Draw playhead
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    
  }, [audioBuffer, currentTime, duration, eqPoints]);

  const drawSpectrogram = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!audioBuffer) return;
    
    const channelData = audioBuffer.getChannelData(0);
    const fftSize = 1024;
    const hopSize = 512;
    const numFrames = Math.floor((channelData.length - fftSize) / hopSize);
    
    for (let frame = 0; frame < numFrames && frame < width; frame++) {
      const startSample = frame * hopSize;
      const frameData = channelData.slice(startSample, startSample + fftSize);
      const spectrum = performFFT(frameData);
      
      for (let bin = 0; bin < spectrum.length / 4; bin++) {
        const magnitude = Math.sqrt(spectrum[bin * 2] ** 2 + spectrum[bin * 2 + 1] ** 2);
        const intensity = Math.min(255, magnitude * 1000);
        const y = height - (bin / (spectrum.length / 4)) * height;
        
        ctx.fillStyle = `rgba(255, 255, 0, ${intensity / 255 * 0.3})`;
        ctx.fillRect(frame * (width / numFrames), y, width / numFrames, 2);
      }
    }
  };

  const performFFT = (data: Float32Array): Float32Array => {
    const N = data.length;
    const result = new Float32Array(N * 2);
    
    for (let k = 0; k < N; k++) {
      let realSum = 0;
      let imagSum = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        realSum += data[n] * Math.cos(angle);
        imagSum += data[n] * Math.sin(angle);
      }
      
      result[k * 2] = realSum;
      result[k * 2 + 1] = imagSum;
    }
    
    return result;
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (event.shiftKey) {
      // EQ mode - add EQ point
      const frequency = (x / canvas.width) * 22050; // Nyquist frequency
      const gain = ((canvas.height - y) / canvas.height - 0.5) * 24; // ±12dB range
      
      const newPoint = { x, y, freq: frequency, gain };
      setEQPoints(prev => [...prev, newPoint]);
      onEQPoint(frequency, gain);
    } else {
      // Seek mode
      const seekTime = (x / canvas.width) * duration;
      onSeek(seekTime);
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.altKey) {
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Draw EQ curve
    const frequency = (x / canvas.width) * 22050;
    const gain = ((canvas.height - y) / canvas.height - 0.5) * 24;
    onEQPoint(frequency, gain);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearEQPoints = () => {
    setEQPoints([]);
  };

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawWaveform();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawWaveform]);

  return (
    <div className="w-full h-64 bg-gray-900 rounded-lg overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <div className="absolute top-2 left-2 text-white text-sm bg-black bg-opacity-50 p-2 rounded">
        <div>Click: Seek | Shift+Click: Add EQ | Alt+Drag: Draw EQ</div>
        <button 
          onClick={clearEQPoints}
          className="mt-1 px-2 py-1 bg-red-600 text-white rounded text-xs"
        >
          Clear EQ
        </button>
      </div>
      <div className="absolute top-2 right-2 text-white text-sm bg-black bg-opacity-50 p-2 rounded">
        EQ Points: {eqPoints.length}
      </div>
    </div>
  );
};
