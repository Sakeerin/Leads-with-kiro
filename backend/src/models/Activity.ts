import { BaseModel } from './BaseModel';
import { Activity as ActivityType, ActivityTable, ActivityType as ActivityTypeEnum } from '../types';

export class Activity extends BaseModel {
  protected static override tableName = 'activities';

  static async findByLeadId(leadId: string): Promise<ActivityTable[]> {
    return this.query.where('lead_id', leadId).orderBy('performed_at', 'desc');
  }

  static async findByPerformer(performerId: string): Promise<ActivityTable[]> {
    return this.query.where('performed_by', performerId).orderBy('performed_at', 'desc');
  }

  static async findByType(type: ActivityTypeEnum): Promise<ActivityTable[]> {
    return this.query.where('type', type).orderBy('performed_at', 'desc');
  }

  static async findRecentActivities(limit: number = 50): Promise<ActivityTable[]> {
    return this.query.orderBy('performed_at', 'desc').limit(limit);
  }

  static async findActivitiesByDateRange(startDate: Date, endDate: Date): Promise<ActivityTable[]> {
    return this.query
      .where('performed_at', '>=', startDate)
      .where('performed_at', '<=', endDate)
      .orderBy('performed_at', 'desc');
  }

  static async createActivity(activityData: Omit<ActivityType, 'id'>): Promise<ActivityTable> {
    const dbData: Partial<ActivityTable> = {
      lead_id: activityData.leadId,
      type: activityData.type,
      subject: activityData.subject,
      details: JSON.stringify(activityData.details),
      performed_by: activityData.performedBy,
      performed_at: activityData.performedAt,
      related_entities: activityData.relatedEntities ? JSON.stringify(activityData.relatedEntities) : null
    };

    return this.create(dbData);
  }

  static async logLeadCreated(leadId: string, performedBy: string, leadData: any): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'lead_created',
      subject: 'Lead created',
      details: { leadData },
      performedBy,
      performedAt: new Date()
    });
  }

  static async logLeadUpdated(leadId: string, performedBy: string, changes: any): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'lead_updated',
      subject: 'Lead updated',
      details: { changes },
      performedBy,
      performedAt: new Date()
    });
  }

  static async logLeadAssigned(leadId: string, performedBy: string, assignedTo: string, reason?: string): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'lead_assigned',
      subject: 'Lead assigned',
      details: { assignedTo, reason },
      performedBy,
      performedAt: new Date()
    });
  }

  static async logStatusChanged(leadId: string, performedBy: string, oldStatus: string, newStatus: string): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'status_changed',
      subject: 'Status changed',
      details: { oldStatus, newStatus },
      performedBy,
      performedAt: new Date()
    });
  }

  static async logScoreUpdated(leadId: string, performedBy: string, oldScore: number, newScore: number, scoreBand: string): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'score_updated',
      subject: 'Score updated',
      details: { oldScore, newScore, scoreBand },
      performedBy,
      performedAt: new Date()
    });
  }

  static async logEmailSent(leadId: string, performedBy: string, emailData: any): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'email_sent',
      subject: 'Email sent',
      details: { emailData },
      performedBy,
      performedAt: new Date()
    });
  }

  static async logCallMade(leadId: string, performedBy: string, callData: any): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'call_made',
      subject: 'Call made',
      details: { callData },
      performedBy,
      performedAt: new Date()
    });
  }

  static async logTaskCreated(leadId: string, performedBy: string, taskId: string, taskData: any): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'task_created',
      subject: 'Task created',
      details: { taskId, taskData },
      performedBy,
      performedAt: new Date(),
      relatedEntities: [{ type: 'task', id: taskId }]
    });
  }

  static async logTaskCompleted(leadId: string, performedBy: string, taskId: string): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'task_completed',
      subject: 'Task completed',
      details: { taskId },
      performedBy,
      performedAt: new Date(),
      relatedEntities: [{ type: 'task', id: taskId }]
    });
  }

  static async logNoteAdded(leadId: string, performedBy: string, note: string): Promise<ActivityTable> {
    return this.createActivity({
      leadId,
      type: 'note_added',
      subject: 'Note added',
      details: { note },
      performedBy,
      performedAt: new Date()
    });
  }

  static async getActivityStatistics(leadId?: string): Promise<{
    totalActivities: number;
    activitiesByType: Record<string, number>;
    recentActivityCount: number;
  }> {
    let query = this.query;
    
    if (leadId) {
      query = query.where('lead_id', leadId);
    }
    
    const [total, byType, recent] = await Promise.all([
      query.clone().count('* as count').first(),
      query.clone().select('type').count('* as count').groupBy('type'),
      query.clone().where('performed_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)).count('* as count').first()
    ]);
    
    const activitiesByType: Record<string, number> = {};
    byType.forEach((row: any) => {
      activitiesByType[row.type] = parseInt(row.count);
    });
    
    return {
      totalActivities: parseInt(total?.['count'] as string) || 0,
      activitiesByType,
      recentActivityCount: parseInt(recent?.['count'] as string) || 0
    };
  }

  static transformToActivityType(dbActivity: ActivityTable): ActivityType {
    return {
      id: dbActivity.id,
      leadId: dbActivity.lead_id,
      type: dbActivity.type,
      subject: dbActivity.subject,
      details: JSON.parse(dbActivity.details),
      performedBy: dbActivity.performed_by,
      performedAt: dbActivity.performed_at,
      relatedEntities: dbActivity.related_entities ? JSON.parse(dbActivity.related_entities) : undefined
    };
  }
}