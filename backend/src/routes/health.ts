import { Router, Request, Response } from 'express';
import { healthCheckService } from '../services/healthCheckService';
import { loggingService } from '../services/loggingService';

const router = Router();

// Full health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthResult = await healthCheckService.performHealthCheck();
    
    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthResult);
  } catch (error) {
    loggingService.error('Health check endpoint failed', error as Error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date(),
      message: 'Health check failed'
    });
  }
});

// Kubernetes readiness probe
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const readinessResult = await healthCheckService.performReadinessCheck();
    
    if (readinessResult.ready) {
      res.status(200).json(readinessResult);
    } else {
      res.status(503).json(readinessResult);
    }
  } catch (error) {
    loggingService.error('Readiness check failed', error as Error);
    res.status(503).json({
      ready: false,
      message: 'Readiness check failed'
    });
  }
});

// Kubernetes liveness probe
router.get('/health/live', async (req: Request, res: Response) => {
  try {
    const livenessResult = await healthCheckService.performLivenessCheck();
    
    if (livenessResult.alive) {
      res.status(200).json(livenessResult);
    } else {
      res.status(503).json(livenessResult);
    }
  } catch (error) {
    loggingService.error('Liveness check failed', error as Error);
    res.status(503).json({
      alive: false,
      message: 'Liveness check failed'
    });
  }
});

// Simple ping endpoint
router.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'pong',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Metrics endpoint (for Prometheus scraping)
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const healthResult = await healthCheckService.performHealthCheck();
    
    // Convert to Prometheus format
    const prometheusMetrics = [
      `# HELP app_health_status Application health status (1=healthy, 0=unhealthy)`,
      `# TYPE app_health_status gauge`,
      `app_health_status{service="lead-management-system"} ${healthResult.status === 'healthy' ? 1 : 0}`,
      '',
      `# HELP app_uptime_seconds Application uptime in seconds`,
      `# TYPE app_uptime_seconds counter`,
      `app_uptime_seconds{service="lead-management-system"} ${healthResult.uptime}`,
      '',
      `# HELP app_memory_usage_bytes Memory usage in bytes`,
      `# TYPE app_memory_usage_bytes gauge`,
      `app_memory_usage_bytes{type="rss",service="lead-management-system"} ${healthResult.metrics?.memoryUsage.rss || 0}`,
      `app_memory_usage_bytes{type="heapTotal",service="lead-management-system"} ${healthResult.metrics?.memoryUsage.heapTotal || 0}`,
      `app_memory_usage_bytes{type="heapUsed",service="lead-management-system"} ${healthResult.metrics?.memoryUsage.heapUsed || 0}`,
      '',
      `# HELP app_requests_per_minute Requests per minute`,
      `# TYPE app_requests_per_minute gauge`,
      `app_requests_per_minute{service="lead-management-system"} ${healthResult.metrics?.requestsPerMinute || 0}`,
      '',
      `# HELP app_response_time_ms Average response time in milliseconds`,
      `# TYPE app_response_time_ms gauge`,
      `app_response_time_ms{service="lead-management-system"} ${healthResult.metrics?.averageResponseTime || 0}`,
      '',
      `# HELP app_error_rate_percent Error rate percentage`,
      `# TYPE app_error_rate_percent gauge`,
      `app_error_rate_percent{service="lead-management-system"} ${healthResult.metrics?.errorRate || 0}`,
      ''
    ].join('\n');
    
    res.set('Content-Type', 'text/plain');
    res.status(200).send(prometheusMetrics);
  } catch (error) {
    loggingService.error('Metrics endpoint failed', error as Error);
    res.status(500).send('# Metrics collection failed\n');
  }
});

export default router;