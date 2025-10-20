import { Pool } from 'pg';
import Redis from 'ioredis';
import { loggingService } from './loggingService';
import { monitoringService } from './monitoringService';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    elasticsearch?: HealthCheck;
    fileStorage?: HealthCheck;
    externalServices?: HealthCheck;
  };
  metrics?: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
}

class HealthCheckService {
  private dbPool?: Pool;
  private redisClient?: Redis;
  private version: string;

  constructor() {
    this.version = process.env.APP_VERSION || '1.0.0';
  }

  setDatabasePool(pool: Pool): void {
    this.dbPool = pool;
  }

  setRedisClient(client: Redis): void {
    this.redisClient = client;
  }

  // Main health check endpoint
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const [
        databaseCheck,
        redisCheck,
        elasticsearchCheck,
        fileStorageCheck,
        externalServicesCheck
      ] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkElasticsearch(),
        this.checkFileStorage(),
        this.checkExternalServices()
      ]);

      const checks = {
        database: this.getCheckResult(databaseCheck),
        redis: this.getCheckResult(redisCheck),
        elasticsearch: this.getCheckResult(elasticsearchCheck),
        fileStorage: this.getCheckResult(fileStorageCheck),
        externalServices: this.getCheckResult(externalServicesCheck)
      };

      const overallStatus = this.determineOverallStatus(checks);
      const metrics = monitoringService.getHealthMetrics();

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date(),
        version: this.version,
        uptime: process.uptime(),
        checks,
        metrics: {
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          requestsPerMinute: metrics.requestsPerMinute,
          averageResponseTime: metrics.averageResponseTime,
          errorRate: metrics.errorRate
        }
      };

      // Log health check result
      loggingService.logHealthCheck(overallStatus, {
        database: checks.database.status === 'healthy',
        redis: checks.redis.status === 'healthy',
        elasticsearch: checks.elasticsearch?.status === 'healthy',
        fileStorage: checks.fileStorage?.status === 'healthy',
        externalServices: checks.externalServices?.status === 'healthy'
      });

      // Record metrics
      monitoringService.recordMetric('health_check.duration', Date.now() - startTime);
      monitoringService.recordMetric('health_check.status', overallStatus === 'healthy' ? 1 : 0);

      return result;
    } catch (error) {
      loggingService.error('Health check failed', error as Error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        version: this.version,
        uptime: process.uptime(),
        checks: {
          database: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          redis: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' }
        }
      };
    }
  }

  // Database health check
  private async checkDatabase(): Promise<HealthCheck> {
    if (!this.dbPool) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        message: 'Database pool not initialized'
      };
    }

    const startTime = Date.now();
    
    try {
      const client = await this.dbPool.connect();
      const result = await client.query('SELECT 1 as health_check');
      client.release();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          query: 'SELECT 1',
          result: result.rows[0]
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: (error as Error).message
      };
    }
  }

  // Redis health check
  private async checkRedis(): Promise<HealthCheck> {
    if (!this.redisClient) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        message: 'Redis client not initialized'
      };
    }

    const startTime = Date.now();
    
    try {
      const result = await this.redisClient.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: result === 'PONG' && responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          ping: result
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: (error as Error).message
      };
    }
  }

  // Elasticsearch health check
  private async checkElasticsearch(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, you would check Elasticsearch cluster health
      // For now, we'll simulate a basic check
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Elasticsearch check not implemented'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: (error as Error).message
      };
    }
  }

  // File storage health check
  private async checkFileStorage(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, you would check S3 or file system
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'File storage check not implemented'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: (error as Error).message
      };
    }
  }

  // External services health check
  private async checkExternalServices(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Check email service, calendar APIs, etc.
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'External services check not implemented'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: (error as Error).message
      };
    }
  }

  // Readiness check (for Kubernetes)
  async performReadinessCheck(): Promise<{ ready: boolean; message?: string }> {
    try {
      const dbCheck = await this.checkDatabase();
      const redisCheck = await this.checkRedis();
      
      const ready = dbCheck.status !== 'unhealthy' && redisCheck.status !== 'unhealthy';
      
      return {
        ready,
        message: ready ? 'Service is ready' : 'Service is not ready'
      };
    } catch (error) {
      return {
        ready: false,
        message: (error as Error).message
      };
    }
  }

  // Liveness check (for Kubernetes)
  async performLivenessCheck(): Promise<{ alive: boolean; message?: string }> {
    try {
      // Basic check to ensure the process is responsive
      const memoryUsage = process.memoryUsage();
      const maxMemory = 1024 * 1024 * 1024; // 1GB limit
      
      const alive = memoryUsage.heapUsed < maxMemory;
      
      return {
        alive,
        message: alive ? 'Service is alive' : 'Service memory usage too high'
      };
    } catch (error) {
      return {
        alive: false,
        message: (error as Error).message
      };
    }
  }

  // Helper methods
  private getCheckResult(settledResult: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    } else {
      return {
        status: 'unhealthy',
        responseTime: 0,
        message: settledResult.reason?.message || 'Check failed'
      };
    }
  }

  private determineOverallStatus(checks: Record<string, HealthCheck | undefined>): 'healthy' | 'unhealthy' | 'degraded' {
    const checkValues = Object.values(checks).filter(Boolean) as HealthCheck[];
    
    if (checkValues.some(check => check.status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    if (checkValues.some(check => check.status === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

export const healthCheckService = new HealthCheckService();
export default HealthCheckService;