import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserRole } from '../types';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = AuthService.verifyAccessToken(token);
      
      // Verify user still exists and is active
      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User account is inactive or not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      next();
    } catch (tokenError) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired access token',
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication service error',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const authorize = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
          details: {
            requiredRoles: allowedRoles,
            userRole: req.user.role
          }
        }
      });
    }

    next();
  };
};

// Role-based authorization helpers
export const requireAdmin = authorize([UserRole.ADMIN]);
export const requireManager = authorize([UserRole.ADMIN, UserRole.MANAGER]);
export const requireSales = authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES]);
export const requireMarketing = authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETING]);
export const requireReadAccess = authorize([
  UserRole.ADMIN, 
  UserRole.MANAGER, 
  UserRole.SALES, 
  UserRole.MARKETING, 
  UserRole.READ_ONLY
]);

// Custom authorization for resource ownership
export const requireOwnershipOrRole = (allowedRoles: UserRole[], resourceUserIdField: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has required role
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    if (resourceUserId === req.user.userId) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied: insufficient permissions or not resource owner',
        timestamp: new Date().toISOString()
      }
    });
  };
};

// Rate limiting middleware (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: new Date().toISOString(),
          details: {
            limit: maxRequests,
            windowMs,
            retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
          }
        }
      });
    }
    
    clientData.count++;
    next();
  };
};

// Input validation middleware
export const validateInput = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          timestamp: new Date().toISOString(),
          details: error.details.map((detail: any) => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      });
    }
    
    next();
  };
};