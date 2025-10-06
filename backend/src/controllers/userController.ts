import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { UserRole } from '../types';
import Joi from 'joi';

export class UserController {
  static async getAllUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { role, isActive, page = 1, limit = 10 } = req.query;

      let query = User.query;

      // Apply filters
      if (role) {
        query = query.where('role', role as UserRole);
      }

      if (isActive !== undefined) {
        query = query.where('is_active', isActive === 'true');
      }

      // Apply pagination
      const offset = (Number(page) - 1) * Number(limit);
      const users = await query.offset(offset).limit(Number(limit)).orderBy('created_at', 'desc');

      // Get total count for pagination
      const totalQuery = User.query;
      if (role) totalQuery.where('role', role as UserRole);
      if (isActive !== undefined) totalQuery.where('is_active', isActive === 'true');
      const totalCount = await totalQuery.count('* as count').first();

      const transformedUsers = users.map(user => User.transformToUserType(user));

      res.status(200).json({
        success: true,
        data: {
          users: transformedUsers,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: Number(totalCount?.['count'] || 0),
            totalPages: Math.ceil(Number(totalCount?.['count'] || 0) / Number(limit))
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get all users error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve users',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async getUserById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.status(200).json({
        success: true,
        data: { user: User.transformToUserType(user) },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userData = req.body;

      // Validate input
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        firstName: Joi.string().min(1).max(50).required(),
        lastName: Joi.string().min(1).max(50).required(),
        role: Joi.string().valid(...Object.values(UserRole)).required(),
        isActive: Joi.boolean().default(true),
        profile: Joi.object({
          phone: Joi.string().optional(),
          department: Joi.string().optional(),
          territory: Joi.string().optional(),
          workingHours: Joi.object().optional()
        }).optional()
      });

      const { error } = schema.validate(userData);
      if (error) {
        return res.status(400).json({
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
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = await User.createUser(userData);

      res.status(201).json({
        success: true,
        data: { user: User.transformToUserType(user) },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Create user error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'User creation failed';
      const statusCode = errorMessage.includes('Password must') ? 400 : 500;

      res.status(statusCode).json({
        error: {
          code: statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if user exists
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate input
      const schema = Joi.object({
        email: Joi.string().email().optional(),
        firstName: Joi.string().min(1).max(50).optional(),
        lastName: Joi.string().min(1).max(50).optional(),
        role: Joi.string().valid(...Object.values(UserRole)).optional(),
        isActive: Joi.boolean().optional(),
        profile: Joi.object({
          phone: Joi.string().optional(),
          department: Joi.string().optional(),
          territory: Joi.string().optional(),
          workingHours: Joi.object().optional()
        }).optional()
      });

      const { error } = schema.validate(updateData);
      if (error) {
        return res.status(400).json({
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
      }

      // Check if email is being changed and if it already exists
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await User.findByEmail(updateData.email);
        if (emailExists) {
          return res.status(409).json({
            error: {
              code: 'EMAIL_EXISTS',
              message: 'User with this email already exists',
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      const updatedUser = await User.updateUser(id, updateData);

      res.status(200).json({
        success: true,
        data: { user: User.transformToUserType(updatedUser) },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Update user error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if user exists
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Prevent self-deletion
      if (req.user && req.user.userId === id) {
        return res.status(400).json({
          error: {
            code: 'SELF_DELETE_FORBIDDEN',
            message: 'Cannot delete your own account',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Soft delete by deactivating the user
      await User.updateUser(id, { isActive: false });

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Delete user error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async activateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if user exists
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Activate the user
      const updatedUser = await User.updateUser(id, { isActive: true });

      res.status(200).json({
        success: true,
        data: { user: User.transformToUserType(updatedUser) },
        message: 'User activated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Activate user error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to activate user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async getUsersByRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { role } = req.params;

      // Validate role
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid user role',
            timestamp: new Date().toISOString()
          }
        });
      }

      const users = await User.findByRole(role as UserRole);
      const transformedUsers = users.map(user => User.transformToUserType(user));

      res.status(200).json({
        success: true,
        data: { users: transformedUsers },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get users by role error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve users by role',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}