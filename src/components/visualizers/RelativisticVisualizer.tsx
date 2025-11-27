import React, { useEffect, useRef, useState } from 'react';

interface RelativisticVisualizerProps {
  audioContext: AudioContext;
  analyser: AnalyserNode | null;
  velocity: number; // 0-99 (percentage of c)
  timeDilation: number; // Lorentz factor
  dopplerFactor: number;
  enabled: boolean;
}

export function RelativisticVisualizer({
  audioContext,
  analyser,
  velocity,
  timeDilation,
  dopplerFactor,
  enabled,
}: RelativisticVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showComparison, setShowComparison] = useState(false);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!enabled || !analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // FFT data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!enabled) return;

      animationFrameRef.current = requestAnimationFrame(draw);

      // Get audio data
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDataArray);

      // Clear canvas
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);

      if (showComparison) {
        // Split view: Before (top) vs After (bottom)
        drawComparisonView(ctx, width, height, dataArray, timeDataArray);
      } else {
        // Single view with distortion
        drawDistortedView(ctx, width, height, dataArray, timeDataArray);
      }

      // Draw metrics overlay
      drawMetricsOverlay(ctx, width, height);
    };

    const drawDistortedView = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      freqData: Uint8Array,
      timeData: Uint8Array
    ) => {
      const halfHeight = height / 2;

      // 1. Waveform (top half) - with time dilation distortion
      ctx.beginPath();
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.5 + velocity / 200})`;
      ctx.lineWidth = 2;

      const sliceWidth = width / timeData.length;
      let x = 0;

      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * halfHeight) / 2 + halfHeight / 2;

        // Apply time dilation distortion
        const distortedY = y + Math.sin(i * 0.05 + velocity * 0.1) * (timeDilation - 1) * 10;

        if (i === 0) {
          ctx.moveTo(x, distortedY);
        } else {
          ctx.lineTo(x, distortedY);
        }

        x += sliceWidth * timeDilation; // Lorentz contraction effect on x-axis
        if (x > width) break;
      }

      ctx.stroke();

      // 2. Frequency spectrum (bottom half) - with Doppler shift
      const barWidth = width / freqData.length;
      const dopplerShift = (dopplerFactor - 1) * 50; // Visual shift amount

      for (let i = 0; i < freqData.length; i++) {
        const barHeight = (freqData[i] / 255) * halfHeight;

        // Color based on velocity (blue → red shift)
        const hue = 240 - (velocity / 99) * 120; // 240 (blue) to 120 (green) to 0 (red)
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.8)`;

        // Apply Doppler shift horizontally
        const shiftedX = i * barWidth + dopplerShift;

        if (shiftedX >= 0 && shiftedX < width) {
          ctx.fillRect(
            shiftedX,
            height - barHeight,
            barWidth - 1,
            barHeight
          );
        }
      }

      // 3. Relativistic grid overlay
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.lineWidth = 1;

      // Horizontal lines (curved by spacetime)
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        for (let x = 0; x < width; x += 5) {
          const curvature = Math.sin((x / width) * Math.PI) * (timeDilation - 1) * 20;
          const curvedY = y + curvature;
          if (x === 0) {
            ctx.moveTo(x, curvedY);
          } else {
            ctx.lineTo(x, curvedY);
          }
        }
        ctx.stroke();
      }
    };

    const drawComparisonView = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      freqData: Uint8Array,
      timeData: Uint8Array
    ) => {
      const halfHeight = height / 2;

      // Top: Normal (Before)
      ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
      ctx.fillRect(0, 0, width, halfHeight);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('BEFORE (Normal)', 10, 20);

      // Draw normal waveform
      ctx.beginPath();
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2;

      const sliceWidth = width / timeData.length;
      let x = 0;

      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * halfHeight) / 2 + halfHeight / 4;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

      // Bottom: Relativistic (After)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(0, halfHeight, width, halfHeight);

      ctx.fillStyle = '#3b82f6';
      ctx.fillText('AFTER (Relativistic)', 10, halfHeight + 20);

      // Draw distorted waveform
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;

      x = 0;

      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * halfHeight) / 2 + halfHeight + halfHeight / 4;

        // Apply distortion
        const distortedY = y + Math.sin(i * 0.05 + velocity * 0.1) * (timeDilation - 1) * 5;

        if (i === 0) {
          ctx.moveTo(x, distortedY);
        } else {
          ctx.lineTo(x, distortedY);
        }

        x += sliceWidth * timeDilation;
        if (x > width) break;
      }

      ctx.stroke();

      // Divider line
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, halfHeight);
      ctx.lineTo(width, halfHeight);
      ctx.stroke();
    };

    const drawMetricsOverlay = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
      // Velocity indicator (top-right corner)
      const boxWidth = 180;
      const boxHeight = 80;
      const padding = 15;

      ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
      ctx.fillRect(width - boxWidth - padding, padding, boxWidth, boxHeight);

      ctx.strokeStyle = velocity > 70 ? '#ef4444' : velocity > 40 ? '#eab308' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(width - boxWidth - padding, padding, boxWidth, boxHeight);

      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.textAlign = 'center';
      ctx.fillText(`${velocity}% c`, width - boxWidth / 2 - padding, padding + 35);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`γ = ${timeDilation.toFixed(3)}`, width - boxWidth / 2 - padding, padding + 55);
      ctx.fillText(`Doppler = ${dopplerFactor.toFixed(3)}x`, width - boxWidth / 2 - padding, padding + 70);

      ctx.textAlign = 'left';
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, analyser, velocity, timeDilation, dopplerFactor, showComparison]);

  if (!enabled) {
    return (
      <div className="relativistic-visualizer bg-gray-800 rounded-lg p-8 text-center text-gray-500">
        <p>Enable Relativistic Effects to see visualization</p>
      </div>
    );
  }

  return (
    <div className="relativistic-visualizer">
      {/* Canvas */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <canvas
          ref={canvasRef}
          className="w-full h-64"
          style={{ display: 'block' }}
        />

        {/* Comparison Toggle */}
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="absolute top-4 left-4 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-sm font-medium transition-colors border border-gray-600"
        >
          {showComparison ? '📊 Single View' : '🔀 Compare Before/After'}
        </button>

        {/* Physics Equations Overlay */}
        <div className="absolute bottom-4 left-4 bg-gray-800/90 rounded-lg p-3 text-xs font-mono space-y-1 border border-gray-600">
          <div className="text-blue-400">γ = 1/√(1 - v²/c²)</div>
          <div className="text-purple-400">Δt' = γΔt</div>
          <div className="text-green-400">f' = f√((1+v)/(1-v))</div>
        </div>

        {/* Velocity Warning */}
        {velocity > 80 && (
          <div className="absolute top-4 right-4 bg-red-500/90 px-4 py-2 rounded-lg text-sm font-bold animate-pulse">
            ⚠️ EXTREME RELATIVISTIC EFFECTS
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 bg-gray-800 rounded-lg p-4 text-sm">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-blue-400 font-semibold">● Waveform:</span>
            <p className="text-gray-400 text-xs mt-1">
              Top section shows time domain with Lorentz contraction on x-axis
            </p>
          </div>
          <div>
            <span className="text-purple-400 font-semibold">● Spectrum:</span>
            <p className="text-gray-400 text-xs mt-1">
              Bottom shows frequency domain with Doppler shift (blue → red)
            </p>
          </div>
          <div>
            <span className="text-gray-400 font-semibold">● Grid:</span>
            <p className="text-gray-400 text-xs mt-1">
              Curved lines represent spacetime curvature from velocity
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
