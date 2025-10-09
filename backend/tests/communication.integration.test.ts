import request from 'supertest';
import { app } from '../src/index';
import { EmailTemplateType, CommunicationType, CommunicationDirection } from '../src/types';

// Mock the database and external services
jest.mock('../src/config/database');
jest.mock('nodemailer');

describe('Communication API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let leadId: string;

  beforeAll(async () => {
    // Mock authentication
    userId = 'test-user-id';
    leadId = 'test-lead-id';
    authToken = 'mock-jwt-token';

    // Mock the auth middleware to return our test user
    jest.doMock('../src/middleware/auth', () => ({
      auth: (req: any, res: any, next: any) => {
        req.user = { id: userId, email: 'test@example.com' };
        next();
      }
    }));
  });

  describe('Email Templates', () => {
    describe('POST /api/communication/templates', () => {
      it('should create email template', async () => {
        const templateData = {
          name: 'Welcome Email',
          subject: 'Welcome {{lead_name}}!',
          body: 'Hello {{lead_name}}, welcome to our service!',
          type: EmailTemplateType.WELCOME
        };

        const mockTemplate = {
          id: 'template-1',
          ...templateData,
          variables: ['lead_name'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId
        };

        // Mock the service methods
        const { EmailTemplateModel } = require('../src/models/EmailTemplate');
        EmailTemplateModel.extractVariables = jest.fn().mockResolvedValue(['lead_name']);
        EmailTemplateModel.create = jest.fn().mockResolvedValue(mockTemplate);

        const response = await request(app)
          .post('/api/communication/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .send(templateData)
          .expect(201);

        expect(response.body).toMatchObject({
          id: 'template-1',
          name: 'Welcome Email',
          type: EmailTemplateType.WELCOME,
          variables: ['lead_name']
        });
      });

      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/communication/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Incomplete Template'
            // Missing subject, body, type
          })
          .expect(400);

        expect(response.body.error).toContain('required');
      });
    });

    describe('GET /api/communication/templates', () => {
      it('should get all email templates', async () => {
        const mockTemplates = [
          {
            id: 'template-1',
            name: 'Welcome Email',
            type: EmailTemplateType.WELCOME,
            isActive: true
          },
          {
            id: 'template-2',
            name: 'Follow-up Email',
            type: EmailTemplateType.FOLLOW_UP,
            isActive: true
          }
        ];

        const { EmailTemplateModel } = require('../src/models/EmailTemplate');
        EmailTemplateModel.findAll = jest.fn().mockResolvedValue(mockTemplates);

        const response = await request(app)
          .get('/api/communication/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0].name).toBe('Welcome Email');
      });

      it('should filter templates by type', async () => {
        const mockTemplates = [
          {
            id: 'template-1',
            name: 'Welcome Email',
            type: EmailTemplateType.WELCOME,
            isActive: true
          }
        ];

        const { EmailTemplateModel } = require('../src/models/EmailTemplate');
        EmailTemplateModel.findByType = jest.fn().mockResolvedValue(mockTemplates);

        const response = await request(app)
          .get('/api/communication/templates?type=welcome')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].type).toBe(EmailTemplateType.WELCOME);
      });
    });
  });

  describe('Email Sending', () => {
    describe('POST /api/communication/emails/send', () => {
      it('should send email successfully', async () => {
        const emailData = {
          leadId,
          subject: 'Test Email',
          body: 'This is a test email',
          to: 'test@example.com'
        };

        // Mock the email service
        const mockResult = {
          success: true,
          emailLogId: 'email-log-1',
          messageId: 'msg-123'
        };

        // Mock the service dependencies
        const { LeadModel } = require('../src/models/Lead');
        const { UserModel } = require('../src/models/User');
        const { EmailLogModel } = require('../src/models/EmailLog');
        const { CommunicationHistoryModel } = require('../src/models/CommunicationHistory');

        LeadModel.findById = jest.fn().mockResolvedValue({
          id: leadId,
          contact: { email: 'lead@example.com', name: 'Test Lead' }
        });
        UserModel.findById = jest.fn().mockResolvedValue({
          id: userId,
          firstName: 'Test',
          lastName: 'User'
        });
        EmailLogModel.create = jest.fn().mockResolvedValue({
          id: 'email-log-1',
          status: 'queued'
        });
        EmailLogModel.updateStatus = jest.fn().mockResolvedValue({});
        CommunicationHistoryModel.create = jest.fn().mockResolvedValue({});

        // Mock nodemailer
        const nodemailer = require('nodemailer');
        const mockTransporter = {
          sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' })
        };
        nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);

        const response = await request(app)
          .post('/api/communication/emails/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send(emailData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.emailLogId).toBe('email-log-1');
      });

      it('should return 400 for missing lead ID', async () => {
        const response = await request(app)
          .post('/api/communication/emails/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subject: 'Test Email',
            body: 'This is a test email'
            // Missing leadId
          })
          .expect(400);

        expect(response.body.error).toContain('Lead ID');
      });
    });

    describe('POST /api/communication/emails/send-templated', () => {
      it('should send templated email', async () => {
        const emailData = {
          leadId,
          templateId: 'template-1',
          variables: {
            lead_name: 'John Doe',
            company_name: 'Test Company'
          }
        };

        // Mock dependencies
        const { LeadModel } = require('../src/models/Lead');
        const { UserModel } = require('../src/models/User');
        const { EmailTemplateModel } = require('../src/models/EmailTemplate');
        const { EmailLogModel } = require('../src/models/EmailLog');
        const { CommunicationHistoryModel } = require('../src/models/CommunicationHistory');

        LeadModel.findById = jest.fn().mockResolvedValue({
          id: leadId,
          contact: { email: 'lead@example.com', name: 'John Doe' }
        });
        UserModel.findById = jest.fn().mockResolvedValue({
          id: userId,
          firstName: 'Test',
          lastName: 'User'
        });
        EmailTemplateModel.findById = jest.fn().mockResolvedValue({
          id: 'template-1',
          subject: 'Welcome {{lead_name}}!',
          body: 'Hello {{lead_name}} from {{company_name}}!'
        });
        EmailTemplateModel.renderTemplate = jest.fn()
          .mockResolvedValueOnce('Welcome John Doe!')
          .mockResolvedValueOnce('Hello John Doe from Test Company!');
        EmailLogModel.create = jest.fn().mockResolvedValue({
          id: 'email-log-1'
        });
        EmailLogModel.updateStatus = jest.fn().mockResolvedValue({});
        CommunicationHistoryModel.create = jest.fn().mockResolvedValue({});

        // Mock nodemailer
        const nodemailer = require('nodemailer');
        const mockTransporter = {
          sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' })
        };
        nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);

        const response = await request(app)
          .post('/api/communication/emails/send-templated')
          .set('Authorization', `Bearer ${authToken}`)
          .send(emailData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(EmailTemplateModel.renderTemplate).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Communication History', () => {
    describe('GET /api/communication/history/:leadId', () => {
      it('should get communication history for lead', async () => {
        const mockHistory = [
          {
            id: 'comm-1',
            leadId,
            type: CommunicationType.EMAIL,
            direction: CommunicationDirection.OUTBOUND,
            subject: 'Welcome Email',
            performedAt: new Date()
          },
          {
            id: 'comm-2',
            leadId,
            type: CommunicationType.PHONE,
            direction: CommunicationDirection.INBOUND,
            subject: 'Follow-up Call',
            performedAt: new Date()
          }
        ];

        const { CommunicationHistoryModel } = require('../src/models/CommunicationHistory');
        CommunicationHistoryModel.findByLeadId = jest.fn().mockResolvedValue(mockHistory);

        const response = await request(app)
          .get(`/api/communication/history/${leadId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0].type).toBe(CommunicationType.EMAIL);
        expect(response.body[1].type).toBe(CommunicationType.PHONE);
      });
    });

    describe('POST /api/communication/history', () => {
      it('should log communication', async () => {
        const communicationData = {
          leadId,
          type: CommunicationType.PHONE,
          direction: CommunicationDirection.OUTBOUND,
          subject: 'Follow-up Call',
          content: 'Discussed pricing and next steps',
          metadata: {
            duration: 300,
            outcome: 'positive'
          }
        };

        const mockCommunication = {
          id: 'comm-1',
          ...communicationData,
          performedBy: userId,
          performedAt: new Date()
        };

        const { CommunicationHistoryModel } = require('../src/models/CommunicationHistory');
        CommunicationHistoryModel.create = jest.fn().mockResolvedValue(mockCommunication);

        const response = await request(app)
          .post('/api/communication/history')
          .set('Authorization', `Bearer ${authToken}`)
          .send(communicationData)
          .expect(201);

        expect(response.body.id).toBe('comm-1');
        expect(response.body.type).toBe(CommunicationType.PHONE);
        expect(CommunicationHistoryModel.create).toHaveBeenCalledWith({
          ...communicationData,
          performedBy: userId,
          performedAt: expect.any(Date)
        });
      });
    });
  });

  describe('Follow-up Scheduling', () => {
    describe('POST /api/communication/schedule', () => {
      it('should schedule follow-up meeting', async () => {
        const scheduleData = {
          leadId,
          title: 'Product Demo',
          description: 'Demonstrate key features',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          attendees: ['user-1', 'user-2'],
          createTask: true
        };

        const mockTask = {
          id: 'task-1',
          subject: 'Product Demo'
        };

        const mockCommunication = {
          id: 'comm-1',
          type: CommunicationType.MEETING
        };

        const { TaskService } = require('../src/services/taskService');
        const mockTaskService = {
          createTask: jest.fn().mockResolvedValue(mockTask)
        };
        TaskService.mockImplementation(() => mockTaskService);

        const { CommunicationHistoryModel } = require('../src/models/CommunicationHistory');
        CommunicationHistoryModel.create = jest.fn().mockResolvedValue(mockCommunication);

        const response = await request(app)
          .post('/api/communication/schedule')
          .set('Authorization', `Bearer ${authToken}`)
          .send(scheduleData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.taskId).toBe('task-1');
        expect(mockTaskService.createTask).toHaveBeenCalled();
      });
    });
  });

  describe('Email Tracking', () => {
    describe('GET /api/communication/emails/track/open/:messageId', () => {
      it('should track email open and return tracking pixel', async () => {
        const messageId = 'msg-123';

        const { EmailLogModel } = require('../src/models/EmailLog');
        EmailLogModel.findByMessageId = jest.fn().mockResolvedValue({
          id: 'email-log-1',
          openedAt: null
        });
        EmailLogModel.updateStatus = jest.fn().mockResolvedValue({});

        const response = await request(app)
          .get(`/api/communication/emails/track/open/${messageId}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('image/gif');
        expect(EmailLogModel.updateStatus).toHaveBeenCalled();
      });
    });

    describe('GET /api/communication/emails/track/click/:messageId', () => {
      it('should track email click and redirect', async () => {
        const messageId = 'msg-123';
        const redirectUrl = 'https://example.com';

        const { EmailLogModel } = require('../src/models/EmailLog');
        EmailLogModel.findByMessageId = jest.fn().mockResolvedValue({
          id: 'email-log-1',
          clickedAt: null
        });
        EmailLogModel.updateStatus = jest.fn().mockResolvedValue({});

        const response = await request(app)
          .get(`/api/communication/emails/track/click/${messageId}?url=${encodeURIComponent(redirectUrl)}`)
          .expect(302);

        expect(response.headers.location).toBe(redirectUrl);
        expect(EmailLogModel.updateStatus).toHaveBeenCalled();
      });
    });
  });
});