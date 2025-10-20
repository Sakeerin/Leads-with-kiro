import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import apiRoutes from './routes';
import healthRoutes from './routes/health';
import { errorHandler } from './utils/errors';
import { SearchService } from './services/searchService';
import { generalRateLimit } from './middleware/rateLimiting';
import { AuditService } from './services/auditService';
import { monitoringService } from './services/monitoringService';
import { loggingService, requestLoggingMiddleware, errorLoggingMiddleware } from './services/loggingService';
import { healthCheckService } from './services/healthCheckService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3001;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lead Management System API',
      version: '1.0.0',
      description: 'API for Lead Management System with authentication and user management',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(swaggerOptions);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
app.use(generalRateLimit);

// Monitoring and logging middleware
app.use(monitoringService.requestMonitoringMiddleware());
app.use(requestLoggingMiddleware);

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, _res, buf) => {
    // Log potential security issues
    if (buf.length > 10 * 1024 * 1024) { // 10MB
      AuditService.logSecurityEvent('suspicious_activity', req as any, 'high', {
        payloadSize: buf.length,
        reason: 'Large payload detected'
      }).catch(console.error);
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check and monitoring routes
app.use('/', healthRoutes);

// API routes
app.use('/api/v1', apiRoutes);

// Error handling middleware
app.use(errorLoggingMiddleware);
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl
    }
  });
});

app.listen(PORT, async () => {
  loggingService.info('Server starting up', { port: PORT });
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`📋 API docs: http://localhost:${PORT}/api-docs`);
  
  // Initialize monitoring
  monitoringService.recordMetric('server.startup', 1, { port: PORT.toString() });
  
  // Initialize Elasticsearch
  try {
    SearchService.initialize();
    
    // Wait a bit for Elasticsearch to be ready, then create indices
    setTimeout(async () => {
      try {
        await SearchService.createIndices();
        loggingService.info('Elasticsearch indices created successfully');
        monitoringService.recordMetric('elasticsearch.initialization', 1, { status: 'success' });
      } catch (error) {
        loggingService.error('Failed to create Elasticsearch indices', error as Error);
        monitoringService.recordMetric('elasticsearch.initialization', 0, { status: 'failed' });
      }
    }, 5000);
  } catch (error) {
    loggingService.error('Failed to initialize Elasticsearch', error as Error);
    monitoringService.recordMetric('elasticsearch.initialization', 0, { status: 'failed' });
  }
  
  loggingService.info('Server startup completed', { port: PORT });
});

export default app;