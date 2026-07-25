/**
 * Performance monitoring and optimization utilities for phone call feature
 */

interface PerformanceMetric {
  metric: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 100; // Keep only last 100 metrics

/**
 * Track performance metric
 */
export const trackPerformance = (
  metric: string,
  duration: number,
  metadata?: Record<string, any>
): void => {
  performanceMetrics.push({
    metric,
    duration,
    timestamp: Date.now(),
    metadata
  });
  
  // Keep only last MAX_METRICS
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.shift();
  }
  
  // Log slow operations
  if (duration > 1000) {
    console.warn(`⚠️ Slow operation detected: ${metric} took ${duration}ms`, metadata);
  }
};

/**
 * Measure async function execution time
 */
export const measureAsync = async <T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    trackPerformance(name, duration, metadata);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    trackPerformance(name, duration, { ...metadata, error: true });
    throw error;
  }
};

/**
 * Get performance stats
 */
export const getPerformanceStats = () => {
  if (performanceMetrics.length === 0) {
    return null;
  }
  
  const durations = performanceMetrics.map(m => m.duration);
  const sum = durations.reduce((a, b) => a + b, 0);
  
  return {
    count: performanceMetrics.length,
    average: sum / performanceMetrics.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
    last10: performanceMetrics.slice(-10).map(m => ({
      metric: m.metric,
      duration: m.duration
    }))
  };
};

/**
 * Debounce function for performance
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Memory usage monitoring (if available)
 */
export const getMemoryUsage = () => {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
      jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
    };
  }
  return null;
};

/**
 * Clear old performance metrics
 */
export const clearPerformanceMetrics = (): void => {
  performanceMetrics.length = 0;
};
