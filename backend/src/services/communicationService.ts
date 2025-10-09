import { EmailService, EmailConfig, SendEmailRequest } from './emailService';
import { EmailTemplateModel } from '../models/EmailTemplate';
import { CommunicationHistoryModel } from '../models/CommunicationHistory';
import { TaskService } from './taskService';
import { 
  EmailTemplate, 
  EmailTemplateType, 
  CommunicationHistory,
  CommunicationType,
  CommunicationDirection,
  Task,
  TaskType,
  TaskStatus,
  Priority
} from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface CalendarIntegration {
  createEvent(event: {
    leadId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    organizer: string;
  }): Promise<{ success: boolean; eventId?: string; error?: string }>;
  
  updateEvent(eventId: string, updates: any): Promise<{ success: boolean; error?: string }>;
  deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }>;
}

export interface CommunicationServiceConfig {
  email: EmailConfig;
  calendar?: CalendarIntegration;
}

export class CommunicationService {
  private emailService: EmailService;
  private calendarIntegration?: CalendarIntegration;

  constructor(config: CommunicationServiceConfig) {
    this.emailService = new EmailService(config.email);
    this.calendarIntegration = config.calendar;
  }

  // Email Template Management
  async createEmailTemplate(data: {
    name: string;
    subject: string;
    body: string;
    type: EmailTemplateType;
    createdBy: string;
  }): Promise<EmailTemplate> {
    // Extract variables from template
    const subjectVariables = await EmailTemplateModel.extractVariables(data.subject);
    const bodyVariables = await EmailTemplateModel.extractVariables(data.body);
    const allVariables = [...new Set([...subjectVariables, ...bodyVariables])];

    return EmailTemplateModel.create({
      name: data.name,
      subject: data.subject,
      body: data.body,
      type: data.type,
      variables: allVariables,
      isActive: true,
      createdBy: data.createdBy
    });
  }

  async updateEmailTemplate(
    templateId: string, 
    updates: Partial<{
      name: string;
      subject: string;
      body: string;
      type: EmailTemplateType;
      isActive: boolean;
    }>
  ): Promise<EmailTemplate> {
    const template = await EmailTemplateModel.findById(templateId);
    if (!template) {
      throw new NotFoundError('Email template not found');
    }

    // If subject or body is being updated, recalculate variables
    if (updates.subject || updates.body) {
      const subject = updates.subject || template.subject;
      const body = updates.body || template.body;
      
      const subjectVariables = await EmailTemplateModel.extractVariables(subject);
      const bodyVariables = await EmailTemplateModel.extractVariables(body);
      const allVariables = [...new Set([...subjectVariables, ...bodyVariables])];
      
      updates = { ...updates, variables: allVariables } as any;
    }

    const updatedTemplate = await EmailTemplateModel.update(templateId, updates);
    if (!updatedTemplate) {
      throw new NotFoundError('Failed to update email template');
    }

    return updatedTemplate;
  }

  async getEmailTemplate(templateId: string): Promise<EmailTemplate> {
    const template = await EmailTemplateModel.findById(templateId);
    if (!template) {
      throw new NotFoundError('Email template not found');
    }
    return template;
  }

  async getEmailTemplates(type?: EmailTemplateType, isActive?: boolean): Promise<EmailTemplate[]> {
    if (type) {
      return EmailTemplateModel.findByType(type, isActive);
    }
    return EmailTemplateModel.findAll(isActive);
  }

  async deleteEmailTemplate(templateId: string): Promise<boolean> {
    return EmailTemplateModel.delete(templateId);
  }

  // Email Sending
  async sendEmail(request: SendEmailRequest) {
    return this.emailService.sendEmail(request);
  }

  async sendTemplatedEmail(data: {
    leadId: string;
    templateId: string;
    variables?: Record<string, any>;
    sentBy: string;
    to?: string;
    cc?: string;
    bcc?: string;
  }) {
    return this.emailService.sendEmail({
      leadId: data.leadId,
      templateId: data.templateId,
      variables: data.variables,
      sentBy: data.sentBy,
      to: data.to,
      cc: data.cc,
      bcc: data.bcc
    });
  }

  // Communication History
  async logCommunication(data: {
    leadId: string;
    type: CommunicationType;
    direction: CommunicationDirection;
    subject?: string;
    content: string;
    metadata?: Record<string, any>;
    performedBy: string;
    performedAt?: Date;
    relatedTaskId?: string;
  }): Promise<CommunicationHistory> {
    return CommunicationHistoryModel.create({
      leadId: data.leadId,
      type: data.type,
      direction: data.direction,
      subject: data.subject,
      content: data.content,
      metadata: data.metadata || {},
      performedBy: data.performedBy,
      performedAt: data.performedAt || new Date(),
      relatedTaskId: data.relatedTaskId
    });
  }

  async getCommunicationHistory(leadId: string, limit?: number): Promise<CommunicationHistory[]> {
    return CommunicationHistoryModel.findByLeadId(leadId, limit);
  }

  async getCommunicationsByType(
    leadId: string, 
    type: CommunicationType, 
    direction?: CommunicationDirection,
    limit?: number
  ): Promise<CommunicationHistory[]> {
    return CommunicationHistoryModel.findByType(leadId, type, direction, limit);
  }

  async getCommunicationStats(leadId?: string, dateFrom?: Date, dateTo?: Date) {
    return CommunicationHistoryModel.getCommunicationStats(leadId, dateFrom, dateTo);
  }

  // Calendar Integration
  async scheduleFollowUp(data: {
    leadId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    organizer: string;
    createTask?: boolean;
  }): Promise<{ success: boolean; eventId?: string; taskId?: string; error?: string }> {
    try {
      let eventId: string | undefined;
      let taskId: string | undefined;

      // Create calendar event if integration is available
      if (this.calendarIntegration) {
        const eventResult = await this.calendarIntegration.createEvent({
          leadId: data.leadId,
          title: data.title,
          description: data.description,
          startTime: data.startTime,
          endTime: data.endTime,
          attendees: data.attendees,
          organizer: data.organizer
        });

        if (!eventResult.success) {
          return { success: false, error: eventResult.error || 'Calendar event creation failed' };
        }

        eventId = eventResult.eventId;
      }

      // Create follow-up task if requested
      if (data.createTask) {
        const task = await TaskService.createTask({
          leadId: data.leadId,
          subject: data.title,
          description: data.description,
          type: TaskType.MEETING,
          priority: Priority.MEDIUM,
          assignedTo: data.organizer,
          dueDate: data.startTime,
          status: TaskStatus.PENDING,
          reminders: [],
          createdBy: data.organizer
        });
        taskId = task.id;
      }

      // Log communication
      await this.logCommunication({
        leadId: data.leadId,
        type: CommunicationType.MEETING,
        direction: CommunicationDirection.OUTBOUND,
        subject: data.title,
        content: data.description || 'Meeting scheduled',
        metadata: {
          startTime: data.startTime,
          endTime: data.endTime,
          attendees: data.attendees,
          eventId,
          taskId
        },
        performedBy: data.organizer,
        relatedTaskId: taskId
      });

      return { success: true, eventId, taskId };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Email Processing
  async processInboundEmail(emailData: {
    from: string;
    to: string;
    subject: string;
    body: string;
    htmlBody?: string;
    messageId: string;
    inReplyTo?: string;
    references?: string;
    receivedAt: Date;
    attachments?: any[];
  }) {
    return this.emailService.processInboundEmail(emailData);
  }

  // Email Tracking
  async trackEmailOpen(messageId: string): Promise<boolean> {
    return this.emailService.trackEmailOpen(messageId);
  }

  async trackEmailClick(messageId: string): Promise<boolean> {
    return this.emailService.trackEmailClick(messageId);
  }

  // Bulk Operations
  async sendBulkEmails(requests: SendEmailRequest[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ success: boolean; emailLogId: string; error?: string }>;
  }> {
    const results = await Promise.all(
      requests.map(request => this.emailService.sendEmail(request))
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return { successful, failed, results };
  }

  async createFollowUpSequence(data: {
    leadId: string;
    templateIds: string[];
    intervals: number[]; // Days between emails
    startDate: Date;
    createdBy: string;
  }): Promise<Task[]> {
    if (data.templateIds.length !== data.intervals.length) {
      throw new ValidationError('Template IDs and intervals must have the same length');
    }

    const tasks: Task[] = [];
    let currentDate = new Date(data.startDate);

    for (let i = 0; i < data.templateIds.length; i++) {
      const templateId = data.templateIds[i];
      if (!templateId) {
        throw new ValidationError(`Template ID at index ${i} is undefined`);
      }

      const template = await EmailTemplateModel.findById(templateId);
      if (!template) {
        throw new NotFoundError(`Email template not found: ${templateId}`);
      }

      const task = await TaskService.createTask({
        leadId: data.leadId,
        subject: `Send follow-up email: ${template.name}`,
        description: `Send templated email using template: ${template.name}`,
        type: TaskType.EMAIL,
        priority: Priority.MEDIUM,
        assignedTo: data.createdBy,
        dueDate: new Date(currentDate),
        status: TaskStatus.PENDING,
        reminders: [],
        createdBy: data.createdBy
      });

      tasks.push(task);

      // Add interval for next email
      const interval = data.intervals[i];
      if (interval !== undefined) {
        currentDate = new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000);
      }
    }

    return tasks;
  }

  // Analytics
  async getEmailMetrics(leadId?: string, dateFrom?: Date, dateTo?: Date) {
    return this.emailService.getEmailStats(leadId, dateFrom, dateTo);
  }

  async getCommunicationMetrics(leadId?: string, dateFrom?: Date, dateTo?: Date) {
    return this.getCommunicationStats(leadId, dateFrom, dateTo);
  }
}