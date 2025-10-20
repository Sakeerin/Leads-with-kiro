import { healthCheckService } from '../services/healthCheckService';

describe('HealthCheckService', () => {
  let mockDbPool: any;
  let mockRedisClient: any;

  beforeEach(() => {
    // Mock database pool
    mockDbPool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn()
    };

    // Mock Redis client
    mockRedisClient = {
      ping: jest.fn()
    };

    // Mock client release
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ health_check: 1 }] }),
      release: jest.fn()
    };
    mockDbPool.connect.mockResolvedValue(mockClient);

    healthCheckService.setDatabasePool(mockDbPool);
    healthCheckService.setRedisClient(mockRedisClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthCheckService.performHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.redis.status).toBe('healthy');
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should return unhealthy status when database is down', async () => {
      mockDbPool.connect.mockRejectedValue(new Error('Connection failed'));
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthCheckService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('unhealthy');
      expect(result.checks.redis.status).toBe('healthy');
    });

    it('should return unhealthy status when Redis is down', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Redis connection failed'));

      const result = await healthCheckService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.redis.status).toBe('unhealthy');
    });

    it('should return degraded status when response times are slow', async () => {
      // Simulate slow database response
      const mockClient = {
        query: jest.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ rows: [{ health_check: 1 }] }), 1500)
          )
        ),
        release: jest.fn()
      };
      mockDbPool.connect.mockResolvedValue(mockClient as any);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthCheckService.performHealthCheck();

      expect(result.checks.database.status).toBe('degraded');
      expect(result.checks.database.responseTime).toBeGreaterThan(1000);
    });
  });

  describe('performReadinessCheck', () => {
    it('should return ready when core services are available', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthCheckService.performReadinessCheck();

      expect(result.ready).toBe(true);
      expect(result.message).toBe('Service is ready');
    });

    it('should return not ready when database is unavailable', async () => {
      mockDbPool.connect.mockRejectedValue(new Error('Connection failed'));
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthCheckService.performReadinessCheck();

      expect(result.ready).toBe(false);
      expect(result.message).toBe('Service is not ready');
    });
  });

  describe('performLivenessCheck', () => {
    it('should return alive when memory usage is normal', async () => {
      // Mock process.memoryUsage to return normal values
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024, // 100MB
        heapTotal: 50 * 1024 * 1024, // 50MB
        heapUsed: 30 * 1024 * 1024, // 30MB
        external: 10 * 1024 * 1024, // 10MB
        arrayBuffers: 5 * 1024 * 1024 // 5MB
      });

      const result = await healthCheckService.performLivenessCheck();

      expect(result.alive).toBe(true);
      expect(result.message).toBe('Service is alive');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should return not alive when memory usage is too high', async () => {
      // Mock process.memoryUsage to return high values
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        rss: 2 * 1024 * 1024 * 1024, // 2GB
        heapTotal: 1.5 * 1024 * 1024 * 1024, // 1.5GB
        heapUsed: 1.2 * 1024 * 1024 * 1024, // 1.2GB (exceeds 1GB limit)
        external: 100 * 1024 * 1024, // 100MB
        arrayBuffers: 50 * 1024 * 1024 // 50MB
      });

      const result = await healthCheckService.performLivenessCheck();

      expect(result.alive).toBe(false);
      expect(result.message).toBe('Service memory usage too high');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });
});