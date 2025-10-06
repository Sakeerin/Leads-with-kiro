import { Request, Response } from 'express';
import { RoutingService, AssignmentResult, WorkloadInfo, SLAStatus, ReassignmentRequest } from '../services/routingService';
import { AssignmentRule } from '../models/AssignmentRule';
import { ValidationError, NotFoundError, BusinessLogicError } from '../utils/errors';
import { AssignmentRule as AssignmentRuleType } from '../types';

export class RoutingController {
  /**
   * Assign a lead using routing rules
   */
  static async assignLead(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { assigneeId } = req.body;

      if (!leadId) {
        res.status(400).json({ error: 'Lead ID is required' });
        return;
      }

      const result: AssignmentResult = await RoutingService.assignLead(leadId, assigneeId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Lead assigned successfully'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof BusinessLogicError) {
        res.status(422).json({ error: error.message });
      } else {
        console.error('Error assigning lead:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Manually reassign a lead
   */
  static async reassignLead(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { newAssigneeId, reason } = req.body;
      const reassignedBy = req.user?.id; // Assuming user is attached by auth middleware

      if (!leadId || !newAssigneeId || !reason) {
        res.status(400).json({ error: 'Lead ID, new assignee ID, and reason are required' });
        return;
      }

      if (!reassignedBy) {
        res.status(401).json({ error: 'User authentication required' });
        return;
      }

      const request: ReassignmentRequest = {
        leadId,
        newAssigneeId,
        reason,
        reassignedBy
      };

      const result: AssignmentResult = await RoutingService.reassignLead(request);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Lead reassigned successfully'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof BusinessLogicError) {
        res.status(422).json({ error: error.message });
      } else {
        console.error('Error reassigning lead:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get workload information for all users
   */
  static async getUserWorkloads(req: Request, res: Response): Promise<void> {
    try {
      const workloads: WorkloadInfo[] = await RoutingService.getAllUserWorkloads();

      res.status(200).json({
        success: true,
        data: workloads,
        message: 'User workloads retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting user workloads:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get workload information for a specific user
   */
  static async getUserWorkload(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const workload: WorkloadInfo = await RoutingService.getUserWorkload(userId);

      res.status(200).json({
        success: true,
        data: workload,
        message: 'User workload retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting user workload:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Check SLA compliance for a lead
   */
  static async checkSLACompliance(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;

      if (!leadId) {
        res.status(400).json({ error: 'Lead ID is required' });
        return;
      }

      const slaStatus: SLAStatus = await RoutingService.checkSLACompliance(leadId);

      res.status(200).json({
        success: true,
        data: slaStatus,
        message: 'SLA status retrieved successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof BusinessLogicError) {
        res.status(422).json({ error: error.message });
      } else {
        console.error('Error checking SLA compliance:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get all overdue leads
   */
  static async getOverdueLeads(req: Request, res: Response): Promise<void> {
    try {
      const overdueLeads: SLAStatus[] = await RoutingService.getOverdueLeads();

      res.status(200).json({
        success: true,
        data: overdueLeads,
        message: 'Overdue leads retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting overdue leads:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Escalate overdue leads
   */
  static async escalateOverdueLeads(req: Request, res: Response): Promise<void> {
    try {
      await RoutingService.escalateOverdueLeads();

      res.status(200).json({
        success: true,
        message: 'Overdue leads escalated successfully'
      });
    } catch (error) {
      console.error('Error escalating overdue leads:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get assignment statistics
   */
  static async getAssignmentStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await RoutingService.getAssignmentStatistics();

      res.status(200).json({
        success: true,
        data: statistics,
        message: 'Assignment statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting assignment statistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create a new assignment rule
   */
  static async createAssignmentRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleData = req.body as Omit<AssignmentRuleType, 'id' | 'createdAt' | 'updatedAt'>;
      const createdBy = req.user?.id;

      if (!createdBy) {
        res.status(401).json({ error: 'User authentication required' });
        return;
      }

      // Validate required fields
      if (!ruleData.name || !ruleData.conditions || !ruleData.actions) {
        res.status(400).json({ error: 'Name, conditions, and actions are required' });
        return;
      }

      const ruleWithCreator = { ...ruleData, createdBy };
      const rule = await AssignmentRule.createRule(ruleWithCreator);

      res.status(201).json({
        success: true,
        data: AssignmentRule.transformToAssignmentRuleType(rule),
        message: 'Assignment rule created successfully'
      });
    } catch (error) {
      console.error('Error creating assignment rule:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update an assignment rule
   */
  static async updateAssignmentRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const ruleData = req.body as Partial<AssignmentRuleType>;

      if (!ruleId) {
        res.status(400).json({ error: 'Rule ID is required' });
        return;
      }

      const rule = await AssignmentRule.updateRule(ruleId, ruleData);

      res.status(200).json({
        success: true,
        data: AssignmentRule.transformToAssignmentRuleType(rule),
        message: 'Assignment rule updated successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error updating assignment rule:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get all assignment rules
   */
  static async getAssignmentRules(req: Request, res: Response): Promise<void> {
    try {
      const { active } = req.query;
      
      let rules;
      if (active === 'true') {
        rules = await AssignmentRule.findActiveRules();
      } else {
        rules = await AssignmentRule.findAll();
      }

      const transformedRules = rules.map(rule => AssignmentRule.transformToAssignmentRuleType(rule));

      res.status(200).json({
        success: true,
        data: transformedRules,
        message: 'Assignment rules retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting assignment rules:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get a specific assignment rule
   */
  static async getAssignmentRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;

      if (!ruleId) {
        res.status(400).json({ error: 'Rule ID is required' });
        return;
      }

      const rule = await AssignmentRule.findById(ruleId);
      if (!rule) {
        res.status(404).json({ error: 'Assignment rule not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: AssignmentRule.transformToAssignmentRuleType(rule),
        message: 'Assignment rule retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting assignment rule:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete an assignment rule
   */
  static async deleteAssignmentRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;

      if (!ruleId) {
        res.status(400).json({ error: 'Rule ID is required' });
        return;
      }

      await AssignmentRule.delete(ruleId);

      res.status(200).json({
        success: true,
        message: 'Assignment rule deleted successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error deleting assignment rule:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Activate an assignment rule
   */
  static async activateAssignmentRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;

      if (!ruleId) {
        res.status(400).json({ error: 'Rule ID is required' });
        return;
      }

      const rule = await AssignmentRule.activateRule(ruleId);

      res.status(200).json({
        success: true,
        data: AssignmentRule.transformToAssignmentRuleType(rule),
        message: 'Assignment rule activated successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error activating assignment rule:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Deactivate an assignment rule
   */
  static async deactivateAssignmentRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;

      if (!ruleId) {
        res.status(400).json({ error: 'Rule ID is required' });
        return;
      }

      const rule = await AssignmentRule.deactivateRule(ruleId);

      res.status(200).json({
        success: true,
        data: AssignmentRule.transformToAssignmentRuleType(rule),
        message: 'Assignment rule deactivated successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error deactivating assignment rule:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Reorder assignment rules
   */
  static async reorderAssignmentRules(req: Request, res: Response): Promise<void> {
    try {
      const { ruleIds } = req.body;

      if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
        res.status(400).json({ error: 'Rule IDs array is required' });
        return;
      }

      await AssignmentRule.reorderRules(ruleIds);

      res.status(200).json({
        success: true,
        message: 'Assignment rules reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering assignment rules:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get assignment rule statistics
   */
  static async getAssignmentRuleStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await AssignmentRule.getRuleStatistics();

      res.status(200).json({
        success: true,
        data: statistics,
        message: 'Assignment rule statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting assignment rule statistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}