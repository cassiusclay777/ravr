/**
 * RAVR Performance Monitor
 * Real-time performance tracking for audio processing
 */

export interface PerformanceMetrics {
  // Audio latency
  inputLatency: number;      // ms
  outputLatency: number;     // ms
  totalLatency: number;      // ms
  
  // Processing
  dspLoadPercent: number;    // 0-100%
  bufferUnderruns: number;   // count
  bufferSize: number;        // samples
  sampleRate: number;        // Hz
  
  // Memory
  heapUsed: number;          // bytes
  heapTotal: number;         // bytes
  heapLimit: number;         // bytes
  
  // Timing
  averageProcessTime: number; // ms per block
  maxProcessTime: number;     // ms
  jitter: number;             // ms
  
  // Status
  audioContextState: string;
  wasmActive: boolean;
  gpuActive: boolean;
  timestamp: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  category: 'latency' | 'cpu' | 'memory' | 'buffer';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

type AlertCallback = (alert: PerformanceAlert) => void;
type MetricsCallback = (metrics: PerformanceMetrics) => void;

export class PerformanceMonitor {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private processingTimes: number[] = [];
  private bufferUnderruns = 0;
  private lastUpdateTime = 0;
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  
  // Thresholds
  private thresholds = {
    maxLatency: 20,           // ms
    maxCpuLoad: 80,           // %
    maxMemoryPercent: 85,     // %
    maxProcessTime: 10,       // ms
    maxJitter: 5              // ms
  };
  
  // Callbacks
  private alertCallbacks: AlertCallback[] = [];
  private metricsCallbacks: MetricsCallback[] = [];
  
  // Metrics history for averaging
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistoryLength = 60; // 1 minute at 1Hz
  
  constructor() {
    this.bindGlobalMonitoring();
  }
  
  /**
   * Set the AudioContext to monitor
   */
  setAudioContext(ctx: AudioContext): void {
    this.audioContext = ctx;
    
    // Create analyzer for processing metrics
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
  }
  
  /**
   * Start monitoring
   */
  start(intervalMs = 1000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastUpdateTime = performance.now();
    
    this.monitoringInterval = window.setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
    
    console.log('📊 Performance monitoring started');
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('📊 Performance monitoring stopped');
  }
  
  /**
   * Register alert callback
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Register metrics callback
   */
  onMetrics(callback: MetricsCallback): () => void {
    this.metricsCallbacks.push(callback);
    return () => {
      this.metricsCallbacks = this.metricsCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Record processing time for a block
   */
  recordProcessingTime(timeMs: number): void {
    this.processingTimes.push(timeMs);
    
    // Keep only last 100 samples
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    
    // Check for buffer underrun (processing took too long)
    if (this.audioContext) {
      const bufferDuration = 128 / this.audioContext.sampleRate * 1000;
      if (timeMs > bufferDuration) {
        this.bufferUnderruns++;
      }
    }
  }
  
  /**
   * Collect all metrics
   */
  private collectMetrics(): void {
    const metrics = this.getCurrentMetrics();
    
    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory.shift();
    }
    
    // Notify listeners
    this.metricsCallbacks.forEach(cb => cb(metrics));
    
    // Check thresholds and generate alerts
    this.checkThresholds(metrics);
  }
  
  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): PerformanceMetrics {
    const now = performance.now();
    
    // Audio latency
    let inputLatency = 0;
    let outputLatency = 0;
    let bufferSize = 128;
    let sampleRate = 48000;
    let audioContextState = 'suspended';
    
    if (this.audioContext) {
      // @ts-ignore - these properties exist but may not be typed
      inputLatency = (this.audioContext.baseLatency || 0) * 1000;
      // @ts-ignore
      outputLatency = (this.audioContext.outputLatency || 0) * 1000;
      sampleRate = this.audioContext.sampleRate;
      audioContextState = this.audioContext.state;
      
      // Estimate buffer size from base latency
      bufferSize = Math.round((inputLatency / 1000) * sampleRate) || 128;
    }
    
    // Processing times
    const avgProcessTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;
    
    const maxProcessTime = this.processingTimes.length > 0
      ? Math.max(...this.processingTimes)
      : 0;
    
    // Calculate jitter (variation in processing time)
    let jitter = 0;
    if (this.processingTimes.length > 1) {
      const diffs = this.processingTimes.slice(1).map((t, i) => 
        Math.abs(t - this.processingTimes[i])
      );
      jitter = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    }
    
    // Memory usage
    let heapUsed = 0;
    let heapTotal = 0;
    let heapLimit = 0;
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      heapUsed = memory.usedJSHeapSize;
      heapTotal = memory.totalJSHeapSize;
      heapLimit = memory.jsHeapSizeLimit;
    }
    
    // DSP load estimation (based on processing time vs available time)
    const bufferDurationMs = bufferSize / sampleRate * 1000;
    const dspLoadPercent = bufferDurationMs > 0 
      ? Math.min(100, (avgProcessTime / bufferDurationMs) * 100)
      : 0;
    
    // Check for WASM and GPU activity
    const wasmActive = typeof WebAssembly !== 'undefined';
    const gpuActive = 'gpu' in navigator;
    
    return {
      inputLatency,
      outputLatency,
      totalLatency: inputLatency + outputLatency,
      dspLoadPercent,
      bufferUnderruns: this.bufferUnderruns,
      bufferSize,
      sampleRate,
      heapUsed,
      heapTotal,
      heapLimit,
      averageProcessTime: avgProcessTime,
      maxProcessTime,
      jitter,
      audioContextState,
      wasmActive,
      gpuActive,
      timestamp: now
    };
  }
  
  /**
   * Check thresholds and emit alerts
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    // Latency check
    if (metrics.totalLatency > this.thresholds.maxLatency) {
      this.emitAlert({
        type: metrics.totalLatency > this.thresholds.maxLatency * 2 ? 'critical' : 'warning',
        category: 'latency',
        message: `High audio latency: ${metrics.totalLatency.toFixed(1)}ms`,
        value: metrics.totalLatency,
        threshold: this.thresholds.maxLatency,
        timestamp: metrics.timestamp
      });
    }
    
    // CPU load check
    if (metrics.dspLoadPercent > this.thresholds.maxCpuLoad) {
      this.emitAlert({
        type: metrics.dspLoadPercent > 95 ? 'critical' : 'warning',
        category: 'cpu',
        message: `High DSP load: ${metrics.dspLoadPercent.toFixed(1)}%`,
        value: metrics.dspLoadPercent,
        threshold: this.thresholds.maxCpuLoad,
        timestamp: metrics.timestamp
      });
    }
    
    // Memory check
    if (metrics.heapLimit > 0) {
      const memoryPercent = (metrics.heapUsed / metrics.heapLimit) * 100;
      if (memoryPercent > this.thresholds.maxMemoryPercent) {
        this.emitAlert({
          type: memoryPercent > 95 ? 'critical' : 'warning',
          category: 'memory',
          message: `High memory usage: ${memoryPercent.toFixed(1)}%`,
          value: memoryPercent,
          threshold: this.thresholds.maxMemoryPercent,
          timestamp: metrics.timestamp
        });
      }
    }
    
    // Buffer underrun check
    if (metrics.bufferUnderruns > 0 && this.metricsHistory.length > 1) {
      const prevMetrics = this.metricsHistory[this.metricsHistory.length - 2];
      const newUnderruns = metrics.bufferUnderruns - prevMetrics.bufferUnderruns;
      
      if (newUnderruns > 0) {
        this.emitAlert({
          type: newUnderruns > 5 ? 'critical' : 'warning',
          category: 'buffer',
          message: `Buffer underruns detected: ${newUnderruns} new`,
          value: newUnderruns,
          threshold: 0,
          timestamp: metrics.timestamp
        });
      }
    }
  }
  
  /**
   * Emit alert to all listeners
   */
  private emitAlert(alert: PerformanceAlert): void {
    this.alertCallbacks.forEach(cb => cb(alert));
  }
  
  /**
   * Bind global performance monitoring
   */
  private bindGlobalMonitoring(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task threshold
              console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(1)}ms`);
            }
          }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Not all browsers support longtask observation
      }
    }
  }
  
  /**
   * Get metrics history
   */
  getHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }
  
  /**
   * Get average metrics over time window
   */
  getAverageMetrics(windowSeconds = 10): Partial<PerformanceMetrics> {
    const windowMs = windowSeconds * 1000;
    const now = performance.now();
    
    const recentMetrics = this.metricsHistory.filter(
      m => now - m.timestamp < windowMs
    );
    
    if (recentMetrics.length === 0) return {};
    
    const sum = recentMetrics.reduce((acc, m) => ({
      totalLatency: acc.totalLatency + m.totalLatency,
      dspLoadPercent: acc.dspLoadPercent + m.dspLoadPercent,
      averageProcessTime: acc.averageProcessTime + m.averageProcessTime,
      jitter: acc.jitter + m.jitter
    }), { totalLatency: 0, dspLoadPercent: 0, averageProcessTime: 0, jitter: 0 });
    
    const count = recentMetrics.length;
    
    return {
      totalLatency: sum.totalLatency / count,
      dspLoadPercent: sum.dspLoadPercent / count,
      averageProcessTime: sum.averageProcessTime / count,
      jitter: sum.jitter / count
    };
  }
  
  /**
   * Update thresholds
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
  
  /**
   * Reset buffer underrun counter
   */
  resetUnderrunCounter(): void {
    this.bufferUnderruns = 0;
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    this.alertCallbacks = [];
    this.metricsCallbacks = [];
    this.metricsHistory = [];
    this.processingTimes = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;
