import { ActivityService, ActivityFilter } from '../src/services/activityService';
import { Activity } from '../src/models/Activity';
import { ActivityType as ActivityTypeEnum } from '../src/types';
import { ValidationError, NotFoundError } from '../src/utils/errors';

// Mock the models
jest.mock('../src/models/Activity');

const MockedActivity = Activity as jest.Mocked<typeof Activity>;

describe('ActivityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createActivity', () => {
    const mockActivityData = {
      leadId: 'lead-123',
      type: ActivityTypeEnum.NOTE_ADDED,
      subject: 'Added a note',
      details: { note: 'This is a test note with @user-456 mention' },
      performedBy: 'user-123',
      performedAt: new Date()
    };

    const mockDbActivity = {
      id: 'activity-123',
      lead_id: 'lead-123',
      type: 'note_added',
      subject: 'Added a note',
      details: '{"note":"This is a test note with @user-456 mention"}',
      performed_by: 'user-123',
      performed_at: new Date(),
      related_entities: null
    };

    it('should create activity successfully', async () => {
      MockedActivity.createActivity.mockResolvedValue(mockDbActivity);
      MockedActivity.transformToActivityType.mockReturnValue({
        id: 'activity-123',
        leadId: 'lead-123',
        type: ActivityTypeEnum.NOTE_ADDED,
        subject: 'Added a note',
        details: { note: 'This is a test note with @user-456 mention' },
        performedBy: 'user-123',
        performedAt: new Date()
      });

      const result = await ActivityService.createActivity(mockActivityData);

      expect(MockedActivity.createActivity).toHaveBeenCalledWith(mockActivityData);
      expect(result.id).toBe('activity-123');
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = { ...mockActivityData, subject: '' };

      await expect(ActivityService.createActivity(invalidData)).rejects.toThrow(ValidationError);
    });
  });

  describe('getActivityById', () => {
    it('should return activity when found', async () => {
      const mockDbActivity = {
        id: 'activity-123',
        lead_id: 'lead-123',
        type: 'note_added',
        subject: 'Test activity',
        details: '{"note":"Test note"}',
        performed_by: 'user-123',
        performed_at: new Date(),
        related_entities: null
      };

      MockedActivity.findById.mockResolvedValue(mockDbActivity);
      MockedActivity.transformToActivityType.mockReturnValue({
        id: 'activity-123',
        leadId: 'lead-123',
        type: ActivityTypeEnum.NOTE_ADDED,
        subject: 'Test activity',
        details: { note: 'Test note' },
        performedBy: 'user-123',
        performedAt: new Date()
      });

      const result = await ActivityService.getActivityById('activity-123');

      expect(MockedActivity.findById).toHaveBeenCalledWith('activity-123');
      expect(result.id).toBe('activity-123');
    });

    it('should throw NotFoundError when activity not found', async () => {
      MockedActivity.findById.mockResolvedValue(null);

      await expect(ActivityService.getActivityById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getActivities', () => {
    it('should return filtered activities with pagination', async () => {
      const mockDbActivities = [
        {
          id: 'activity-1',
          lead_id: 'lead-123',
          type: 'note_added',
          subject: 'Activity 1',
          details: '{"note":"Note 1"}',
          performed_by: 'user-123',
          performed_at: new Date(),
          related_entities: null
        }
      ];

      // Mock the query builder chain
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '1' }),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockDbActivities)
      };

      MockedActivity.query = mockQuery as any;
      MockedActivity.transformToActivityType.mockReturnValue({
        id: 'activity-1',
        leadId: 'lead-123',
        type: ActivityTypeEnum.NOTE_ADDED,
        subject: 'Activity 1',
        details: { note: 'Note 1' },
        performedBy: 'user-123',
        performedAt: new Date()
      });

      const filter: ActivityFilter = {
        leadId: 'lead-123',
        limit: 10,
        offset: 0
      };

      const result = await ActivityService.getActivities(filter);

      expect(result.activities).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getLeadTimeline', () => {
    it('should return chronological timeline for a lead', async () => {
      const mockDbActivities = [
        {
          id: 'activity-1',
          lead_id: 'lead-123',
          type: 'note_added',
          subject: 'Activity 1',
          details: '{"note":"Note 1"}',
          performed_by: 'user-123',
          performed_at: new Date(),
          related_entities: null,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com'
        }
      ];

      // Mock the query builder chain for timeline
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockDbActivities)
      };

      MockedActivity.query = mockQuery as any;
      MockedActivity.transformToActivityType.mockReturnValue({
        id: 'activity-1',
        leadId: 'lead-123',
        type: ActivityTypeEnum.NOTE_ADDED,
        subject: 'Activity 1',
        details: { note: 'Note 1' },
        performedBy: 'user-123',
        performedAt: new Date()
      });

      const result = await ActivityService.getLeadTimeline('lead-123', 50);

      expect(result).toHaveLength(1);
      expect(result[0].user).toEqual({
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      });
    });
  });

  describe('addNote', () => {
    it('should add note with mention support', async () => {
      const mockDbActivity = {
        id: 'activity-123',
        lead_id: 'lead-123',
        type: 'note_added',
        subject: 'Note added',
        details: '{"note":"Test note with @user-456"}',
        performed_by: 'user-123',
        performed_at: new Date(),
        related_entities: null
      };

      MockedActivity.createActivity.mockResolvedValue(mockDbActivity);
      MockedActivity.transformToActivityType.mockReturnValue({
        id: 'activity-123',
        leadId: 'lead-123',
        type: ActivityTypeEnum.NOTE_ADDED,
        subject: 'Note added',
        details: { note: 'Test note with @user-456' },
        performedBy: 'user-123',
        performedAt: new Date()
      });

      const result = await ActivityService.addNote('lead-123', 'Test note with @user-456', 'user-123');

      expect(MockedActivity.createActivity).toHaveBeenCalledWith(expect.objectContaining({
        leadId: 'lead-123',
        type: ActivityTypeEnum.NOTE_ADDED,
        subject: 'Note added',
        details: { note: 'Test note with @user-456' }
      }));
      expect(result.type).toBe(ActivityTypeEnum.NOTE_ADDED);
    });
  });

  describe('logEmail', () => {
    it('should log email activity', async () => {
      const mockDbActivity = {
        id: 'activity-123',
        lead_id: 'lead-123',
        type: 'email_sent',
        subject: 'Email sent: Test Subject',
        details: '{"type":"sent","subject":"Test Subject","to":"test@example.com"}',
        performed_by: 'user-123',
        performed_at: new Date(),
        related_entities: null
      };

      MockedActivity.createActivity.mockResolvedValue(mockDbActivity);
      MockedActivity.transformToActivityType.mockReturnValue({
        id: 'activity-123',
        leadId: 'lead-123',
        type: ActivityTypeEnum.EMAIL_SENT,
        subject: 'Email sent: Test Subject',
        details: { type: 'sent', subject: 'Test Subject', to: 'test@example.com' },
        performedBy: 'user-123',
        performedAt: new Date()
      });

      const result = await ActivityService.logEmail('lead-123', 'user-123', {
        type: 'sent',
        subject: 'Test Subject',
        to: 'test@example.com'
      });

      expect(result.type).toBe(ActivityTypeEnum.EMAIL_SENT);
      expect(result.subject).toBe('Email sent: Test Subject');
    });
  });

  describe('logCall', () => {
    it('should log call activity', async () => {
      const mockDbActivity = {
        id: 'activity-123',
        lead_id: 'lead-123',
        type: 'call_made',
        subject: 'Call made',
        details: '{"type":"made","duration":300,"outcome":"Connected"}',
        performed_by: 'user-123',
        performed_at: new Date(),
        related_entities: null
      };

      MockedActivity.createActivity.mockResolvedValue(mockDbActivity);
      MockedActivity.transformToActivityType.mockReturnValue({
        id: 'activity-123',
        leadId: 'lead-123',
        type: ActivityTypeEnum.CALL_MADE,
        subject: 'Call made',
        details: { type: 'made', duration: 300, outcome: 'Connected' },
        performedBy: 'user-123',
        performedAt: new Date()
      });

      const result = await ActivityService.logCall('lead-123', 'user-123', {
        type: 'made',
        duration: 300,
        outcome: 'Connected'
      });

      expect(result.type).toBe(ActivityTypeEnum.CALL_MADE);
      expect(result.subject).toBe('Call made');
    });
  });

  describe('getActivityStatistics', () => {
    it('should return activity statistics with top performers', async () => {
      const mockBaseStats = {
        totalActivities: 100,
        activitiesByType: {
          note_added: 50,
          email_sent: 30,
          call_made: 20
        },
        recentActivityCount: 10
      };

      const mockTopPerformers = [
        { userId: 'user-1', count: '25', userName: 'John Doe' },
        { userId: 'user-2', count: '20', userName: 'Jane Smith' }
      ];

      MockedActivity.getActivityStatistics.mockResolvedValue(mockBaseStats);

      // Mock the query builder for top performers
      const mockQuery = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockTopPerformers),
        where: jest.fn().mockReturnThis()
      };

      MockedActivity.query = mockQuery as any;

      const result = await ActivityService.getActivityStatistics('lead-123');

      expect(result.totalActivities).toBe(100);
      expect(result.topPerformers).toHaveLength(2);
      expect(result.topPerformers[0]).toEqual({
        userId: 'user-1',
        count: 25,
        userName: 'John Doe'
      });
    });
  });

  describe('searchActivities', () => {
    it('should search activities by content', async () => {
      const mockDbActivities = [
        {
          id: 'activity-1',
          lead_id: 'lead-123',
          type: 'note_added',
          subject: 'Important note',
          details: '{"note":"This contains the search term"}',
          performed_by: 'user-123',
          performed_at: new Date(),
          related_entities: null
        }
      ];

      // Mock the query builder for search
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockDbActivities)
      };

      MockedActivity.query = mockQuery as any;
      MockedActivity.transformToActivityType.mockReturnValue({
        id: 'activity-1',
        leadId: 'lead-123',
        type: ActivityTypeEnum.NOTE_ADDED,
        subject: 'Important note',
        details: { note: 'This contains the search term' },
        performedBy: 'user-123',
        performedAt: new Date()
      });

      const result = await ActivityService.searchActivities('search term', 'lead-123', 10);

      expect(result).toHaveLength(1);
      expect(result[0].subject).toBe('Important note');
    });
  });
});