import { Request, Response } from 'express';
import { ScoringService, ScoringCriteria, ScoreBandConfig } from '../services/scoringService';
import { ScoreBand } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';

export class ScoringController {
  /**
   * Calculate score for a specific lead
   */
  static async calculateLeadScore(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { modelId } = req.query;

      if (!leadId) {
        res.status(400).json({
          error: {
            code: 'MISSING_LEAD_ID',
            message: 'Lead ID is required'
          }
        });
        return;
      }

      const score = await ScoringService.calculateScore(leadId, modelId as string);

      res.json({
        success: true,
        data: score
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'LEAD_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        });
      } else {
        console.error('Error calculating lead score:', error);
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to calculate lead score'
          }
        });
      }
    }
  }

  /**
   * Recalculate scores for all leads
   */
  static async recalculateAllScores(req: Request, res: Response): Promise<void> {
    try {
      const { modelId } = req.query;

      const result = await ScoringService.recalculateAllScores(modelId as string);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error recalculating all scores:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to recalculate scores'
        }
      });
    }
  }

  /**
   * Recalculate scores for specific leads
   */
  static async recalculateLeadScores(req: Request, res: Response): Promise<void> {
    try {
      const { leadIds } = req.body;
      const { modelId } = req.query;

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_LEAD_IDS',
            message: 'Lead IDs array is required and must not be empty'
          }
        });
        return;
      }

      const result = await ScoringService.recalculateScoresForLeads(leadIds, modelId as string);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error recalculating lead scores:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to recalculate lead scores'
        }
      });
    }
  }

  /**
   * Get score bands configuration
   */
  static async getScoreBands(req: Request, res: Response): Promise<void> {
    try {
      const scoreBands = ScoringService.getScoreBands();

      res.json({
        success: true,
        data: scoreBands
      });
    } catch (error) {
      console.error('Error getting score bands:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get score bands'
        }
      });
    }
  }

  /**
   * Update score bands configuration
   */
  static async updateScoreBands(req: Request, res: Response): Promise<void> {
    try {
      const { scoreBands } = req.body;

      if (!Array.isArray(scoreBands)) {
        res.status(400).json({
          error: {
            code: 'INVALID_SCORE_BANDS',
            message: 'Score bands must be an array'
          }
        });
        return;
      }

      const updatedBands = ScoringService.updateScoreBands(scoreBands as ScoreBandConfig[]);

      res.json({
        success: true,
        data: updatedBands
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        });
      } else {
        console.error('Error updating score bands:', error);
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update score bands'
          }
        });
      }
    }
  }

  /**
   * Get scoring model
   */
  static async getScoringModel(req: Request, res: Response): Promise<void> {
    try {
      const { modelId } = req.params;

      if (!modelId) {
        res.status(400).json({
          error: {
            code: 'MISSING_MODEL_ID',
            message: 'Model ID is required'
          }
        });
        return;
      }

      const model = await ScoringService.getScoringModel(modelId);

      res.json({
        success: true,
        data: model
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'MODEL_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        console.error('Error getting scoring model:', error);
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get scoring model'
          }
        });
      }
    }
  }

  /**
   * Create new scoring model
   */
  static async createScoringModel(req: Request, res: Response): Promise<void> {
    try {
      const modelData = req.body;

      // Validate required fields
      if (!modelData.name || !modelData.criteria || !modelData.scoreBands) {
        res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Name, criteria, and scoreBands are required'
          }
        });
        return;
      }

      const model = await ScoringService.createScoringModel({
        ...modelData,
        createdBy: req.user?.id || 'system'
      });

      res.status(201).json({
        success: true,
        data: model
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        });
      } else {
        console.error('Error creating scoring model:', error);
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create scoring model'
          }
        });
      }
    }
  }

  /**
   * Update scoring model
   */
  static async updateScoringModel(req: Request, res: Response): Promise<void> {
    try {
      const { modelId } = req.params;
      const updates = req.body;

      if (!modelId) {
        res.status(400).json({
          error: {
            code: 'MISSING_MODEL_ID',
            message: 'Model ID is required'
          }
        });
        return;
      }

      const model = await ScoringService.updateScoringModel(modelId, updates);

      res.json({
        success: true,
        data: model
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'MODEL_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        });
      } else {
        console.error('Error updating scoring model:', error);
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update scoring model'
          }
        });
      }
    }
  }

  /**
   * Get lead scores with filtering and pagination
   */
  static async getLeadScores(req: Request, res: Response): Promise<void> {
    try {
      const {
        scoreBand,
        minScore,
        maxScore,
        calculatedAfter,
        page,
        limit
      } = req.query;

      const filters: any = {};

      if (scoreBand && Object.values(ScoreBand).includes(scoreBand as ScoreBand)) {
        filters.scoreBand = scoreBand as ScoreBand;
      }

      if (minScore && !isNaN(Number(minScore))) {
        filters.minScore = Number(minScore);
      }

      if (maxScore && !isNaN(Number(maxScore))) {
        filters.maxScore = Number(maxScore);
      }

      if (calculatedAfter) {
        const date = new Date(calculatedAfter as string);
        if (!isNaN(date.getTime())) {
          filters.calculatedAfter = date;
        }
      }

      if (page && !isNaN(Number(page))) {
        filters.page = Number(page);
      }

      if (limit && !isNaN(Number(limit))) {
        filters.limit = Number(limit);
      }

      const result = await ScoringService.getLeadScores(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting lead scores:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get lead scores'
        }
      });
    }
  }

  /**
   * Get scoring statistics
   */
  static async getScoringStatistics(req: Request, res: Response): Promise<void> {
    try {
      // Get score distribution
      const scoreDistribution = await ScoringService.getLeadScores({});
      
      const statistics = {
        totalScored: scoreDistribution.pagination.total,
        scoreBandDistribution: {
          hot: 0,
          warm: 0,
          cold: 0
        },
        averageScore: 0,
        scoreRanges: {
          '0-25': 0,
          '26-50': 0,
          '51-75': 0,
          '76-100': 0
        }
      };

      let totalScore = 0;
      scoreDistribution.scores.forEach(score => {
        // Count by score band
        statistics.scoreBandDistribution[score.scoreBand]++;
        
        // Calculate average
        totalScore += score.totalScore;
        
        // Count by score ranges
        if (score.totalScore <= 25) {
          statistics.scoreRanges['0-25']++;
        } else if (score.totalScore <= 50) {
          statistics.scoreRanges['26-50']++;
        } else if (score.totalScore <= 75) {
          statistics.scoreRanges['51-75']++;
        } else {
          statistics.scoreRanges['76-100']++;
        }
      });

      if (scoreDistribution.scores.length > 0) {
        statistics.averageScore = Math.round(totalScore / scoreDistribution.scores.length);
      }

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting scoring statistics:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get scoring statistics'
        }
      });
    }
  }
}