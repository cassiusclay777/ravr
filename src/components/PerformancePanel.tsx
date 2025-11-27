import React, { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiCpu, FiHardDrive, FiAlertTriangle, FiCheckCircle, FiZap } from 'react-icons/fi';
import { performanceMonitor, PerformanceMetrics, PerformanceAlert } from '../analytics/PerformanceMonitor';

interface PerformancePanelProps {
  audioContext?: AudioContext | null;
  compact?: boolean;
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ 
  audioContext, 
  compact = false 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (audioContext) {
      performanceMonitor.setAudioContext(audioContext);
    }
    
    performanceMonitor.start(1000);
    
    const unsubMetrics = performanceMonitor.onMetrics((m) => {
      setMetrics(m);
    });
    
    const unsubAlerts = performanceMonitor.onAlert((alert) => {
      setAlerts(prev => [...prev.slice(-4), alert]);
      
      // Auto-clear alerts after 5 seconds
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a !== alert));
      }, 5000);
    });
    
    return () => {
      unsubMetrics();
      unsubAlerts();
      performanceMonitor.stop();
    };
  }, [audioContext]);

  const getStatusColor = useCallback((value: number, warningThreshold: number, criticalThreshold: number) => {
    if (value >= criticalThreshold) return 'text-red-400';
    if (value >= warningThreshold) return 'text-yellow-400';
    return 'text-green-400';
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!metrics) {
    return (
      <div className="p-4 bg-black/30 rounded-xl border border-white/10">
        <div className="flex items-center gap-2 text-white/50">
          <FiActivity className="animate-pulse" />
          <span>Initializing performance monitor...</span>
        </div>
      </div>
    );
  }

  const memoryPercent = metrics.heapLimit > 0 
    ? (metrics.heapUsed / metrics.heapLimit) * 100 
    : 0;

  // Compact view for header/footer
  if (compact) {
    return (
      <div 
        className="flex items-center gap-4 text-xs font-mono cursor-pointer hover:bg-white/5 px-3 py-1.5 rounded-lg transition-all"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click for detailed performance metrics"
      >
        <div className={`flex items-center gap-1 ${getStatusColor(metrics.totalLatency, 15, 30)}`}>
          <FiActivity className="w-3 h-3" />
          <span>{metrics.totalLatency.toFixed(1)}ms</span>
        </div>
        
        <div className={`flex items-center gap-1 ${getStatusColor(metrics.dspLoadPercent, 60, 85)}`}>
          <FiCpu className="w-3 h-3" />
          <span>{metrics.dspLoadPercent.toFixed(0)}%</span>
        </div>
        
        <div className={`flex items-center gap-1 ${getStatusColor(memoryPercent, 70, 90)}`}>
          <FiHardDrive className="w-3 h-3" />
          <span>{memoryPercent.toFixed(0)}%</span>
        </div>
        
        {metrics.wasmActive && (
          <div className="flex items-center gap-1 text-cyan-400">
            <FiZap className="w-3 h-3" />
          </div>
        )}
        
        {alerts.length > 0 && (
          <div className="flex items-center gap-1 text-yellow-400 animate-pulse">
            <FiAlertTriangle className="w-3 h-3" />
            <span>{alerts.length}</span>
          </div>
        )}
      </div>
    );
  }

  // Full panel view
  return (
    <div className="p-4 bg-black/30 rounded-xl border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
          <FiActivity className="text-cyan-400" />
          Performance Monitor
        </h3>
        <div className={`flex items-center gap-1 text-sm ${
          metrics.audioContextState === 'running' ? 'text-green-400' : 'text-yellow-400'
        }`}>
          {metrics.audioContextState === 'running' ? <FiCheckCircle /> : <FiAlertTriangle />}
          {metrics.audioContextState}
        </div>
      </div>
      
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div 
              key={idx}
              className={`p-2 rounded-lg text-sm flex items-center gap-2 ${
                alert.type === 'critical' 
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400' 
                  : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
              }`}
            >
              <FiAlertTriangle />
              {alert.message}
            </div>
          ))}
        </div>
      )}
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Latency */}
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/50 mb-1">Latency</div>
          <div className={`text-xl font-mono ${getStatusColor(metrics.totalLatency, 15, 30)}`}>
            {metrics.totalLatency.toFixed(1)}<span className="text-sm">ms</span>
          </div>
          <div className="text-xs text-white/40 mt-1">
            In: {metrics.inputLatency.toFixed(1)}ms / Out: {metrics.outputLatency.toFixed(1)}ms
          </div>
        </div>
        
        {/* DSP Load */}
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/50 mb-1">DSP Load</div>
          <div className={`text-xl font-mono ${getStatusColor(metrics.dspLoadPercent, 60, 85)}`}>
            {metrics.dspLoadPercent.toFixed(1)}<span className="text-sm">%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
            <div 
              className={`h-full rounded-full transition-all ${
                metrics.dspLoadPercent > 85 ? 'bg-red-500' : 
                metrics.dspLoadPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, metrics.dspLoadPercent)}%` }}
            />
          </div>
        </div>
        
        {/* Memory */}
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/50 mb-1">Memory</div>
          <div className={`text-xl font-mono ${getStatusColor(memoryPercent, 70, 90)}`}>
            {memoryPercent.toFixed(0)}<span className="text-sm">%</span>
          </div>
          <div className="text-xs text-white/40 mt-1">
            {formatBytes(metrics.heapUsed)} / {formatBytes(metrics.heapLimit)}
          </div>
        </div>
        
        {/* Buffer Size */}
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/50 mb-1">Buffer</div>
          <div className="text-xl font-mono text-white/80">
            {metrics.bufferSize}<span className="text-sm"> samples</span>
          </div>
          <div className="text-xs text-white/40 mt-1">
            {(metrics.bufferSize / metrics.sampleRate * 1000).toFixed(2)}ms @ {metrics.sampleRate}Hz
          </div>
        </div>
        
        {/* Processing Time */}
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/50 mb-1">Process Time</div>
          <div className={`text-xl font-mono ${getStatusColor(metrics.averageProcessTime, 5, 10)}`}>
            {metrics.averageProcessTime.toFixed(2)}<span className="text-sm">ms</span>
          </div>
          <div className="text-xs text-white/40 mt-1">
            Max: {metrics.maxProcessTime.toFixed(2)}ms / Jitter: {metrics.jitter.toFixed(2)}ms
          </div>
        </div>
        
        {/* Buffer Underruns */}
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/50 mb-1">Underruns</div>
          <div className={`text-xl font-mono ${metrics.bufferUnderruns > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {metrics.bufferUnderruns}
          </div>
          <button 
            onClick={() => performanceMonitor.resetUnderrunCounter()}
            className="text-xs text-cyan-400 hover:text-cyan-300 mt-1"
          >
            Reset counter
          </button>
        </div>
      </div>
      
      {/* Status Indicators */}
      <div className="flex items-center gap-4 text-sm">
        <div className={`flex items-center gap-1 ${metrics.wasmActive ? 'text-cyan-400' : 'text-white/30'}`}>
          <FiZap />
          WASM {metrics.wasmActive ? 'Active' : 'Inactive'}
        </div>
        <div className={`flex items-center gap-1 ${metrics.gpuActive ? 'text-purple-400' : 'text-white/30'}`}>
          <FiCpu />
          GPU {metrics.gpuActive ? 'Available' : 'Unavailable'}
        </div>
      </div>
    </div>
  );
};

export default PerformancePanel;
