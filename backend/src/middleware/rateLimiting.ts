import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response } from 'express';
import { AppError } from '../utils/errors';

// Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

/**
 * Rate limiting configurations for different endpoints
 */

// General API rate limit
export const generalRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: 15 * 60
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  }
});

// Authentication endpoints rate limit (stricter)
export const authRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: 15 * 60
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req: Request) => {
    return `auth:${req.ip}:${req.body?.email || 'unknown'}`;
  }
});

// Password reset rate limit
export const passwordResetRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    error: {
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts, please try again later.',
      retryAfter: 60 * 60
    }
  },
  keyGenerator: (req: Request) => {
    return `password-reset:${req.ip}:${req.body?.email || 'unknown'}`;
  }
});

// File upload rate limit
export const fileUploadRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each user to 10 file uploads per minute
  message: {
    error: {
      code: 'FILE_UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads, please try again later.',
      retryAfter: 60
    }
  },
  keyGenerator: (req: Request) => {
    return `file-upload:${req.user?.id || req.ip}`;
  }
});

// Search rate limit
export const searchRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each user to 60 searches per minute
  message: {
    error: {
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests, please try again later.',
      retryAfter: 60
    }
  },
  keyGenerator: (req: Request) => {
    return `search:${req.user?.id || req.ip}`;
  }
});

// Export rate limit
export const exportRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each user to 5 exports per hour
  message: {
    error: {
      code: 'EXPORT_RATE_LIMIT_EXCEEDED',
      message: 'Too many export requests, please try again later.',
      retryAfter: 60 * 60
    }
  },
  keyGenerator: (req: Request) => {
    return `export:${req.user?.id || req.ip}`;
  }
});

// Import rate limit
export const importRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each user to 3 imports per hour
  message: {
    error: {
      code: 'IMPORT_RATE_LIMIT_EXCEEDED',
      message: 'Too many import requests, please try again later.',
      retryAfter: 60 * 60
    }
  },
  keyGenerator: (req: Request) => {
    return `import:${req.user?.id || req.ip}`;
  }
});

/**
 * Custom rate limiter for specific business logic
 */
export class CustomRateLimiter {
  private redis: Redis;
  
  constructor() {
    this.redis = redis;
  }
  
  /**
   * Check if action is allowed for user
   */
  async isAllowed(
    key: string,
    limit: number,
    windowMs: number,
    identifier: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const fullKey = `rate_limit:${key}:${identifier}`;
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const windowKey = `${fullKey}:${window}`;
    
    const current = await this.redis.incr(windowKey);
    
    if (current === 1) {
      await this.redis.expire(windowKey, Math.ceil(windowMs / 1000));
    }
    
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);
    const resetTime = (window + 1) * windowMs;
    
    return { allowed, remaining, resetTime };
  }
  
  /**
   * Rate limit middleware factory
   */
  createMiddleware(
    key: string,
    limit: number,
    windowMs: number,
    getMessage?: (remaining: number, resetTime: number) => string
  ) {
    return async (req: Request, res: Response, next: Function) => {
      const identifier = req.user?.id || req.ip;
      const result = await this.isAllowed(key, limit, windowMs, identifier);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });
      
      if (!result.allowed) {
        const message = getMessage 
          ? getMessage(result.remaining, result.resetTime)
          : `Rate limit exceeded. Try again after ${new Date(result.resetTime).toISOString()}`;
        
        throw new AppError(message, 429, 'RATE_LIMIT_EXCEEDED', {
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
      }
      
      next();
    };
  }
}

export const customRateLimiter = new CustomRateLimiter();