import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  enabled: boolean;
  notificationChannels: string[];
}

class MonitoringService {
  private metrics: MetricData[] = [];
  private alertRules: AlertRule[] = [];
  private performanceTimers: Map<string, number> = new Map();

  // Record custom metrics
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: new Date(),
      tags
    };
    
    this.metrics.push(metric);
    this.checkAlerts(metric);
    
    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  // Start performance timer
  startTimer(operation: string): void {
    this.performanceTimers.set(operation, performance.now());
  }

  // End performance timer and record metric
  endTimer(operation: string, tags?: Record<string, string>): number {
    const startTime = this.performanceTimers.get(operation);
    if (!startTime) {
      throw new Error(`Timer for operation ${operation} not found`);
    }
    
    const duration = performance.now() - startTime;
    this.performanceTimers.delete(operation);
    
    this.recordMetric(`operation.duration`, duration, { 
      operation, 
      ...tags 
    });
    
    return duration;
  }

  // Express middleware for automatic request monitoring
  requestMonitoringMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      const requestId = req.headers['x-request-id'] as string || 
                       Math.random().toString(36).substring(7);
      
      // Add request ID to response headers
      res.setHeader('x-request-id', requestId);
      
      // Monitor response
      res.on('finish', () => {
        const duration = performance.now() - startTime;
        
        this.recordMetric('http.request.duration', duration, {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString(),
          request_id: requestId
        });
        
        this.recordMetric('http.request.count', 1, {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString()
        });
      });
      
      next();
    };
  }

  // Add alert rule
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  // Check if metric triggers any alerts
  private checkAlerts(metric: MetricData): void {
    const matchingRules = this.alertRules.filter(rule => 
      rule.enabled && rule.metric === metric.name
    );
    
    for (const rule of matchingRules) {
      let triggered = false;
      
      switch (rule.operator) {
        case 'gt':
          triggered = metric.value > rule.threshold;
          break;
        case 'lt':
          triggered = metric.value < rule.threshold;
          break;
        case 'eq':
          triggered = metric.value === rule.threshold;
          break;
      }
      
      if (triggered) {
        this.triggerAlert(rule, metric);
      }
    }
  }

  // Trigger alert notification
  private triggerAlert(rule: AlertRule, metric: MetricData): void {
    const alertData = {
      rule: rule.name,
      metric: metric.name,
      value: metric.value,
      threshold: rule.threshold,
      timestamp: metric.timestamp,
      tags: metric.tags
    };
    
    console.error('ALERT TRIGGERED:', alertData);
    
    // In production, this would send to notification channels
    // (Slack, email, PagerDuty, etc.)
  }

  // Get metrics for dashboard
  getMetrics(filter?: { name?: string; since?: Date }): MetricData[] {
    let filtered = this.metrics;
    
    if (filter?.name) {
      filtered = filtered.filter(m => m.name === filter.name);
    }
    
    if (filter?.since) {
      filtered = filtered.filter(m => m.timestamp >= filter.since!);
    }
    
    return filtered;
  }

  // Get system health metrics
  getHealthMetrics(): Record<string, any> {
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60000);
    
    const recentMetrics = this.getMetrics({ since: oneMinuteAgo });
    
    const requestCount = recentMetrics
      .filter(m => m.name === 'http.request.count')
      .reduce((sum, m) => sum + m.value, 0);
    
    const avgResponseTime = recentMetrics
      .filter(m => m.name === 'http.request.duration')
      .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0);
    
    const errorCount = recentMetrics
      .filter(m => m.name === 'http.request.count' && 
                   m.tags?.status_code?.startsWith('5'))
      .reduce((sum, m) => sum + m.value, 0);
    
    return {
      timestamp: new Date(),
      requestsPerMinute: requestCount,
      averageResponseTime: avgResponseTime || 0,
      errorRate: requestCount > 0 ? (errorCount / requestCount) * 100 : 0,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

export const monitoringService = new MonitoringService();

// Default alert rules
monitoringService.addAlertRule({
  id: 'high_response_time',
  name: 'High Response Time',
  metric: 'http.request.duration',
  threshold: 5000, // 5 seconds
  operator: 'gt',
  enabled: true,
  notificationChannels: ['console']
});

monitoringService.addAlertRule({
  id: 'high_error_rate',
  name: 'High Error Rate',
  metric: 'http.request.count',
  threshold: 10, // 10 errors per minute
  operator: 'gt',
  enabled: true,
  notificationChannels: ['console']
});

export default MonitoringService;