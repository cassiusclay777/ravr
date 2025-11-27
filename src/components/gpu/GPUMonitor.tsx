import React, { useEffect, useRef, useState } from 'react';
import { GPUProcessingStats } from '../../audio/GPUAudioProcessor';

interface GPUMonitorProps {
  gpuStats: GPUProcessingStats;
  gpuInfo: any;
  gpuEnabled: boolean;
  onToggleGPU: (enabled: boolean) => void;
  hybridStatus?: {
    gpuAvailable: boolean;
    gpuForFFT: boolean;
    gpuForConvolution: boolean;
  };
}

export function GPUMonitor({
  gpuStats,
  gpuInfo,
  gpuEnabled,
  onToggleGPU,
  hybridStatus,
}: GPUMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const processingHistory = useRef<number[]>([]);

  // Update processing time history for graph
  useEffect(() => {
    if (gpuStats.lastUpdateTime > 0) {
      processingHistory.current.push(gpuStats.processingTime);

      // Keep only last 60 data points
      if (processingHistory.current.length > 60) {
        processingHistory.current.shift();
      }

      // Draw graph
      drawProcessingGraph();
    }
  }, [gpuStats.lastUpdateTime]);

  const drawProcessingGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw processing time line
    if (processingHistory.current.length < 2) return;

    const maxTime = Math.max(...processingHistory.current, 10); // Min 10ms scale
    const dataPoints = processingHistory.current;

    ctx.beginPath();
    ctx.strokeStyle = gpuStats.gpuEnabled ? '#3b82f6' : '#9ca3af';
    ctx.lineWidth = 2;

    dataPoints.forEach((time, index) => {
      const x = (width / 60) * index;
      const y = height - (time / maxTime) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw current value indicator
    const lastX = (width / 60) * (dataPoints.length - 1);
    const lastY = height - (dataPoints[dataPoints.length - 1] / maxTime) * height;

    ctx.fillStyle = gpuStats.gpuEnabled ? '#3b82f6' : '#9ca3af';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw time labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px monospace';
    ctx.fillText('0ms', 5, height - 5);
    ctx.fillText(`${maxTime.toFixed(1)}ms`, 5, 12);
  };

  return (
    <div className="gpu-monitor bg-gray-900 rounded-lg p-6 text-white border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🎮</div>
          <div>
            <h3 className="text-lg font-bold">GPU Acceleration</h3>
            <p className="text-xs text-gray-400">
              {gpuStats.gpuAvailable ? 'WebGPU Supported' : 'WebGPU Not Available'}
            </p>
          </div>
        </div>

        {/* GPU Toggle */}
        {gpuStats.gpuAvailable && (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={gpuEnabled}
              onChange={(e) => onToggleGPU(e.target.checked)}
              className="mr-2 w-5 h-5"
            />
            <span className="text-sm font-medium">
              {gpuEnabled ? '🟢 Enabled' : '🔴 Disabled'}
            </span>
          </label>
        )}
      </div>

      {/* GPU Not Available Message */}
      {!gpuStats.gpuAvailable && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-200">
            ⚠️ WebGPU is not available in this browser.
            <br />
            Try Chrome 113+, Edge 113+, or enable WebGPU in browser flags.
          </p>
        </div>
      )}

      {/* Processing Graph */}
      {gpuStats.gpuAvailable && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-300">Processing Time</h4>
          <div className="relative bg-gray-800 rounded-lg p-2">
            <canvas
              ref={canvasRef}
              width={500}
              height={120}
              className="w-full"
              style={{ display: 'block' }}
            />
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      {gpuStats.gpuAvailable && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Processing Time</div>
            <div className="text-2xl font-mono font-bold text-blue-400">
              {gpuStats.processingTime.toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-500">milliseconds</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Speedup Factor</div>
            <div className="text-2xl font-mono font-bold text-green-400">
              {gpuStats.speedupFactor.toFixed(1)}x
            </div>
            <div className="text-[10px] text-gray-500">vs CPU</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Status</div>
            <div className={`text-2xl font-bold ${gpuStats.gpuEnabled ? 'text-green-400' : 'text-gray-400'}`}>
              {gpuStats.gpuEnabled ? '🚀' : '⏸️'}
            </div>
            <div className="text-[10px] text-gray-500">
              {gpuStats.gpuEnabled ? 'Active' : 'Paused'}
            </div>
          </div>
        </div>
      )}

      {/* Hybrid Processing Status */}
      {hybridStatus && hybridStatus.gpuAvailable && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold mb-2 text-blue-300 flex items-center gap-2">
            <span>⚡</span> Hybrid CPU/GPU Processing
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">FFT:</span>
              <span className={hybridStatus.gpuForFFT ? 'text-green-400' : 'text-gray-400'}>
                {hybridStatus.gpuForFFT ? '🎮 GPU' : '⚙️ CPU'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Convolution:</span>
              <span className={hybridStatus.gpuForConvolution ? 'text-green-400' : 'text-gray-400'}>
                {hybridStatus.gpuForConvolution ? '🎮 GPU' : '⚙️ CPU'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* GPU Hardware Info */}
      {gpuStats.gpuAvailable && gpuInfo && (
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-300 hover:text-white transition-colors mb-2"
          >
            <span>🔧 Hardware Information</span>
            <span className="text-xs">{showDetails ? '▼' : '▶'}</span>
          </button>

          {showDetails && (
            <div className="bg-gray-800 rounded-lg p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">GPU:</span>
                <span className="text-white font-mono">{gpuInfo.description || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vendor:</span>
                <span className="text-white font-mono">{gpuInfo.vendor || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Architecture:</span>
                <span className="text-white font-mono">{gpuInfo.architecture || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pipelines:</span>
                <span className="text-white font-mono">{gpuInfo.pipelineCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Initialized:</span>
                <span className={`font-mono ${gpuInfo.isInitialized ? 'text-green-400' : 'text-red-400'}`}>
                  {gpuInfo.isInitialized ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Browser Compatibility Info */}
      {!gpuStats.gpuAvailable && (
        <div className="mt-4 text-xs text-gray-500">
          <p className="mb-2 font-semibold">WebGPU Browser Support:</p>
          <ul className="space-y-1 ml-4">
            <li>✅ Chrome 113+ (Stable)</li>
            <li>✅ Edge 113+ (Stable)</li>
            <li>🔶 Safari 18+ (Experimental)</li>
            <li>🔶 Firefox (Behind Flag)</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default GPUMonitor;
