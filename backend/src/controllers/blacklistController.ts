import { Request, Response } from 'express';
import { BlacklistService } from '../services/blacklistService';
import { BlacklistType, BlacklistReason } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';

export class BlacklistController {
  /**
   * Add item to blacklist
   */
  static async addToBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { type, value, reason, notes } = req.body;
      const addedBy = req.user?.id;

      if (!type || !value || !reason) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Type, value, and reason are required'
          }
        });
        return;
      }

      if (!Object.values(BlacklistType).includes(type)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid blacklist type. Must be one of: ${Object.values(BlacklistType).join(', ')}`
          }
        });
        return;
      }

      if (!Object.values(BlacklistReason).includes(reason)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid reason. Must be one of: ${Object.values(BlacklistReason).join(', ')}`
          }
        });
        return;
      }

      if (!addedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const blacklistItem = await BlacklistService.addToBlacklist({
        type,
        value,
        reason,
        notes,
        addedBy
      });

      res.status(201).json(blacklistItem);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
        return;
      }

      console.error('Error adding to blacklist:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add item to blacklist'
        }
      });
    }
  }

  /**
   * Remove item from blacklist
   */
  static async removeFromBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const removedBy = req.user?.id;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Blacklist item ID is required'
          }
        });
        return;
      }

      if (!removedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const removedItem = await BlacklistService.removeFromBlacklist(id, removedBy);

      res.json(removedItem);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
        return;
      }

      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
        return;
      }

      console.error('Error removing from blacklist:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove item from blacklist'
        }
      });
    }
  }

  /**
   * Search blacklist items
   */
  static async searchBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const {
        type,
        reason,
        searchTerm,
        addedBy,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = req.query;

      const criteria = {
        type: type as BlacklistType,
        reason: reason as BlacklistReason,
        searchTerm: searchTerm as string,
        addedBy: addedBy as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 50, 100)
      };

      const result = await BlacklistService.searchBlacklist(criteria);

      res.json(result);
    } catch (error) {
      console.error('Error searching blacklist:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search blacklist'
        }
      });
    }
  }

  /**
   * Check if value is blacklisted
   */
  static async checkBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { type, value } = req.query;

      if (!type || !value) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Type and value are required'
          }
        });
        return;
      }

      if (!Object.values(BlacklistType).includes(type as BlacklistType)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid blacklist type. Must be one of: ${Object.values(BlacklistType).join(', ')}`
          }
        });
        return;
      }

      const match = await BlacklistService.isBlacklisted(type as BlacklistType, value as string);

      res.json({
        isBlacklisted: !!match,
        match: match || null
      });
    } catch (error) {
      console.error('Error checking blacklist:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check blacklist'
        }
      });
    }
  }

  /**
   * Bulk check multiple values
   */
  static async bulkCheck(req: Request, res: Response): Promise<void> {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Array of items is required'
          }
        });
        return;
      }

      if (items.length > 100) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Maximum 100 items allowed per request'
          }
        });
        return;
      }

      // Validate each item
      for (const item of items) {
        if (!item.type || !item.value) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Each item must have type and value'
            }
          });
          return;
        }

        if (!Object.values(BlacklistType).includes(item.type)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid blacklist type: ${item.type}`
            }
          });
          return;
        }
      }

      const results = await BlacklistService.bulkCheck(items);

      const summary = {
        total: items.length,
        blacklisted: results.filter(r => r.isBlacklisted).length,
        clean: results.filter(r => !r.isBlacklisted).length
      };

      res.json({
        results,
        summary
      });
    } catch (error) {
      console.error('Error in bulk blacklist check:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform bulk blacklist check'
        }
      });
    }
  }

  /**
   * Get blacklist statistics
   */
  static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await BlacklistService.getStatistics();
      res.json(statistics);
    } catch (error) {
      console.error('Error getting blacklist statistics:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get blacklist statistics'
        }
      });
    }
  }

  /**
   * Export blacklist
   */
  static async exportBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;

      if (type && !Object.values(BlacklistType).includes(type as BlacklistType)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid blacklist type. Must be one of: ${Object.values(BlacklistType).join(', ')}`
          }
        });
        return;
      }

      const items = await BlacklistService.exportBlacklist(type as BlacklistType);

      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="blacklist-${type || 'all'}-${new Date().toISOString().split('T')[0]}.json"`);

      res.json(items);
    } catch (error) {
      console.error('Error exporting blacklist:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to export blacklist'
        }
      });
    }
  }

  /**
   * Import blacklist items
   */
  static async importBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { items } = req.body;
      const importedBy = req.user?.id;

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Array of items is required'
          }
        });
        return;
      }

      if (items.length > 1000) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Maximum 1000 items allowed per import'
          }
        });
        return;
      }

      if (!importedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Validate items structure
      for (const item of items) {
        if (!item.type || !item.value || !item.reason) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Each item must have type, value, and reason'
            }
          });
          return;
        }

        if (!Object.values(BlacklistType).includes(item.type)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid blacklist type: ${item.type}`
            }
          });
          return;
        }

        if (!Object.values(BlacklistReason).includes(item.reason)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid reason: ${item.reason}`
            }
          });
          return;
        }
      }

      const result = await BlacklistService.importBlacklist(items, importedBy);

      res.json(result);
    } catch (error) {
      console.error('Error importing blacklist:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to import blacklist'
        }
      });
    }
  }

  /**
   * Get blacklist suggestions
   */
  static async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { type, partialValue } = req.query;

      if (!type || !partialValue) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Type and partialValue are required'
          }
        });
        return;
      }

      if (!Object.values(BlacklistType).includes(type as BlacklistType)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid blacklist type. Must be one of: ${Object.values(BlacklistType).join(', ')}`
          }
        });
        return;
      }

      const suggestions = await BlacklistService.getSuggestions(
        type as BlacklistType,
        partialValue as string
      );

      res.json({ suggestions });
    } catch (error) {
      console.error('Error getting blacklist suggestions:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get blacklist suggestions'
        }
      });
    }
  }

  /**
   * Clean up blacklist
   */
  static async cleanupBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const cleanedBy = req.user?.id;

      if (!cleanedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const result = await BlacklistService.cleanupBlacklist(cleanedBy);

      res.json(result);
    } catch (error) {
      console.error('Error cleaning up blacklist:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clean up blacklist'
        }
      });
    }
  }
}