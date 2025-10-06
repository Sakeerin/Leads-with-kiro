import { Request, Response } from 'express';
import { AuthService, LoginRequest, RegisterRequest } from '../services/authService';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import Joi from 'joi';
import { UserRole } from '../types';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      // Validate input
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
      });

      const { error } = schema.validate({ email, password });
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            timestamp: new Date().toISOString(),
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const result = await AuthService.login({ email, password });

      res.status(200).json({
        success: true,
        data: {
          user: User.transformToUserType(result.user),
          tokens: result.tokens
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      const statusCode = errorMessage.includes('Invalid email or password') || 
                        errorMessage.includes('Account is deactivated') ? 401 : 500;

      res.status(statusCode).json({
        error: {
          code: statusCode === 401 ? 'AUTHENTICATION_FAILED' : 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const registerData: RegisterRequest = req.body;

      // Validate input
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        firstName: Joi.string().min(1).max(50).required(),
        lastName: Joi.string().min(1).max(50).required(),
        role: Joi.string().valid(...Object.values(UserRole)).required(),
        profile: Joi.object({
          phone: Joi.string().optional(),
          department: Joi.string().optional(),
          territory: Joi.string().optional()
        }).optional()
      });

      const { error } = schema.validate(registerData);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            timestamp: new Date().toISOString(),
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const result = await AuthService.register(registerData);

      res.status(201).json({
        success: true,
        data: {
          user: User.transformToUserType(result.user),
          tokens: result.tokens
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      const statusCode = errorMessage.includes('already exists') ? 409 : 
                        errorMessage.includes('Password must') ? 400 : 500;

      res.status(statusCode).json({
        error: {
          code: statusCode === 409 ? 'USER_EXISTS' : 
                statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const tokens = await AuthService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        data: { tokens },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      
      res.status(401).json({
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await AuthService.logout(req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user: User.transformToUserType(user) },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get profile error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve profile',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Validate input
      const schema = Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(8).required()
      });

      const { error } = schema.validate({ currentPassword, newPassword });
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            timestamp: new Date().toISOString(),
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      await AuthService.changePassword(req.user.userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Change password error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      const statusCode = errorMessage.includes('Current password is incorrect') ? 400 :
                        errorMessage.includes('Password must') ? 400 : 500;

      res.status(statusCode).json({
        error: {
          code: statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}