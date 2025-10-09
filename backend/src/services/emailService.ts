import nodemailer from 'nodemailer';
import { EmailTemplateModel } from '../models/EmailTemplate';
import { EmailLogModel } from '../models/EmailLog';
import { CommunicationHistoryModel } from '../models/CommunicationHistory';
import { LeadModel } from '../models/Lead';
import { UserModel } from '../models/User';
import { 
  EmailTemplate, 
  EmailLog, 
  EmailStatus, 
  EmailTemplateType,
  CommunicationType,
  CommunicationDirection,
  Lead,
  User
} from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface SendEmailRequest {
  leadId: string;
  templateId?: string;
  to?: string | undefined;
  cc?: string | undefined;
  bcc?: string | undefined;
  subject?: string;
  body?: string;
  variables?: Record<string, any>;
  sentBy: string;
}

export interface EmailSendResult {
  success: boolean;
  emailLogId: string;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    });
  }

  async sendEmail(request: SendEmailRequest): Promise<EmailSendResult> {
    try {
      // Validate request
      await this.validateSendRequest(request);

      // Get lead information
      const lead = await LeadModel.findById(request.leadId);
      if (!lead) {
        throw new NotFoundError('Lead not found');
      }

      // Get sender information
      const sender = await UserModel.findById(request.sentBy);
      if (!sender) {
        throw new NotFoundError('Sender not found');
      }

      let subject = request.subject;
      let body = request.body;
      let templateId = request.templateId;

      // If template is specified, render it
      if (request.templateId) {
        const template = await EmailTemplateModel.findById(request.templateId);
        if (!template) {
          throw new NotFoundError('Email template not found');
        }

        const variables = this.buildTemplateVariables(lead, sender, request.variables || {});
        subject = await EmailTemplateModel.renderTemplate(template.subject, variables);
        body = await EmailTemplateModel.renderTemplate(template.body, variables);
      }

      if (!subject || !body) {
        throw new ValidationError('Subject and body are required');
      }

      const toEmail = request.to || lead.contact.email;

      // Create email log entry
      const emailLog = await EmailLogModel.create({
        leadId: request.leadId,
        templateId,
        to: toEmail,
        cc: request.cc,
        bcc: request.bcc,
        subject,
        body,
        status: EmailStatus.QUEUED,
        sentBy: request.sentBy
      });

      try {
        // Send email
        const info = await this.transporter.sendMail({
          from: this.config.auth.user,
          to: toEmail,
          cc: request.cc,
          bcc: request.bcc,
          subject,
          html: body,
          text: this.stripHtml(body)
        });

        // Update email log with success
        await EmailLogModel.updateStatus(emailLog.id, EmailStatus.SENT, {
          sentAt: new Date(),
          messageId: info.messageId
        });

        // Log communication history
        await CommunicationHistoryModel.create({
          leadId: request.leadId,
          type: CommunicationType.EMAIL,
          direction: CommunicationDirection.OUTBOUND,
          subject,
          content: body,
          metadata: {
            to: toEmail,
            cc: request.cc,
            bcc: request.bcc,
            messageId: info.messageId,
            templateId
          },
          performedBy: request.sentBy,
          performedAt: new Date(),
          relatedEmailId: emailLog.id
        });

        return {
          success: true,
          emailLogId: emailLog.id,
          messageId: info.messageId
        };

      } catch (sendError: any) {
        // Update email log with failure
        await EmailLogModel.updateStatus(emailLog.id, EmailStatus.FAILED, {
          errorMessage: sendError.message
        });

        return {
          success: false,
          emailLogId: emailLog.id,
          error: sendError.message
        };
      }

    } catch (error: any) {
      return {
        success: false,
        emailLogId: '',
        error: error.message
      };
    }
  }

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
  }): Promise<{ success: boolean; leadId?: string; error?: string }> {
    try {
      // Check if email already exists
      const existingEmail = await this.findInboundEmailByMessageId(emailData.messageId);
      if (existingEmail) {
        return { success: true, leadId: existingEmail.leadId };
      }

      // Try to find associated lead
      const leadId = await this.findLeadByEmail(emailData.from);

      // Create inbound email record
      const { InboundEmailModel } = await import('../models/InboundEmail');
      const inboundEmail = await InboundEmailModel.create({
        leadId,
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        htmlBody: emailData.htmlBody,
        messageId: emailData.messageId,
        inReplyTo: emailData.inReplyTo,
        references: emailData.references,
        receivedAt: emailData.receivedAt,
        processed: !!leadId,
        processedAt: leadId ? new Date() : undefined,
        attachments: emailData.attachments
      });

      // If lead found, log communication history
      if (leadId) {
        await CommunicationHistoryModel.create({
          leadId,
          type: CommunicationType.EMAIL,
          direction: CommunicationDirection.INBOUND,
          subject: emailData.subject,
          content: emailData.body,
          metadata: {
            from: emailData.from,
            to: emailData.to,
            messageId: emailData.messageId,
            inReplyTo: emailData.inReplyTo,
            hasAttachments: !!emailData.attachments?.length
          },
          performedBy: leadId, // Using leadId as performer for inbound emails
          performedAt: emailData.receivedAt
        });

        // Update email log if this is a reply
        if (emailData.inReplyTo) {
          const originalEmail = await EmailLogModel.findByMessageId(emailData.inReplyTo);
          if (originalEmail) {
            await EmailLogModel.updateStatus(originalEmail.id, EmailStatus.REPLIED, {
              repliedAt: emailData.receivedAt
            });
          }
        }
      }

      return { success: true, leadId };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getEmailHistory(leadId: string, limit: number = 50): Promise<EmailLog[]> {
    return EmailLogModel.findByLeadId(leadId, limit);
  }

  async getEmailStats(leadId?: string, dateFrom?: Date, dateTo?: Date) {
    return EmailLogModel.getEmailStats(leadId, dateFrom, dateTo);
  }

  async trackEmailOpen(messageId: string): Promise<boolean> {
    try {
      const emailLog = await EmailLogModel.findByMessageId(messageId);
      if (emailLog && !emailLog.openedAt) {
        await EmailLogModel.updateStatus(emailLog.id, EmailStatus.OPENED, {
          openedAt: new Date()
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async trackEmailClick(messageId: string): Promise<boolean> {
    try {
      const emailLog = await EmailLogModel.findByMessageId(messageId);
      if (emailLog && !emailLog.clickedAt) {
        await EmailLogModel.updateStatus(emailLog.id, EmailStatus.CLICKED, {
          clickedAt: new Date()
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async validateSendRequest(request: SendEmailRequest): Promise<void> {
    if (!request.leadId) {
      throw new ValidationError('Lead ID is required');
    }

    if (!request.sentBy) {
      throw new ValidationError('Sender ID is required');
    }

    if (!request.templateId && (!request.subject || !request.body)) {
      throw new ValidationError('Either template ID or subject and body are required');
    }
  }

  private buildTemplateVariables(lead: Lead, sender: User, customVariables: Record<string, any>): Record<string, any> {
    return {
      // Lead variables
      lead_name: lead.contact.name,
      lead_email: lead.contact.email,
      lead_phone: lead.contact.phone,
      lead_mobile: lead.contact.mobile,
      company_name: lead.company.name,
      company_industry: lead.company.industry,
      lead_status: lead.status,
      lead_score: lead.score.value,
      
      // Sender variables
      sender_name: `${sender.firstName} ${sender.lastName}`,
      sender_email: sender.email,
      sender_phone: sender.profile.phone,
      sender_department: sender.profile.department,
      
      // System variables
      current_date: new Date().toLocaleDateString(),
      current_time: new Date().toLocaleTimeString(),
      
      // Custom variables
      ...customVariables
    };
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private async findLeadByEmail(email: string): Promise<string | undefined> {
    try {
      const leads = await LeadModel.searchLeads({
        email,
        limit: 1,
        offset: 0
      });
      return leads.leads.length > 0 ? leads.leads[0].id : undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async findInboundEmailByMessageId(messageId: string) {
    try {
      const { InboundEmailModel } = await import('../models/InboundEmail');
      return await InboundEmailModel.findByMessageId(messageId);
    } catch (error) {
      return null;
    }
  }
}