interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | '%';
  timestamp: number;
}

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  userAgent: string;
  timestamp: number;
  sessionId: string;
  additionalData?: Record<string, any>;
}

export class AnalyticsManager {
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorReport[] = [];
  private isEnabled = true;
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadUserSettings();
    this.setupErrorHandling();
    this.startPerformanceMonitoring();
    this.scheduleDataFlush();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadUserSettings(): void {
    const settings = localStorage.getItem('ravr-analytics-settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      this.isEnabled = parsed.enabled ?? true;
      this.userId = parsed.userId;
    }
    
    // Generate anonymous user ID if not exists
    if (!this.userId) {
      this.userId = `user_${Math.random().toString(36).substr(2, 9)}`;
      this.saveUserSettings();
    }
  }

  private saveUserSettings(): void {
    localStorage.setItem('ravr-analytics-settings', JSON.stringify({
      enabled: this.isEnabled,
      userId: this.userId
    }));
  }

  private setupErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: this.sessionId
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        additionalData: { promiseRejection: true }
      });
    });
  }

  private startPerformanceMonitoring(): void {
    // Monitor memory usage
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.recordMetric('memory.used', memory.usedJSHeapSize, 'bytes');
        this.recordMetric('memory.total', memory.totalJSHeapSize, 'bytes');
        this.recordMetric('memory.limit', memory.jsHeapSizeLimit, 'bytes');
      }
    }, 10000);

    // Monitor audio context state
    setInterval(() => {
      const contexts = this.getAudioContexts();
      this.recordMetric('audio.contexts.count', contexts.length, 'count');
      
      contexts.forEach((ctx, index) => {
        this.recordMetric(`audio.context.${index}.state`, 
          ctx.state === 'running' ? 1 : 0, 'count');
      });
    }, 5000);
  }

  private getAudioContexts(): AudioContext[] {
    // This would need to be integrated with actual audio context management
    return [];
  }

  private scheduleDataFlush(): void {
    setInterval(() => {
      this.flushData();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushData(true);
    });
  }

  // Public API
  trackEvent(name: string, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.events.push(event);
    
    if (this.events.length >= this.batchSize) {
      this.flushData();
    }
  }

  recordMetric(name: string, value: number, unit: PerformanceMetric['unit']): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
  }

  reportError(error: Partial<ErrorReport>): void {
    if (!this.isEnabled) return;

    const errorReport: ErrorReport = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      url: error.url || window.location.href,
      lineNumber: error.lineNumber,
      columnNumber: error.columnNumber,
      userAgent: error.userAgent || navigator.userAgent,
      timestamp: error.timestamp || Date.now(),
      sessionId: error.sessionId || this.sessionId,
      additionalData: error.additionalData
    };

    this.errors.push(errorReport);
    
    // Immediately send critical errors
    if (this.errors.length >= 5) {
      this.flushData();
    }
  }

  // Predefined event tracking methods
  trackPageView(page: string): void {
    this.trackEvent('page_view', { page });
  }

  trackAudioLoad(format: string, size: number, duration: number): void {
    this.trackEvent('audio_load', { format, size, duration });
  }

  trackDSPUsage(effectType: string, preset?: string): void {
    this.trackEvent('dsp_usage', { effectType, preset });
  }

  trackMIDIConnection(deviceName: string, success: boolean): void {
    this.trackEvent('midi_connection', { deviceName, success });
  }

  trackVSTLoad(pluginName: string, success: boolean, loadTime?: number): void {
    this.trackEvent('vst_load', { pluginName, success, loadTime });
  }

  trackAIProcessing(modelType: string, processingTime: number, success: boolean): void {
    this.trackEvent('ai_processing', { modelType, processingTime, success });
  }

  trackCollaboration(action: 'create' | 'join' | 'leave', participantCount?: number): void {
    this.trackEvent('collaboration', { action, participantCount });
  }

  trackExport(format: string, quality: string, fileSize: number): void {
    this.trackEvent('audio_export', { format, quality, fileSize });
  }

  trackSettingsChange(category: string, setting: string, value: any): void {
    this.trackEvent('settings_change', { category, setting, value });
  }

  trackPerformanceIssue(type: 'high_cpu' | 'memory_leak' | 'audio_dropout', details: any): void {
    this.trackEvent('performance_issue', { type, ...details });
  }

  // Performance timing helpers
  startTimer(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(`timing.${name}`, duration, 'ms');
    };
  }

  measureAsync<T>(name: string, promise: Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    return promise.finally(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(`timing.${name}`, duration, 'ms');
    });
  }

  // Data management
  private async flushData(synchronous = false): Promise<void> {
    if (!this.isEnabled || (!this.events.length && !this.metrics.length && !this.errors.length)) {
      return;
    }

    const payload = {
      events: [...this.events],
      metrics: [...this.metrics],
      errors: [...this.errors],
      session: {
        id: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    // Clear local data
    this.events = [];
    this.metrics = [];
    this.errors = [];

    try {
      if (synchronous) {
        // Use sendBeacon for synchronous sending on page unload
        navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
      } else {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }
    } catch (error) {
      console.warn('Failed to send analytics data:', error);
      // Re-add data for retry (up to a limit)
      if (payload.events.length < 1000) {
        this.events.unshift(...payload.events);
        this.metrics.unshift(...payload.metrics);
        this.errors.unshift(...payload.errors);
      }
    }
  }

  // Privacy and settings
  setAnalyticsEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.saveUserSettings();
    
    if (!enabled) {
      // Clear pending data
      this.events = [];
      this.metrics = [];
      this.errors = [];
    }
    
    this.trackEvent('analytics_settings_change', { enabled });
  }

  isAnalyticsEnabled(): boolean {
    return this.isEnabled;
  }

  setUserId(userId: string): void {
    this.userId = userId;
    this.saveUserSettings();
  }

  // Debug and development
  getSessionInfo(): object {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      isEnabled: this.isEnabled,
      pendingEvents: this.events.length,
      pendingMetrics: this.metrics.length,
      pendingErrors: this.errors.length
    };
  }

  exportAnalyticsData(): object {
    return {
      events: this.events,
      metrics: this.metrics,
      errors: this.errors,
      session: this.getSessionInfo()
    };
  }

  clearAnalyticsData(): void {
    this.events = [];
    this.metrics = [];
    this.errors = [];
    this.sessionId = this.generateSessionId();
  }

  dispose(): void {
    this.flushData(true);
  }
}

export const analytics = new AnalyticsManager();
