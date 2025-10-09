import { Request, Response } from 'express';
import { CommunicationService } from '../services/communicationService';
import { EmailTemplateType, CommunicationType, CommunicationDirection } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';

export class CommunicationController {
  private communicationService: CommunicationService;

  constructor(communicationService: CommunicationService) {
    this.communicationService = communicationService;
  }

  // Email Templates
  createEmailTemplate = async (req: Request, res: Response) => {
    try {
      const { name, subject, body, type } = req.body;
      const createdBy = req.user?.id;

      if (!name || !subject || !body || !type || !createdBy) {
        return res.status(400).json({
          error: 'Name, subject, body, type, and createdBy are required'
        });
      }

      const template = await this.communicationService.createEmailTemplate({
        name,
        subject,
        body,
        type: type as EmailTemplateType,
        createdBy
      });

      res.status(201).json(template);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create email template' });
      }
    }
  };

  getEmailTemplates = async (req: Request, res: Response) => {
    try {
      const { type, isActive } = req.query;
      
      const templates = await this.communicationService.getEmailTemplates(
        type as EmailTemplateType,
        isActive !== undefined ? isActive === 'true' : undefined
      );

      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch email templates' });
    }
  };

  getEmailTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;
      const template = await this.communicationService.getEmailTemplate(templateId);
      res.json(template);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch email template' });
      }
    }
  };

  updateEmailTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;
      const updates = req.body;

      const template = await this.communicationService.updateEmailTemplate(templateId, updates);
      res.json(template);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update email template' });
      }
    }
  };

  deleteEmailTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;
      const success = await this.communicationService.deleteEmailTemplate(templateId);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Email template not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete email template' });
    }
  };

  // Email Sending
  sendEmail = async (req: Request, res: Response) => {
    try {
      const { leadId, templateId, to, cc, bcc, subject, body, variables } = req.body;
      const sentBy = req.user?.id;

      if (!leadId || !sentBy) {
        return res.status(400).json({
          error: 'Lead ID and sender are required'
        });
      }

      const result = await this.communicationService.sendEmail({
        leadId,
        templateId,
        to,
        cc,
        bcc,
        subject,
        body,
        variables,
        sentBy
      });

      if (result.success) {
        res.json({
          success: true,
          emailLogId: result.emailLogId,
          messageId: result.messageId
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to send email' });
    }
  };

  sendTemplatedEmail = async (req: Request, res: Response) => {
    try {
      const { leadId, templateId, variables, to, cc, bcc } = req.body;
      const sentBy = req.user?.id;

      if (!leadId || !templateId || !sentBy) {
        return res.status(400).json({
          error: 'Lead ID, template ID, and sender are required'
        });
      }

      const result = await this.communicationService.sendTemplatedEmail({
        leadId,
        templateId,
        variables,
        sentBy,
        to,
        cc,
        bcc
      });

      if (result.success) {
        res.json({
          success: true,
          emailLogId: result.emailLogId,
          messageId: result.messageId
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to send templated email' });
    }
  };

  // Communication History
  getCommunicationHistory = async (req: Request, res: Response) => {
    try {
      const { leadId } = req.params;
      const { limit } = req.query;

      const history = await this.communicationService.getCommunicationHistory(
        leadId,
        limit ? parseInt(limit as string) : undefined
      );

      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch communication history' });
    }
  };

  logCommunication = async (req: Request, res: Response) => {
    try {
      const { leadId, type, direction, subject, content, metadata, relatedTaskId } = req.body;
      const performedBy = req.user?.id;

      if (!leadId || !type || !direction || !content || !performedBy) {
        return res.status(400).json({
          error: 'Lead ID, type, direction, content, and performer are required'
        });
      }

      const communication = await this.communicationService.logCommunication({
        leadId,
        type: type as CommunicationType,
        direction: direction as CommunicationDirection,
        subject,
        content,
        metadata,
        performedBy,
        relatedTaskId
      });

      res.status(201).json(communication);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to log communication' });
    }
  };

  getCommunicationsByType = async (req: Request, res: Response) => {
    try {
      const { leadId } = req.params;
      const { type, direction, limit } = req.query;

      if (!type) {
        return res.status(400).json({ error: 'Communication type is required' });
      }

      const communications = await this.communicationService.getCommunicationsByType(
        leadId,
        type as CommunicationType,
        direction as CommunicationDirection,
        limit ? parseInt(limit as string) : undefined
      );

      res.json(communications);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch communications by type' });
    }
  };

  // Calendar Integration
  scheduleFollowUp = async (req: Request, res: Response) => {
    try {
      const { leadId, title, description, startTime, endTime, attendees, createTask } = req.body;
      const organizer = req.user?.id;

      if (!leadId || !title || !startTime || !endTime || !organizer) {
        return res.status(400).json({
          error: 'Lead ID, title, start time, end time, and organizer are required'
        });
      }

      const result = await this.communicationService.scheduleFollowUp({
        leadId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        attendees: attendees || [],
        organizer,
        createTask: createTask || false
      });

      if (result.success) {
        res.json({
          success: true,
          eventId: result.eventId,
          taskId: result.taskId
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to schedule follow-up' });
    }
  };

  // Email Processing
  processInboundEmail = async (req: Request, res: Response) => {
    try {
      const emailData = req.body;

      if (!emailData.from || !emailData.to || !emailData.subject || !emailData.body || !emailData.messageId) {
        return res.status(400).json({
          error: 'From, to, subject, body, and messageId are required'
        });
      }

      const result = await this.communicationService.processInboundEmail({
        ...emailData,
        receivedAt: emailData.receivedAt ? new Date(emailData.receivedAt) : new Date()
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to process inbound email' });
    }
  };

  // Email Tracking
  trackEmailOpen = async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const success = await this.communicationService.trackEmailOpen(messageId);
      
      // Return a 1x1 transparent pixel for email tracking
      res.set({
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // 1x1 transparent GIF
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.send(pixel);
    } catch (error: any) {
      res.status(500).send();
    }
  };

  trackEmailClick = async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const { url } = req.query;

      await this.communicationService.trackEmailClick(messageId);
      
      if (url) {
        res.redirect(url as string);
      } else {
        res.json({ success: true });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to track email click' });
    }
  };

  // Bulk Operations
  sendBulkEmails = async (req: Request, res: Response) => {
    try {
      const { requests } = req.body;
      const sentBy = req.user?.id;

      if (!requests || !Array.isArray(requests) || !sentBy) {
        return res.status(400).json({
          error: 'Requests array and sender are required'
        });
      }

      // Add sentBy to all requests
      const requestsWithSender = requests.map(req => ({ ...req, sentBy }));

      const result = await this.communicationService.sendBulkEmails(requestsWithSender);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to send bulk emails' });
    }
  };

  createFollowUpSequence = async (req: Request, res: Response) => {
    try {
      const { leadId, templateIds, intervals, startDate } = req.body;
      const createdBy = req.user?.id;

      if (!leadId || !templateIds || !intervals || !startDate || !createdBy) {
        return res.status(400).json({
          error: 'Lead ID, template IDs, intervals, start date, and creator are required'
        });
      }

      const tasks = await this.communicationService.createFollowUpSequence({
        leadId,
        templateIds,
        intervals,
        startDate: new Date(startDate),
        createdBy
      });

      res.status(201).json(tasks);
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create follow-up sequence' });
      }
    }
  };

  // Analytics
  getEmailMetrics = async (req: Request, res: Response) => {
    try {
      const { leadId, dateFrom, dateTo } = req.query;

      const metrics = await this.communicationService.getEmailMetrics(
        leadId as string,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch email metrics' });
    }
  };

  getCommunicationMetrics = async (req: Request, res: Response) => {
    try {
      const { leadId, dateFrom, dateTo } = req.query;

      const metrics = await this.communicationService.getCommunicationMetrics(
        leadId as string,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch communication metrics' });
    }
  };

  getCommunicationStats = async (req: Request, res: Response) => {
    try {
      const { leadId, dateFrom, dateTo } = req.query;

      const stats = await this.communicationService.getCommunicationStats(
        leadId as string,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch communication stats' });
    }
  };
}