import { Request, Response } from 'express';
import { LeadConversionService, ConversionRequest, LeadClosureRequest } from '../services/leadConversionService';
import { ValidationError, NotFoundError } from '../utils/errors';

export class LeadConversionController {
  /**
   * Generate conversion preview
   * GET /api/leads/:id/conversion/preview
   */
  static async getConversionPreview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const preview = await LeadConversionService.generateConversionPreview(id);
      
      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Error generating conversion preview:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate conversion preview'
        });
      }
    }
  }

  /**
   * Convert lead to account/contact/opportunity
   * POST /api/leads/:id/convert
   */
  static async convertLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const conversionRequest: ConversionRequest = {
        leadId: id,
        conversionType: req.body.conversionType,
        accountData: req.body.accountData,
        contactData: req.body.contactData,
        opportunityData: req.body.opportunityData,
        existingAccountId: req.body.existingAccountId,
        existingContactId: req.body.existingContactId,
        notes: req.body.notes,
        convertedBy: userId
      };

      const result = await LeadConversionService.convertLead(conversionRequest);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          details: error.details
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Error converting lead:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to convert lead'
        });
      }
    }
  }

  /**
   * Close lead with Won/Lost/Disqualified status
   * POST /api/leads/:id/close
   */
  static async closeLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const closureRequest: LeadClosureRequest = {
        leadId: id,
        status: req.body.status,
        closeReason: req.body.closeReason,
        closeNotes: req.body.closeNotes,
        closedBy: userId
      };

      const result = await LeadConversionService.closeLead(closureRequest);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Error closing lead:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to close lead'
        });
      }
    }
  }

  /**
   * Get conversion history for a lead
   * GET /api/leads/:id/conversions
   */
  static async getConversionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const history = await LeadConversionService.getLeadConversionHistory(id);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error getting conversion history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversion history'
      });
    }
  }

  /**
   * Get conversion statistics
   * GET /api/conversions/statistics
   */
  static async getConversionStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await LeadConversionService.getConversionStatistics();
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting conversion statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversion statistics'
      });
    }
  }
}