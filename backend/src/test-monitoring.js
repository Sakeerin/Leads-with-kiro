// Simple test script for monitoring functionality
const { monitoringService } = require('./services/monitoringService');
const { loggingService } = require('./services/loggingService');
const { healthCheckService } = require('./services/healthCheckService');

console.log('Testing monitoring services...');

// Test monitoring service
console.log('\n1. Testing MonitoringService:');
monitoringService.recordMetric('test.metric', 100, { environment: 'test' });
monitoringService.recordMetric('test.metric', 200, { environment: 'test' });

const metrics = monitoringService.getMetrics();
console.log(`Recorded ${metrics.length} metrics`);
console.log('Latest metric:', metrics[metrics.length - 1]);

const healthMetrics = monitoringService.getHealthMetrics();
console.log('Health metrics:', healthMetrics);

// Test logging service
console.log('\n2. Testing LoggingService:');
loggingService.info('Test info message', { test: true });
loggingService.warn('Test warning message', { test: true });
loggingService.error('Test error message', new Error('Test error'), { test: true });

// Test health check service
console.log('\n3. Testing HealthCheckService:');
healthCheckService.performLivenessCheck()
  .then(result => {
    console.log('Liveness check:', result);
  })
  .catch(error => {
    console.error('Liveness check failed:', error);
  });

console.log('\nMonitoring services test completed!');