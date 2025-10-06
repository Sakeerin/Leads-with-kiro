import { Request, Response, NextFunction } from 'express';
import { LeadService, CreateLeadRequest, UpdateLeadRequest, SearchCriteria } from '../services/leadService';
import { ValidationError, NotFoundError } from '../utils/errors';
import { LeadStatus, LeadChannel, ScoreBand } from '../types';

export class LeadController {
  /**
   * Create a new lead
   */
  static async createLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      const leadData: CreateLeadRequest = {
        ...req.body,
        createdBy: userId
      };

      const lead = await LeadService.createLead(leadData);

      res.status(201).json({
        success: true,
        data: lead,
        message: 'Lead created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a lead by ID
   */
  static async getLeadById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const lead = await LeadService.getLeadById(id);

      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a lead by Account Lead ID
   */
  static async getLeadByAccountId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.params;
      const lead = await LeadService.getLeadByAccountId(accountId);

      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a lead
   */
  static async updateLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      const updateData: UpdateLeadRequest = req.body;
      const lead = await LeadService.updateLead(id, updateData, userId);

      res.json({
        success: true,
        data: lead,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a lead (soft delete)
   */
  static async deleteLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      await LeadService.deleteLead(id, userId);

      res.json({
        success: true,
        message: 'Lead deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore a soft-deleted lead
   */
  static async restoreLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      const lead = await LeadService.restoreLead(id, userId);

      res.json({
        success: true,
        data: lead,
        message: 'Lead restored successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search leads with filters and pagination
   */
  static async searchLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const criteria: SearchCriteria = {
        searchTerm: req.query.search as string,
        status: req.query.status as LeadStatus,
        assignedTo: req.query.assignedTo as string,
        source: req.query.source as LeadChannel,
        scoreBand: req.query.scoreBand as ScoreBand,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      // Parse date filters
      if (req.query.createdAfter) {
        criteria.createdAfter = new Date(req.query.createdAfter as string);
      }
      if (req.query.createdBefore) {
        criteria.createdBefore = new Date(req.query.createdBefore as string);
      }
      if (req.query.followUpAfter) {
        criteria.followUpAfter = new Date(req.query.followUpAfter as string);
      }
      if (req.query.followUpBefore) {
        criteria.followUpBefore = new Date(req.query.followUpBefore as string);
      }

      const result = await LeadService.searchLeads(criteria);

      res.json({
        success: true,
        data: result.leads,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leads assigned to current user
   */
  static async getMyLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      const criteria: SearchCriteria = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await LeadService.getLeadsByAssignee(userId, criteria);

      res.json({
        success: true,
        data: result.leads,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leads by status
   */
  static async getLeadsByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.params;
      
      if (!Object.values(LeadStatus).includes(status as LeadStatus)) {
        throw new ValidationError(`Invalid status: ${status}`);
      }

      const criteria: SearchCriteria = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await LeadService.getLeadsByStatus(status as LeadStatus, criteria);

      res.json({
        success: true,
        data: result.leads,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Detect duplicate leads
   */
  static async detectDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, phone, companyName } = req.body;

      if (!email && !phone && !companyName) {
        throw new ValidationError('At least one of email, phone, or companyName is required');
      }

      const duplicates = await LeadService.detectDuplicates({
        email,
        phone,
        companyName
      });

      res.json({
        success: true,
        data: duplicates
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lead statistics
   */
  static async getLeadStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statistics = await LeadService.getLeadStatistics();

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update leads
   */
  static async bulkUpdateLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadIds, updates } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        throw new ValidationError('Lead IDs array is required');
      }

      if (!updates || typeof updates !== 'object') {
        throw new ValidationError('Updates object is required');
      }

      const results = [];
      const errors = [];

      for (const leadId of leadIds) {
        try {
          const updatedLead = await LeadService.updateLead(leadId, updates, userId);
          results.push(updatedLead);
        } catch (error) {
          errors.push({
            leadId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          updated: results,
          errors: errors
        },
        message: `Successfully updated ${results.length} leads${errors.length > 0 ? `, ${errors.length} failed` : ''}`
      });
    } catch (error) {
      next(error);
    }
  }
}