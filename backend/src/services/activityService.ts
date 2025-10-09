import { Activity } from '../models/Activity';
import { Activity as ActivityType, ActivityTable, ActivityType as ActivityTypeEnum } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';
import { NotificationService } from './notificationService';

export interface TimelineActivity extends ActivityType {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  mentions?: string[]; // Array of user IDs mentioned in the activity
}

export interface ActivityFilter {
  leadId?: string;
  performedBy?: string;
  type?: ActivityTypeEnum;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface MentionNotification {
  id: string;
  mentionedUserId: string;
  activityId: string;
  leadId: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export class ActivityService {
  /**
   * Create a new activity with @mention support
   */
  static async createActivity(activityData: Omit<ActivityType, 'id'>): Promise<ActivityType> {
    // Validate required fields
    if (!activityData.leadId || !activityData.type || !activityData.subject || !activityData.performedBy) {
      throw new ValidationError('Missing required fields: leadId, type, subject, performedBy');
    }

    // Extract @mentions from subject and details
    const mentions = this.extractMentions(activityData.subject, activityData.details);

    const dbActivity = await Activity.createActivity(activityData);
    const activity = Activity.transformToActivityType(dbActivity);

    // Process @mentions and send notifications
    if (mentions.length > 0) {
      const content = `${activityData.subject} - ${JSON.stringify(activityData.details)}`;
      await NotificationService.processMentions(
        activity.id, 
        activity.leadId, 
        mentions, 
        activityData.performedBy,
        content
      );
    }

    return activity;
  }

  /**
   * Get activity by ID
   */
  static async getActivityById(activityId: string): Promise<ActivityType> {
    const dbActivity = await Activity.findById(activityId);
    if (!dbActivity) {
      throw new NotFoundError('Activity not found');
    }
    return Activity.transformToActivityType(dbActivity);
  }

  /**
   * Get activities with filtering and pagination
   */
  static async getActivities(filter: ActivityFilter): Promise<{
    activities: ActivityType[];
    total: number;
    hasMore: boolean;
  }> {
    let query = Activity.query;

    // Apply filters
    if (filter.leadId) {
      query = query.where('lead_id', filter.leadId);
    }
    if (filter.performedBy) {
      query = query.where('performed_by', filter.performedBy);
    }
    if (filter.type) {
      query = query.where('type', filter.type);
    }
    if (filter.startDate) {
      query = query.where('performed_at', '>=', filter.startDate);
    }
    if (filter.endDate) {
      query = query.where('performed_at', '<=', filter.endDate);
    }

    // Get total count
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count').first();
    const total = parseInt(totalResult?.['count'] as string) || 0;

    // Apply pagination
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    
    query = query.orderBy('performed_at', 'desc').limit(limit).offset(offset);

    const dbActivities = await query;
    const activities = dbActivities.map(activity => Activity.transformToActivityType(activity));

    return {
      activities,
      total,
      hasMore: offset + activities.length < total
    };
  }

  /**
   * Get chronological timeline for a lead with user information
   */
  static async getLeadTimeline(leadId: string, limit: number = 100): Promise<TimelineActivity[]> {
    const dbActivities = await Activity.query
      .where('lead_id', leadId)
      .leftJoin('users', 'activities.performed_by', 'users.id')
      .select(
        'activities.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .orderBy('performed_at', 'desc')
      .limit(limit);

    return dbActivities.map(activity => {
      const baseActivity = Activity.transformToActivityType(activity);
      const timelineActivity: TimelineActivity = {
        ...baseActivity,
        user: activity.first_name ? {
          id: activity.performed_by,
          firstName: activity.first_name,
          lastName: activity.last_name,
          email: activity.email
        } : undefined,
        mentions: this.extractMentions(activity.subject, JSON.parse(activity.details))
      };
      return timelineActivity;
    });
  }

  /**
   * Get recent activities across all leads
   */
  static async getRecentActivities(limit: number = 50): Promise<TimelineActivity[]> {
    const dbActivities = await Activity.query
      .leftJoin('users', 'activities.performed_by', 'users.id')
      .leftJoin('leads', 'activities.lead_id', 'leads.id')
      .select(
        'activities.*',
        'users.first_name',
        'users.last_name',
        'users.email',
        'leads.company_name',
        'leads.contact_name'
      )
      .orderBy('performed_at', 'desc')
      .limit(limit);

    return dbActivities.map(activity => {
      const baseActivity = Activity.transformToActivityType(activity);
      const timelineActivity: TimelineActivity = {
        ...baseActivity,
        user: activity.first_name ? {
          id: activity.performed_by,
          firstName: activity.first_name,
          lastName: activity.last_name,
          email: activity.email
        } : undefined,
        mentions: this.extractMentions(activity.subject, JSON.parse(activity.details))
      };
      return timelineActivity;
    });
  }

  /**
   * Get activity statistics
   */
  static async getActivityStatistics(leadId?: string): Promise<{
    totalActivities: number;
    activitiesByType: Record<string, number>;
    recentActivityCount: number;
    topPerformers: Array<{ userId: string; count: number; userName: string }>;
  }> {
    const baseStats = await Activity.getActivityStatistics(leadId);

    // Get top performers
    let performerQuery = Activity.query
      .leftJoin('users', 'activities.performed_by', 'users.id')
      .select(
        'activities.performed_by as userId',
        Activity.query.raw('COUNT(*) as count'),
        Activity.query.raw("CONCAT(users.first_name, ' ', users.last_name) as userName")
      )
      .groupBy('activities.performed_by', 'users.first_name', 'users.last_name')
      .orderBy('count', 'desc')
      .limit(10);

    if (leadId) {
      performerQuery = performerQuery.where('activities.lead_id', leadId);
    }

    const topPerformers = await performerQuery;

    return {
      ...baseStats,
      topPerformers: topPerformers.map(performer => ({
        userId: performer.userId,
        count: parseInt(performer.count),
        userName: performer.userName || 'Unknown User'
      }))
    };
  }

  /**
   * Add a note/comment with @mention support
   */
  static async addNote(leadId: string, note: string, performedBy: string): Promise<ActivityType> {
    return this.createActivity({
      leadId,
      type: ActivityTypeEnum.NOTE_ADDED,
      subject: 'Note added',
      details: { note },
      performedBy,
      performedAt: new Date()
    });
  }

  /**
   * Log email activity
   */
  static async logEmail(
    leadId: string, 
    performedBy: string, 
    emailData: {
      type: 'sent' | 'received' | 'opened' | 'replied';
      subject: string;
      to?: string;
      from?: string;
      templateId?: string;
    }
  ): Promise<ActivityType> {
    const activityType = {
      sent: ActivityTypeEnum.EMAIL_SENT,
      received: ActivityTypeEnum.EMAIL_RECEIVED,
      opened: ActivityTypeEnum.EMAIL_OPENED,
      replied: ActivityTypeEnum.EMAIL_REPLIED
    }[emailData.type];

    return this.createActivity({
      leadId,
      type: activityType,
      subject: `Email ${emailData.type}: ${emailData.subject}`,
      details: emailData,
      performedBy,
      performedAt: new Date()
    });
  }

  /**
   * Log call activity
   */
  static async logCall(
    leadId: string, 
    performedBy: string, 
    callData: {
      type: 'made' | 'answered';
      duration?: number;
      outcome?: string;
      notes?: string;
    }
  ): Promise<ActivityType> {
    const activityType = callData.type === 'made' ? ActivityTypeEnum.CALL_MADE : ActivityTypeEnum.CALL_ANSWERED;

    return this.createActivity({
      leadId,
      type: activityType,
      subject: `Call ${callData.type}`,
      details: callData,
      performedBy,
      performedAt: new Date()
    });
  }

  /**
   * Log meeting activity
   */
  static async logMeeting(
    leadId: string, 
    performedBy: string, 
    meetingData: {
      type: 'scheduled' | 'attended';
      title: string;
      scheduledAt?: Date;
      duration?: number;
      attendees?: string[];
      notes?: string;
    }
  ): Promise<ActivityType> {
    const activityType = meetingData.type === 'scheduled' ? ActivityTypeEnum.MEETING_SCHEDULED : ActivityTypeEnum.MEETING_ATTENDED;

    return this.createActivity({
      leadId,
      type: activityType,
      subject: `Meeting ${meetingData.type}: ${meetingData.title}`,
      details: meetingData,
      performedBy,
      performedAt: new Date()
    });
  }

  /**
   * Extract @mentions from text content
   */
  private static extractMentions(subject: string, details: Record<string, any>): string[] {
    const mentions = new Set<string>();
    const mentionRegex = /@([a-f0-9-]{36})/g; // UUID pattern for user IDs

    // Extract from subject
    let match;
    while ((match = mentionRegex.exec(subject)) !== null) {
      mentions.add(match[1]);
    }

    // Extract from details (recursively search all string values)
    const searchDetails = (obj: any) => {
      if (typeof obj === 'string') {
        let detailMatch;
        while ((detailMatch = mentionRegex.exec(obj)) !== null) {
          mentions.add(detailMatch[1]);
        }
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(searchDetails);
      }
    };

    searchDetails(details);
    return Array.from(mentions);
  }



  /**
   * Get activities by date range for reporting
   */
  static async getActivitiesByDateRange(
    startDate: Date, 
    endDate: Date, 
    leadId?: string
  ): Promise<ActivityType[]> {
    let dbActivities: ActivityTable[];
    
    if (leadId) {
      dbActivities = await Activity.query
        .where('lead_id', leadId)
        .where('performed_at', '>=', startDate)
        .where('performed_at', '<=', endDate)
        .orderBy('performed_at', 'desc');
    } else {
      dbActivities = await Activity.findActivitiesByDateRange(startDate, endDate);
    }

    return dbActivities.map(activity => Activity.transformToActivityType(activity));
  }

  /**
   * Search activities by content
   */
  static async searchActivities(
    searchTerm: string, 
    leadId?: string, 
    limit: number = 50
  ): Promise<ActivityType[]> {
    let query = Activity.query
      .where(function() {
        this.where('subject', 'ilike', `%${searchTerm}%`)
            .orWhere('details', 'ilike', `%${searchTerm}%`);
      });

    if (leadId) {
      query = query.where('lead_id', leadId);
    }

    const dbActivities = await query
      .orderBy('performed_at', 'desc')
      .limit(limit);

    return dbActivities.map(activity => Activity.transformToActivityType(activity));
  }
}