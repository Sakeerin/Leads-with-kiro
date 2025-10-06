import { Request, Response } from 'express';
import { LeadService } from '../services/leadService';
import { LeadMergeService } from '../services/leadMergeService';
import { ValidationError, NotFoundError } from '../utils/errors';

export class DuplicateController {
  /**
   * Detect duplicates for lead data
   */
  static async detectDuplicates(req: Request, res: Response): Promise<void> {
    try {
      const { email, phone, mobile, companyName, contactName } = req.body;

      if (!email && !phone && !mobile && !companyName) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field (email, phone, mobile, companyName) is required'
          }
        });
        return;
      }

      const duplicates = await LeadService.detectDuplicatesAdvanced({
        email: email || '',
        phone,
        mobile,
        companyName: companyName || '',
        contactName: contactName || ''
      });

      res.json({
        duplicates,
        count: duplicates.length
      });
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to detect duplicates'
        }
      });
    }
  }

  /**
   * Generate merge preview for two leads
   */
  static async generateMergePreview(req: Request, res: Response): Promise<void> {
    try {
      const { sourceId, targetId } = req.params;

      if (!sourceId || !targetId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Both sourceId and targetId are required'
          }
        });
        return;
      }

      if (sourceId === targetId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Source and target leads cannot be the same'
          }
        });
        return;
      }

      const preview = await LeadService.generateMergePreview(sourceId, targetId);

      res.json(preview);
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

      console.error('Error generating merge preview:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate merge preview'
        }
      });
    }
  }

  /**
   * Merge two leads
   */
  static async mergeLeads(req: Request, res: Response): Promise<void> {
    try {
      const { sourceId, targetId } = req.params;
      const { fieldDecisions, preserveSourceData = false } = req.body;
      const mergedBy = req.user?.id;

      if (!sourceId || !targetId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Both sourceId and targetId are required'
          }
        });
        return;
      }

      if (sourceId === targetId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Source and target leads cannot be the same'
          }
        });
        return;
      }

      if (!fieldDecisions || typeof fieldDecisions !== 'object') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field decisions are required'
          }
        });
        return;
      }

      if (!mergedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const result = await LeadService.mergeLeads({
        sourceId,
        targetId,
        fieldDecisions,
        mergedBy,
        preserveSourceData
      });

      res.json(result);
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
            message: error.message,
            details: error.details
          }
        });
        return;
      }

      console.error('Error merging leads:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to merge leads'
        }
      });
    }
  }

  /**
   * Undo lead merge
   */
  static async undoMerge(req: Request, res: Response): Promise<void> {
    try {
      const { mergedLeadId } = req.params;
      const { originalSourceData } = req.body;
      const undoneBy = req.user?.id;

      if (!mergedLeadId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Merged lead ID is required'
          }
        });
        return;
      }

      if (!originalSourceData) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Original source data is required'
          }
        });
        return;
      }

      if (!undoneBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const restoredLead = await LeadService.undoMerge(
        mergedLeadId,
        originalSourceData,
        undoneBy
      );

      res.json({
        restoredLead,
        message: 'Lead merge successfully undone'
      });
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

      console.error('Error undoing merge:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to undo merge'
        }
      });
    }
  }

  /**
   * Bulk duplicate detection for multiple leads
   */
  static async bulkDuplicateDetection(req: Request, res: Response): Promise<void> {
    try {
      const { leads } = req.body;

      if (!Array.isArray(leads) || leads.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Array of leads is required'
          }
        });
        return;
      }

      if (leads.length > 100) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Maximum 100 leads allowed per request'
          }
        });
        return;
      }

      const results = [];

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        try {
          const duplicates = await LeadService.detectDuplicatesAdvanced({
            email: lead.email || '',
            phone: lead.phone,
            mobile: lead.mobile,
            companyName: lead.companyName || '',
            contactName: lead.contactName || ''
          });

          results.push({
            index: i,
            lead: {
              email: lead.email,
              companyName: lead.companyName,
              contactName: lead.contactName
            },
            duplicates,
            duplicateCount: duplicates.length
          });
        } catch (error) {
          results.push({
            index: i,
            lead: {
              email: lead.email,
              companyName: lead.companyName,
              contactName: lead.contactName
            },
            error: error instanceof Error ? error.message : 'Unknown error',
            duplicates: [],
            duplicateCount: 0
          });
        }
      }

      const summary = {
        total: leads.length,
        withDuplicates: results.filter(r => r.duplicateCount > 0).length,
        withErrors: results.filter(r => r.error).length,
        totalDuplicatesFound: results.reduce((sum, r) => sum + r.duplicateCount, 0)
      };

      res.json({
        results,
        summary
      });
    } catch (error) {
      console.error('Error in bulk duplicate detection:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform bulk duplicate detection'
        }
      });
    }
  }
}