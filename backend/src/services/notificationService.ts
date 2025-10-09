import { User } from '../models/User';
import { Lead } from '../models/Lead';
import { Activity } from '../models/Activity';
import { ValidationError } from '../utils/errors';

export interface MentionNotification {
  id: string;
  mentionedUserId: string;
  activityId: string;
  leadId: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  mentionNotifications: boolean;
  taskReminders: boolean;
  leadAssignments: boolean;
}

export class NotificationService {
  /**
   * Process @mentions in activity and create notifications
   */
  static async processMentions(
    activityId: string,
    leadId: string,
    mentionedUserIds: string[],
    performedBy: string,
    content: string
  ): Promise<void> {
    // Filter out self-mentions
    const filteredMentions = mentionedUserIds.filter(userId => userId !== performedBy);

    if (filteredMentions.length === 0) {
      return;
    }

    try {
      // Get activity details
      const activity = await Activity.findById(activityId);
      if (!activity) {
        throw new ValidationError('Activity not found');
      }

      // Get lead details
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new ValidationError('Lead not found');
      }

      // Get performer details
      const performer = await User.findById(performedBy);
      const performerName = performer ? 
        `${performer.first_name} ${performer.last_name}` : 
        'Unknown User';

      // Process each mention
      for (const userId of filteredMentions) {
        await this.createMentionNotification(
          userId,
          activityId,
          leadId,
          performerName,
          lead.company_name,
          content
        );
      }
    } catch (error) {
      console.error('Error processing mentions:', error);
      // Don't throw error to avoid breaking the main activity creation flow
    }
  }

  /**
   * Create a mention notification
   */
  private static async createMentionNotification(
    mentionedUserId: string,
    activityId: string,
    leadId: string,
    performerName: string,
    companyName: string,
    content: string
  ): Promise<void> {
    // Validate that mentioned user exists
    const mentionedUser = await User.findById(mentionedUserId);
    if (!mentionedUser) {
      console.warn(`Mentioned user ${mentionedUserId} not found`);
      return;
    }

    const message = `${performerName} mentioned you in ${companyName}: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`;

    // In a real implementation, this would:
    // 1. Store notification in database
    // 2. Send real-time notification via WebSocket
    // 3. Send email notification if user preferences allow
    // 4. Send push notification if configured

    console.log(`📢 Mention notification created for ${mentionedUser.email}: ${message}`);

    // TODO: Store in notifications table
    // await this.storeNotification({
    //   mentionedUserId,
    //   activityId,
    //   leadId,
    //   message,
    //   isRead: false,
    //   createdAt: new Date()
    // });

    // Send real-time notification
    await this.sendRealtimeNotification(mentionedUserId, {
      type: 'mention',
      activityId,
      leadId,
      message,
      timestamp: new Date()
    });

    // Send email notification if enabled
    const preferences = await this.getUserNotificationPreferences(mentionedUserId);
    if (preferences.emailNotifications && preferences.mentionNotifications) {
      await this.sendEmailNotification(mentionedUser.email, {
        subject: 'You were mentioned in a lead activity',
        message,
        activityId,
        leadId
      });
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  private static async sendRealtimeNotification(
    userId: string,
    notification: {
      type: string;
      activityId: string;
      leadId: string;
      message: string;
      timestamp: Date;
    }
  ): Promise<void> {
    // TODO: Implement WebSocket notification
    // This would typically use Socket.IO or similar
    console.log(`🔔 Real-time notification sent to user ${userId}:`, notification);
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    email: string,
    notification: {
      subject: string;
      message: string;
      activityId: string;
      leadId: string;
    }
  ): Promise<void> {
    // TODO: Implement email sending
    // This would typically use SendGrid, AWS SES, or similar service
    console.log(`📧 Email notification sent to ${email}:`, notification);
  }

  /**
   * Get user notification preferences
   */
  private static async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // TODO: Implement user preferences storage and retrieval
    // For now, return default preferences
    return {
      emailNotifications: true,
      pushNotifications: true,
      mentionNotifications: true,
      taskReminders: true,
      leadAssignments: true
    };
  }

  /**
   * Create task reminder notification
   */
  static async createTaskReminder(
    taskId: string,
    assigneeId: string,
    subject: string,
    dueDate: Date
  ): Promise<void> {
    const assignee = await User.findById(assigneeId);
    if (!assignee) {
      console.warn(`Task assignee ${assigneeId} not found`);
      return;
    }

    const message = `Reminder: Task "${subject}" is due ${dueDate.toLocaleDateString()}`;

    console.log(`⏰ Task reminder created for ${assignee.email}: ${message}`);

    // Send real-time notification
    await this.sendRealtimeNotification(assigneeId, {
      type: 'task_reminder',
      activityId: taskId,
      leadId: '', // Task reminders might not always have leadId
      message,
      timestamp: new Date()
    });

    // Send email notification if enabled
    const preferences = await this.getUserNotificationPreferences(assigneeId);
    if (preferences.emailNotifications && preferences.taskReminders) {
      await this.sendEmailNotification(assignee.email, {
        subject: 'Task Reminder',
        message,
        activityId: taskId,
        leadId: ''
      });
    }
  }

  /**
   * Create lead assignment notification
   */
  static async createLeadAssignmentNotification(
    leadId: string,
    assigneeId: string,
    assignedBy: string,
    companyName: string
  ): Promise<void> {
    const assignee = await User.findById(assigneeId);
    const assigner = await User.findById(assignedBy);
    
    if (!assignee) {
      console.warn(`Lead assignee ${assigneeId} not found`);
      return;
    }

    const assignerName = assigner ? 
      `${assigner.first_name} ${assigner.last_name}` : 
      'Unknown User';

    const message = `${assignerName} assigned you a new lead: ${companyName}`;

    console.log(`👤 Lead assignment notification created for ${assignee.email}: ${message}`);

    // Send real-time notification
    await this.sendRealtimeNotification(assigneeId, {
      type: 'lead_assignment',
      activityId: '',
      leadId,
      message,
      timestamp: new Date()
    });

    // Send email notification if enabled
    const preferences = await this.getUserNotificationPreferences(assigneeId);
    if (preferences.emailNotifications && preferences.leadAssignments) {
      await this.sendEmailNotification(assignee.email, {
        subject: 'New Lead Assignment',
        message,
        activityId: '',
        leadId
      });
    }
  }

  /**
   * Extract @mentions from text content
   */
  static extractMentions(text: string): string[] {
    const mentions = new Set<string>();
    
    // Match @userId patterns (assuming UUIDs)
    const mentionRegex = /@([a-f0-9-]{36})/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.add(match[1]);
    }
    
    return Array.from(mentions);
  }

  /**
   * Extract @mentions from activity details recursively
   */
  static extractMentionsFromDetails(details: Record<string, any>): string[] {
    const mentions = new Set<string>();
    
    const searchObject = (obj: any) => {
      if (typeof obj === 'string') {
        const textMentions = this.extractMentions(obj);
        textMentions.forEach(mention => mentions.add(mention));
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(searchObject);
      }
    };
    
    searchObject(details);
    return Array.from(mentions);
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    notifications: MentionNotification[];
    total: number;
    unreadCount: number;
  }> {
    // TODO: Implement database queries for notifications
    // For now, return empty result
    return {
      notifications: [],
      total: 0,
      unreadCount: 0
    };
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    // TODO: Implement database update
    console.log(`✅ Notification ${notificationId} marked as read by user ${userId}`);
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    // TODO: Implement database update
    console.log(`✅ All notifications marked as read for user ${userId}`);
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    // TODO: Implement database deletion
    console.log(`🗑️ Notification ${notificationId} deleted by user ${userId}`);
  }
}