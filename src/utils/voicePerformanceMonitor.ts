/**
 * Voice Performance Monitor
 * Tracks and optimizes voice processing performance
 */

interface PerformanceMetrics {
  connectionTime: number;
  transcriptionLatency: number;
  audioBufferHealth: number;
  memoryUsage: number;
  cpuLoad: number;
  networkQuality: number;
  errorRate: number;
  sessionDuration: number;
}

interface PerformanceEvent {
  type: 'connection_start' | 'connection_end' | 'transcription_start' | 'transcription_end' | 
        'audio_buffer_overflow' | 'audio_buffer_underrun' | 'memory_pressure' | 'network_issue';
  timestamp: number;
  duration?: number;
  metadata?: any;
}

interface PerformanceThresholds {
  maxConnectionTime: number;
  maxTranscriptionLatency: number;
  minAudioBufferHealth: number;
  maxMemoryUsage: number;
  maxErrorRate: number;
  networkQualityThreshold: number;
}

export class VoicePerformanceMonitor {
  private metrics: PerformanceMetrics = {
    connectionTime: 0,
    transcriptionLatency: 0,
    audioBufferHealth: 100,
    memoryUsage: 0,
    cpuLoad: 0,
    networkQuality: 100,
    errorRate: 0,
    sessionDuration: 0
  };

  private events: PerformanceEvent[] = [];
  private thresholds: PerformanceThresholds = {
    maxConnectionTime: 5000,      // 5 seconds
    maxTranscriptionLatency: 2000, // 2 seconds
    minAudioBufferHealth: 50,     // 50%
    maxMemoryUsage: 100,          // 100MB
    maxErrorRate: 10,             // 10%
    networkQualityThreshold: 70    // 70%
  };

  private subscribers: Array<(metrics: PerformanceMetrics) => void> = [];
  private startTimes: Map<string, number> = new Map();
  private sessionStartTime: number = 0;
  private errorCount: number = 0;
  private totalOperations: number = 0;

  startSession() {
    this.sessionStartTime = Date.now();
    this.errorCount = 0;
    this.totalOperations = 0;
    this.events = [];
    
    this.recordEvent({
      type: 'connection_start',
      timestamp: Date.now()
    });

    // Start periodic monitoring
    this.startPeriodicMonitoring();
  }

  endSession() {
    const sessionEnd = Date.now();
    this.metrics.sessionDuration = sessionEnd - this.sessionStartTime;
    
    this.recordEvent({
      type: 'connection_end',
      timestamp: sessionEnd,
      duration: this.metrics.sessionDuration
    });

    this.stopPeriodicMonitoring();
  }

  // Connection performance tracking
  startConnectionTimer(connectionId: string = 'main') {
    this.startTimes.set(`connection_${connectionId}`, Date.now());
  }

  endConnectionTimer(connectionId: string = 'main') {
    const startTime = this.startTimes.get(`connection_${connectionId}`);
    if (startTime) {
      this.metrics.connectionTime = Date.now() - startTime;
      this.startTimes.delete(`connection_${connectionId}`);
      
      if (this.metrics.connectionTime > this.thresholds.maxConnectionTime) {
        this.handlePerformanceIssue('slow_connection', {
          connectionTime: this.metrics.connectionTime,
          threshold: this.thresholds.maxConnectionTime
        });
      }
    }
  }

  // Transcription performance tracking
  startTranscription(transcriptionId: string) {
    this.startTimes.set(`transcription_${transcriptionId}`, Date.now());
    this.recordEvent({
      type: 'transcription_start',
      timestamp: Date.now(),
      metadata: { transcriptionId }
    });
  }

  endTranscription(transcriptionId: string, success: boolean = true) {
    const startTime = this.startTimes.get(`transcription_${transcriptionId}`);
    if (startTime) {
      const latency = Date.now() - startTime;
      this.metrics.transcriptionLatency = latency;
      this.startTimes.delete(`transcription_${transcriptionId}`);
      
      this.recordEvent({
        type: 'transcription_end',
        timestamp: Date.now(),
        duration: latency,
        metadata: { transcriptionId, success }
      });

      this.totalOperations++;
      if (!success) {
        this.errorCount++;
      }

      if (latency > this.thresholds.maxTranscriptionLatency) {
        this.handlePerformanceIssue('slow_transcription', {
          latency,
          threshold: this.thresholds.maxTranscriptionLatency
        });
      }
    }
  }

  // Audio buffer monitoring
  updateAudioBufferHealth(percentage: number) {
    this.metrics.audioBufferHealth = Math.max(0, Math.min(100, percentage));
    
    if (percentage < this.thresholds.minAudioBufferHealth) {
      this.recordEvent({
        type: 'audio_buffer_underrun',
        timestamp: Date.now(),
        metadata: { bufferHealth: percentage }
      });
      
      this.handlePerformanceIssue('audio_buffer_low', {
        bufferHealth: percentage,
        threshold: this.thresholds.minAudioBufferHealth
      });
    } else if (percentage > 95) {
      this.recordEvent({
        type: 'audio_buffer_overflow',
        timestamp: Date.now(),
        metadata: { bufferHealth: percentage }
      });
    }
  }

  // Memory monitoring
  updateMemoryUsage() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = Math.round(memInfo.usedJSHeapSize / 1024 / 1024); // MB
      
      if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
        this.recordEvent({
          type: 'memory_pressure',
          timestamp: Date.now(),
          metadata: { memoryUsage: this.metrics.memoryUsage }
        });
        
        this.handlePerformanceIssue('high_memory_usage', {
          memoryUsage: this.metrics.memoryUsage,
          threshold: this.thresholds.maxMemoryUsage
        });
      }
    }
  }

  // Network quality monitoring
  updateNetworkQuality(quality: number) {
    this.metrics.networkQuality = Math.max(0, Math.min(100, quality));
    
    if (quality < this.thresholds.networkQualityThreshold) {
      this.recordEvent({
        type: 'network_issue',
        timestamp: Date.now(),
        metadata: { networkQuality: quality }
      });
      
      this.handlePerformanceIssue('poor_network', {
        networkQuality: quality,
        threshold: this.thresholds.networkQualityThreshold
      });
    }
  }

  // Error rate calculation
  private updateErrorRate() {
    if (this.totalOperations > 0) {
      this.metrics.errorRate = (this.errorCount / this.totalOperations) * 100;
      
      if (this.metrics.errorRate > this.thresholds.maxErrorRate) {
        this.handlePerformanceIssue('high_error_rate', {
          errorRate: this.metrics.errorRate,
          threshold: this.thresholds.maxErrorRate
        });
      }
    }
  }

  private recordEvent(event: PerformanceEvent) {
    this.events.push(event);
    
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  private handlePerformanceIssue(issueType: string, data: any) {
    console.warn(`🚨 Performance Issue Detected: ${issueType}`, data);
    
    // Trigger optimization strategies
    switch (issueType) {
      case 'slow_connection':
        this.optimizeConnection();
        break;
      case 'slow_transcription':
        this.optimizeTranscription();
        break;
      case 'audio_buffer_low':
        this.optimizeAudioBuffer();
        break;
      case 'high_memory_usage':
        this.optimizeMemoryUsage();
        break;
      case 'poor_network':
        this.optimizeNetworkUsage();
        break;
      case 'high_error_rate':
        this.optimizeErrorHandling();
        break;
    }
  }

  // Optimization strategies
  private optimizeConnection() {
    console.log('🔧 Optimizing connection...');
    // Reduce connection timeout, switch to more reliable endpoint, etc.
  }

  private optimizeTranscription() {
    console.log('🔧 Optimizing transcription...');
    // Reduce audio chunk size, adjust transcription settings
  }

  private optimizeAudioBuffer() {
    console.log('🔧 Optimizing audio buffer...');
    // Increase buffer size, reduce audio quality temporarily
  }

  private optimizeMemoryUsage() {
    console.log('🔧 Optimizing memory usage...');
    // Clear old transcripts, reduce cache size
    if (typeof gc === 'function') {
      gc(); // Force garbage collection if available
    }
  }

  private optimizeNetworkUsage() {
    console.log('🔧 Optimizing network usage...');
    // Reduce audio quality, increase buffer time
  }

  private optimizeErrorHandling() {
    console.log('🔧 Optimizing error handling...');
    // Increase retry delays, reduce complexity
  }

  // Periodic monitoring
  private monitoringInterval: NodeJS.Timeout | null = null;

  private startPeriodicMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryUsage();
      this.updateErrorRate();
      this.notifySubscribers();
    }, 5000); // Every 5 seconds
  }

  private stopPeriodicMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Subscription management
  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.subscribers.push(callback);
    callback(this.metrics); // Immediate update
    
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback({ ...this.metrics }));
  }

  // Public API
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getEvents(): PerformanceEvent[] {
    return [...this.events];
  }

  getPerformanceReport() {
    const now = Date.now();
    const recentEvents = this.events.filter(e => now - e.timestamp < 60000); // Last minute
    
    return {
      metrics: this.getMetrics(),
      recentEvents,
      healthScore: this.calculateHealthScore(),
      recommendations: this.getOptimizationRecommendations()
    };
  }

  private calculateHealthScore(): number {
    let score = 100;
    
    // Deduct points based on metrics vs thresholds
    if (this.metrics.connectionTime > this.thresholds.maxConnectionTime) {
      score -= 20;
    }
    if (this.metrics.transcriptionLatency > this.thresholds.maxTranscriptionLatency) {
      score -= 15;
    }
    if (this.metrics.audioBufferHealth < this.thresholds.minAudioBufferHealth) {
      score -= 25;
    }
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      score -= 10;
    }
    if (this.metrics.networkQuality < this.thresholds.networkQualityThreshold) {
      score -= 20;
    }
    if (this.metrics.errorRate > this.thresholds.maxErrorRate) {
      score -= 30;
    }

    return Math.max(0, score);
  }

  private getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.connectionTime > this.thresholds.maxConnectionTime) {
      recommendations.push('Consider checking network connectivity for faster connection times');
    }
    if (this.metrics.transcriptionLatency > this.thresholds.maxTranscriptionLatency) {
      recommendations.push('Transcription is slower than expected - reduce audio chunk size');
    }
    if (this.metrics.audioBufferHealth < this.thresholds.minAudioBufferHealth) {
      recommendations.push('Audio buffer is running low - increase buffer size or check microphone');
    }
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      recommendations.push('High memory usage detected - clear old conversation data');
    }
    if (this.metrics.networkQuality < this.thresholds.networkQualityThreshold) {
      recommendations.push('Poor network quality - consider reducing audio quality');
    }
    if (this.metrics.errorRate > this.thresholds.maxErrorRate) {
      recommendations.push('High error rate detected - check system resources');
    }
    
    return recommendations;
  }

  clear() {
    this.metrics = {
      connectionTime: 0,
      transcriptionLatency: 0,
      audioBufferHealth: 100,
      memoryUsage: 0,
      cpuLoad: 0,
      networkQuality: 100,
      errorRate: 0,
      sessionDuration: 0
    };
    this.events = [];
    this.startTimes.clear();
    this.errorCount = 0;
    this.totalOperations = 0;
  }
}

export const voicePerformanceMonitor = new VoicePerformanceMonitor();
