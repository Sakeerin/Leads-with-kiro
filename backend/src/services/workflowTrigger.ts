import { workflowEngine } from './workflowEngine';
import { logger } from '../utils/logger';

export class WorkflowTrigger {
  /**
   * Trigger workflows when a lead is created
   */
  async onLeadCreated(leadId: string, createdBy: string, leadData: any): Promise<void> {
    try {
      await workflowEngine.executeTriggeredWorkflows(
        'lead_created',
        leadId,
        createdBy,
        { leadData }
      );
    } catch (error) {
      logger.error('Error triggering lead_created workflows:', error);
    }
  }

  /**
   * Trigger workflows when a lead is assigned
   */
  async onLeadAssigned(
    leadId: string,
    assignedBy: string,
    assignedTo: string,
    previousAssignee?: string
  ): Promise<void> {
    try {
      await workflowEngine.executeTriggeredWorkflows(
        'lead_assigned',
        leadId,
        assignedBy,
        { assignedTo, previousAssignee }
      );
    } catch (error) {
      logger.error('Error triggering lead_assigned workflows:', error);
    }
  }

  /**
   * Trigger workflows when lead score changes
   */
  async onScoreChanged(
    leadId: string,
    triggeredBy: string,
    newScore: number,
    previousScore: number,
    scoreBand: string
  ): Promise<void> {
    try {
      await workflowEngine.executeTriggeredWorkflows(
        'score_changed',
        leadId,
        triggeredBy,
        { newScore, previousScore, scoreBand }
      );
    } catch (error) {
      logger.error('Error triggering score_changed workflows:', error);
    }
  }

  /**
   * Trigger workflows when lead status is updated
   */
  async onStatusUpdated(
    leadId: string,
    updatedBy: string,
    newStatus: string,
    previousStatus: string
  ): Promise<void> {
    try {
      await workflowEngine.executeTriggeredWorkflows(
        'status_updated',
        leadId,
        updatedBy,
        { newStatus, previousStatus }
      );
    } catch (error) {
      logger.error('Error triggering status_updated workflows:', error);
    }
  }

  /**
   * Trigger workflows when a task is completed
   */
  async onTaskCompleted(
    leadId: string,
    completedBy: string,
    taskId: string,
    taskData: any
  ): Promise<void> {
    try {
      await workflowEngine.executeTriggeredWorkflows(
        'task_completed',
        leadId,
        completedBy,
        { taskId, taskData }
      );
    } catch (error) {
      logger.error('Error triggering task_completed workflows:', error);
    }
  }

  /**
   * Manually trigger workflows
   */
  async triggerManual(
    leadId: string,
    triggeredBy: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    try {
      await workflowEngine.executeTriggeredWorkflows(
        'manual',
        leadId,
        triggeredBy,
        context
      );
    } catch (error) {
      logger.error('Error triggering manual workflows:', error);
    }
  }
}

export const workflowTrigger = new WorkflowTrigger();