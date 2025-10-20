import { monitoringService } from '../services/monitoringService';
import { Request, Response, NextFunction } from 'express';

describe('MonitoringService', () => {
  beforeEach(() => {
    // Clear metrics before each test
    (monitoringService as any).metrics = [];
  });

  describe('recordMetric', () => {
    it('should record a metric with name and value', () => {
      monitoringService.recordMetric('test.metric', 100);
      
      const metrics = monitoringService.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.name).toBe('test.metric');
      expect(metrics[0]?.value).toBe(100);
      expect(metrics[0]?.timestamp).toBeInstanceOf(Date);
    });

    it('should record a metric with tags', () => {
      monitoringService.recordMetric('test.metric', 100, { 
        environment: 'test',
        service: 'api' 
      });
      
      const metrics = monitoringService.getMetrics();
      expect(metrics[0]?.tags).toEqual({
        environment: 'test',
        service: 'api'
      });
    });

    it('should limit metrics to 1000 entries', () => {
      // Record 1100 metrics
      for (let i = 0; i < 1100; i++) {
        monitoringService.recordMetric('test.metric', i);
      }
      
      const metrics = monitoringService.getMetrics();
      expect(metrics).toHaveLength(1000);
      // Should keep the latest 1000 metrics
      expect(metrics[0]?.value).toBe(100); // First metric should be value 100 (1100 - 1000)
      expect(metrics[999]?.value).toBe(1099); // Last metric should be value 1099
    });
  });

  describe('performance timing', () => {
    it('should measure operation duration', () => {
      monitoringService.startTimer('test.operation');
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait for at least 10ms
      }
      
      const duration = monitoringService.endTimer('test.operation');
      
      expect(duration).toBeGreaterThan(0);
      
      const metrics = monitoringService.getMetrics();
      const durationMetric = metrics.find(m => m.name === 'operation.duration');
      expect(durationMetric).toBeDefined();
      expect(durationMetric?.tags?.['operation']).toBe('test.operation');
    });

    it('should throw error for non-existent timer', () => {
      expect(() => {
        monitoringService.endTimer('non.existent.timer');
      }).toThrow('Timer for operation non.existent.timer not found');
    });
  });

  describe('request monitoring middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let middleware: any;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        path: '/api/test',
        route: { path: '/api/test' },
        headers: {}
      };
      
      mockRes = {
        statusCode: 200,
        setHeader: jest.fn(),
        on: jest.fn()
      };
      
      mockNext = jest.fn();
      middleware = monitoringService.requestMonitoringMiddleware();
    });

    it('should add request ID to response headers', () => {
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'x-request-id', 
        expect.any(String)
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing request ID from headers', () => {
      mockReq.headers!['x-request-id'] = 'existing-request-id';
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'x-request-id', 
        'existing-request-id'
      );
    });

    it('should record metrics on response finish', () => {
      let finishCallback: Function | undefined;
      (mockRes.on as jest.Mock).mockImplementation((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      middleware(mockReq, mockRes, mockNext);
      
      // Simulate response finish
      if (finishCallback) {
        finishCallback();
      }
      
      const metrics = monitoringService.getMetrics();
      const durationMetric = metrics.find(m => m.name === 'http.request.duration');
      const countMetric = metrics.find(m => m.name === 'http.request.count');
      
      expect(durationMetric).toBeDefined();
      expect(countMetric).toBeDefined();
      expect(durationMetric?.tags?.['method']).toBe('GET');
      expect(durationMetric?.tags?.['status_code']).toBe('200');
    });
  });

  describe('getHealthMetrics', () => {
    it('should return health metrics', () => {
      // Record some test metrics
      monitoringService.recordMetric('http.request.count', 1, { status_code: '200' });
      monitoringService.recordMetric('http.request.count', 1, { status_code: '500' });
      monitoringService.recordMetric('http.request.duration', 150);
      monitoringService.recordMetric('http.request.duration', 250);
      
      const healthMetrics = monitoringService.getHealthMetrics();
      
      expect(healthMetrics).toHaveProperty('timestamp');
      expect(healthMetrics).toHaveProperty('requestsPerMinute');
      expect(healthMetrics).toHaveProperty('averageResponseTime');
      expect(healthMetrics).toHaveProperty('errorRate');
      expect(healthMetrics).toHaveProperty('memoryUsage');
      expect(healthMetrics).toHaveProperty('uptime');
      
      expect(healthMetrics['requestsPerMinute']).toBe(2);
      expect(healthMetrics['averageResponseTime']).toBe(200); // (150 + 250) / 2
      expect(healthMetrics['errorRate']).toBe(50); // 1 error out of 2 requests
    });

    it('should handle no metrics gracefully', () => {
      const healthMetrics = monitoringService.getHealthMetrics();
      
      expect(healthMetrics['requestsPerMinute']).toBe(0);
      expect(healthMetrics['averageResponseTime']).toBe(0);
      expect(healthMetrics['errorRate']).toBe(0);
    });
  });

  describe('getMetrics with filters', () => {
    beforeEach(() => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const twoMinutesAgo = new Date(now.getTime() - 120000);
      
      // Manually set timestamps for testing
      monitoringService.recordMetric('test.metric', 1);
      (monitoringService as any).metrics[0].timestamp = twoMinutesAgo;
      
      monitoringService.recordMetric('test.metric', 2);
      (monitoringService as any).metrics[1].timestamp = oneMinuteAgo;
      
      monitoringService.recordMetric('other.metric', 3);
      (monitoringService as any).metrics[2].timestamp = now;
    });

    it('should filter metrics by name', () => {
      const metrics = monitoringService.getMetrics({ name: 'test.metric' });
      
      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.name === 'test.metric')).toBe(true);
    });

    it('should filter metrics by time', () => {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const metrics = monitoringService.getMetrics({ since: oneMinuteAgo });
      
      expect(metrics).toHaveLength(2); // Should include metrics from last minute and now
    });

    it('should filter metrics by both name and time', () => {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const metrics = monitoringService.getMetrics({ 
        name: 'test.metric', 
        since: oneMinuteAgo 
      });
      
      expect(metrics).toHaveLength(1); // Only one test.metric from last minute
      expect(metrics[0]?.value).toBe(2);
    });
  });
});