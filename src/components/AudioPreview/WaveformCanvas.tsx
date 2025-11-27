import React, { useRef, useEffect, useState } from 'react';
import './styles/audioPreview.css';

interface WaveformCanvasProps {
  width: number;
  height: number;
  sampleRate: number;
  channelData: Float32Array;
  channelIndex: number;
  totalChannels: number;
  minTime: number;
  maxTime: number;
  minAmplitude: number;
  maxAmplitude: number;
  waveformVerticalScale: number;
}

export default function WaveformCanvas({
  width,
  height,
  sampleRate,
  channelData,
  channelIndex,
  totalChannels,
  minTime,
  maxTime,
  minAmplitude,
  maxAmplitude,
  waveformVerticalScale,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const axisCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const axisCanvas = axisCanvasRef.current;
    
    if (!canvas || !axisCanvas) return;

    const context = canvas.getContext('2d', { alpha: false });
    const axisContext = axisCanvas.getContext('2d');
    
    if (!context || !axisContext) return;

    // Clear canvases
    context.clearRect(0, 0, width, height);
    axisContext.clearRect(0, 0, width, height);

    // Set styles
    context.fillStyle = 'rgb(160,60,200)';
    context.strokeStyle = 'rgb(160,60,200)';
    axisContext.font = '12px Arial';

    // Draw horizontal axis
    const timeRange = maxTime - minTime;
    const [niceT, digitT] = roundToNearestNiceNumber(timeRange / 10);
    const dx = width / timeRange;
    const t0 = Math.ceil(minTime / niceT) * niceT;
    const numTAxis = Math.floor(timeRange / niceT);
    
    for (let i = 0; i <= numTAxis; i++) {
      const t = t0 + niceT * i;
      const x = (t - minTime) * dx;

      axisContext.fillStyle = 'rgb(245,130,32)';
      if (width * 0.05 < x && x < width * 0.95) {
        axisContext.fillText(`${t.toFixed(digitT)}`, x, 10);
      }

      axisContext.fillStyle = 'rgb(180,120,20)';
      for (let j = 0; j < height; j++) {
        axisContext.fillRect(x, j, 1, 1);
      }
    }

    // Draw vertical axis
    const amplitudeRange = maxAmplitude - minAmplitude;
    const [niceA, digitA] = roundToNearestNiceNumber(
      amplitudeRange / (10 * waveformVerticalScale)
    );
    const dy = height / amplitudeRange;
    const a0 = Math.ceil(minAmplitude / niceA) * niceA;
    const numAAxis = Math.floor(amplitudeRange / niceA);
    
    for (let i = 0; i <= numAAxis; i++) {
      const a = a0 + niceA * i;
      const y = height - (a - minAmplitude) * dy;

      axisContext.fillStyle = 'rgb(245,130,32)';
      if (12 < y && y < height) {
        axisContext.fillText(`${a.toFixed(digitA)}`, 4, y - 2);
      }

      axisContext.fillStyle = 'rgb(180,120,20)';
      if (12 < y && y < height) {
        for (let j = 0; j < width; j++) {
          axisContext.fillRect(j, y, 1, 1);
        }
      }
    }

    // Draw waveform
    const startIndex = Math.floor(minTime * sampleRate);
    const endIndex = Math.floor(maxTime * sampleRate);
    const step = Math.ceil((endIndex - startIndex) / 200000);
    const data = channelData
      .slice(startIndex, endIndex)
      .filter((_, i) => i % step === 0);

    for (let i = 0; i < data.length; i++) {
      const d = (data[i] - minAmplitude) / amplitudeRange;
      const x = (i / data.length) * width;
      const y = height * (1 - d);

      if (data.length > width * 5) {
        context.fillRect(x, y, 1, 1);
      } else {
        if (i === 0) {
          context.beginPath();
          context.moveTo(x, y);
        } else if (i === data.length - 1) {
          context.lineTo(x, y);
          context.stroke();
        } else {
          context.lineTo(x, y);
        }
      }
    }

    // Draw channel label
    if (totalChannels > 1) {
      let channelText = '';
      if (totalChannels === 2) {
        channelText = channelIndex === 0 ? 'Lch' : 'Rch';
      } else {
        channelText = 'ch' + String(channelIndex + 1);
      }

      axisContext.font = '12px Arial';
      axisContext.fillStyle = 'rgb(220, 220, 220)';
      axisContext.fillText(channelText, 33, 10);
    }
  }, [width, height, sampleRate, channelData, channelIndex, totalChannels, minTime, maxTime, minAmplitude, maxAmplitude, waveformVerticalScale]);

  return (
    <div ref={containerRef} className="waveform-container">
      <canvas
        ref={axisCanvasRef}
        className="axis-canvas"
        width={width}
        height={height}
        style={{ position: 'absolute', zIndex: 1 }}
      />
      <canvas
        ref={canvasRef}
        className="main-canvas"
        width={width}
        height={height}
        style={{ position: 'absolute', zIndex: 2 }}
      />
    </div>
  );
}

// Helper function from original code
function roundToNearestNiceNumber(value: number): [number, number] {
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  
  let nice: number;
  let digit: number;
  
  if (normalized <= 1) {
    nice = 1;
    digit = 0;
  } else if (normalized <= 2) {
    nice = 2;
    digit = 0;
  } else if (normalized <= 5) {
    nice = 5;
    digit = 0;
  } else {
    nice = 10;
    digit = 0;
  }
  
  return [nice * magnitude, digit];
}

