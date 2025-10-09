import { CommunicationService } from '../src/services/communicationService';
import { EmailTemplateType, CommunicationType, CommunicationDirection } from '../src/types';

// Mock the models and dependencies
jest.mock('../src/models/EmailTemplate');
jest.mock('../src/models/EmailLog');
jest.mock('../src/models/CommunicationHistory');
jest.mock('../src/models/Lead');
jest.mock('../src/models/User');
jest.mock('../src/services/taskService');
jest.mock('nodemailer');

describe('CommunicationService', () => {
  let communicationService: CommunicationService;
  
  const mockEmailConfig = {
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    auth: {
      user: 'test@test.com',
      pass: 'password'
    }
  };

  beforeEach(() => {
    communicationService = new CommunicationService({ email: mockEmailConfig });
  });

  describe('Email Template Management', () => {
    it('should create email template with extracted variables', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Welcome Email',
        subject: 'Welcome {{lead_name}}!',
        body: 'Hello {{lead_name}}, welcome to {{company_name}}!',
        type: EmailTemplateType.WELCOME,
        variables: ['lead_name', 'company_name'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1'
      };

      const { EmailTemplateModel } = require('../src/models/EmailTemplate');
      EmailTemplateModel.extractVariables = jest.fn()
        .mockResolvedValueOnce(['lead_name'])
        .mockResolvedValueOnce(['lead_name', 'company_name']);
      EmailTemplateModel.create = jest.fn().mockResolvedValue(mockTemplate);

      const result = await communicationService.createEmailTemplate({
        name: 'Welcome Email',
        subject: 'Welcome {{lead_name}}!',
        body: 'Hello {{lead_name}}, welcome to {{company_name}}!',
        type: EmailTemplateType.WELCOME,
        createdBy: 'user-1'
      });

      expect(EmailTemplateModel.extractVariables).toHaveBeenCalledTimes(2);
      expect(EmailTemplateModel.create).toHaveBeenCalledWith({
        name: 'Welcome Email',
        subject: 'Welcome {{lead_name}}!',
        body: 'Hello {{lead_name}}, welcome to {{company_name}}!',
        type: EmailTemplateType.WELCOME,
        variables: ['lead_name', 'company_name'],
        isActive: true,
        createdBy: 'user-1'
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should get email templates by type', async () => {
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

      const result = await communicationService.getEmailTemplates(EmailTemplateType.WELCOME, true);

      expect(EmailTemplateModel.findByType).toHaveBeenCalledWith(EmailTemplateType.WELCOME, true);
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('Communication History', () => {
    it('should log communication', async () => {
      const mockCommunication = {
        id: 'comm-1',
        leadId: 'lead-1',
        type: CommunicationType.EMAIL,
        direction: CommunicationDirection.OUTBOUND,
        subject: 'Test Email',
        content: 'Test content',
        metadata: {},
        performedBy: 'user-1',
        performedAt: new Date()
      };

      const { CommunicationHistoryModel } = require('../src/models/CommunicationHistory');
      CommunicationHistoryModel.create = jest.fn().mockResolvedValue(mockCommunication);

      const result = await communicationService.logCommunication({
        leadId: 'lead-1',
        type: CommunicationType.EMAIL,
        direction: CommunicationDirection.OUTBOUND,
        subject: 'Test Email',
        content: 'Test content',
        performedBy: 'user-1'
      });

      expect(CommunicationHistoryModel.create).toHaveBeenCalledWith({
        leadId: 'lead-1',
        type: CommunicationType.EMAIL,
        direction: CommunicationDirection.OUTBOUND,
        subject: 'Test Email',
        content: 'Test content',
        metadata: {},
        performedBy: 'user-1',
        performedAt: expect.any(Date)
      });
      expect(result).toEqual(mockCommunication);
    });

    it('should get communication history for lead', async () => {
      const mockHistory = [
        {
          id: 'comm-1',
          leadId: 'lead-1',
          type: CommunicationType.EMAIL,
          performedAt: new Date()
        }
      ];

      const { CommunicationHistoryModel } = require('../src/models/CommunicationHistory');
      CommunicationHistoryModel.findByLeadId = jest.fn().mockResolvedValue(mockHistory);

      const result = await communicationService.getCommunicationHistory('lead-1', 50);

      expect(CommunicationHistoryModel.findByLeadId).toHaveBeenCalledWith('lead-1', 50);
      expect(result).toEqual(mockHistory);
    });
  });

  describe('Follow-up Scheduling', () => {
    it('should schedule follow-up without calendar integration', async () => {
      const mockCommunication = {
        id: 'comm-1',
        leadId: 'lead-1',
        type: CommunicationType.MEETING
      };

      const { CommunicationHistoryModel } = require('../src/models/CommunicationHistory');
      CommunicationHistoryModel.create = jest.fn().mockResolvedValue(mockCommunication);

      const result = await communicationService.scheduleFollowUp({
        leadId: 'lead-1',
        title: 'Follow-up Meeting',
        description: 'Discuss proposal',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        attendees: ['user-1', 'user-2'],
        organizer: 'user-1',
        createTask: false
      });

      expect(result.success).toBe(true);
      expect(result.eventId).toBeUndefined(); // No calendar integration
      expect(CommunicationHistoryModel.create).toHaveBeenCalled();
    });

    it('should create task when requested', async () => {
      const mockTask = {
        id: 'task-1',
        leadId: 'lead-1',
        subject: 'Follow-up Meeting'
      };

      const mockCommunication = {
        id: 'comm-1',
        leadId: 'lead-1',
        type: CommunicationType.MEETING
      };

      const { TaskService } = require('../src/services/taskService');
      const mockTaskService = {
        createTask: jest.fn().mockResolvedValue(mockTask)
      };
      
      // Mock the TaskService constructor
      TaskService.mockImplementation(() => mockTaskService);

      const { CommunicationHistoryModel } = require('../src/models/CommunicationHistory');
      CommunicationHistoryModel.create = jest.fn().mockResolvedValue(mockCommunication);

      const result = await communicationService.scheduleFollowUp({
        leadId: 'lead-1',
        title: 'Follow-up Meeting',
        description: 'Discuss proposal',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        attendees: ['user-1', 'user-2'],
        organizer: 'user-1',
        createTask: true
      });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-1');
      expect(mockTaskService.createTask).toHaveBeenCalled();
    });
  });

  describe('Follow-up Sequences', () => {
    it('should create follow-up sequence with multiple templates', async () => {
      const mockTemplates = [
        { id: 'template-1', name: 'First Follow-up' },
        { id: 'template-2', name: 'Second Follow-up' }
      ];

      const mockTasks = [
        { id: 'task-1', subject: 'Send follow-up email: First Follow-up' },
        { id: 'task-2', subject: 'Send follow-up email: Second Follow-up' }
      ];

      const { EmailTemplateModel } = require('../src/models/EmailTemplate');
      EmailTemplateModel.findById = jest.fn()
        .mockResolvedValueOnce(mockTemplates[0])
        .mockResolvedValueOnce(mockTemplates[1]);

      const { TaskService } = require('../src/services/taskService');
      const mockTaskService = {
        createTask: jest.fn()
          .mockResolvedValueOnce(mockTasks[0])
          .mockResolvedValueOnce(mockTasks[1])
      };
      TaskService.mockImplementation(() => mockTaskService);

      const result = await communicationService.createFollowUpSequence({
        leadId: 'lead-1',
        templateIds: ['template-1', 'template-2'],
        intervals: [1, 3], // 1 day, then 3 days
        startDate: new Date('2024-01-15'),
        createdBy: 'user-1'
      });

      expect(result).toHaveLength(2);
      expect(mockTaskService.createTask).toHaveBeenCalledTimes(2);
      expect(EmailTemplateModel.findById).toHaveBeenCalledTimes(2);
    });

    it('should throw error for mismatched template and interval arrays', async () => {
      await expect(
        communicationService.createFollowUpSequence({
          leadId: 'lead-1',
          templateIds: ['template-1', 'template-2'],
          intervals: [1], // Mismatched length
          startDate: new Date('2024-01-15'),
          createdBy: 'user-1'
        })
      ).rejects.toThrow('Template IDs and intervals must have the same length');
    });
  });
});