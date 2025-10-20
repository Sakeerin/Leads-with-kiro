import winston from 'winston';
import { Request } from 'express';

export interface LogContext {
  requestId?: string;
  userId?: string;
  leadId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  version: string;
  environment: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class LoggingService {
  private logger: winston.Logger;
  private serviceName: string;
  private version: string;
  private environment: string;

  constructor() {
    this.serviceName = 'lead-management-system';
    this.version = process.env.APP_VERSION || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(this.formatLog.bind(this))
      ),
      defaultMeta: {
        service: this.serviceName,
        version: this.version,
        environment: this.environment
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // File transport for all logs
        new winston.transports.File({
          filename: 'logs/app.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        
        // Separate file for errors
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760,
          maxFiles: 5
        })
      ]
    });

    // Add production transports
    if (this.environment === 'production') {
      // In production, you might add:
      // - Elasticsearch transport
      // - CloudWatch transport
      // - Datadog transport
      // - etc.
    }
  }

  private formatLog(info: any): string {
    const logEntry: StructuredLogEntry = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      service: info.service,
      version: info.version,
      environment: info.environment,
      context: info.context,
      error: info.error ? {
        name: info.error.name,
        message: info.error.message,
        stack: info.error.stack
      } : undefined
    };

    return JSON.stringify(logEntry);
  }

  // Core logging methods
  info(message: string, context?: LogContext): void {
    this.logger.info(message, { context });
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, { context });
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, { 
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      context 
    });
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, { context });
  }

  // Business operation logging
  logLeadOperation(operation: string, leadId: string, context?: LogContext): void {
    this.info(`Lead operation: ${operation}`, {
      operation,
      leadId,
      ...context
    });
  }

  logUserAction(action: string, userId: string, context?: LogContext): void {
    this.info(`User action: ${action}`, {
      action,
      userId,
      ...context
    });
  }

  logSystemEvent(event: string, context?: LogContext): void {
    this.info(`System event: ${event}`, {
      event,
      ...context
    });
  }

  // Security logging
  logSecurityEvent(event: string, context?: LogContext): void {
    this.warn(`Security event: ${event}`, {
      event,
      security: true,
      ...context
    });
  }

  logAuthenticationAttempt(success: boolean, userId?: string, context?: LogContext): void {
    const message = success ? 'Authentication successful' : 'Authentication failed';
    const method = success ? this.info : this.warn;
    
    method.call(this, message, {
      authentication: true,
      success,
      userId,
      ...context
    });
  }

  // Performance logging
  logPerformance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 5000 ? 'warn' : 'info';
    const message = `Performance: ${operation} took ${duration}ms`;
    
    this.logger.log(level, message, {
      performance: true,
      operation,
      duration,
      context
    });
  }

  // Request logging middleware helper
  createRequestContext(req: Request): LogContext {
    return {
      requestId: req.headers['x-request-id'] as string,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: (req as any).user?.id
    };
  }

  // Audit logging
  logAuditEvent(event: string, entityType: string, entityId: string, 
                changes?: Record<string, any>, context?: LogContext): void {
    this.info(`Audit: ${event}`, {
      audit: true,
      event,
      entityType,
      entityId,
      changes,
      ...context
    });
  }

  // Error boundary logging
  logUnhandledError(error: Error, context?: LogContext): void {
    this.error('Unhandled error occurred', error, {
      unhandled: true,
      ...context
    });
  }

  // Health check logging
  logHealthCheck(status: 'healthy' | 'unhealthy', checks: Record<string, boolean>): void {
    const method = status === 'healthy' ? this.info : this.error;
    method.call(this, `Health check: ${status}`, {
      healthCheck: true,
      status,
      checks
    });
  }
}

// Create singleton instance
export const loggingService = new LoggingService();

// Express middleware for request logging
export const requestLoggingMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const context = loggingService.createRequestContext(req);
  
  // Log incoming request
  loggingService.info('Incoming request', context);
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    loggingService.info('Request completed', {
      ...context,
      statusCode: res.statusCode,
      duration
    });
    
    // Log performance if slow
    if (duration > 1000) {
      loggingService.logPerformance(`${req.method} ${req.url}`, duration, context);
    }
  });
  
  next();
};

// Global error handler
export const errorLoggingMiddleware = (error: Error, req: any, res: any, next: any) => {
  const context = loggingService.createRequestContext(req);
  loggingService.error('Request error', error, context);
  next(error);
};

export default LoggingService;