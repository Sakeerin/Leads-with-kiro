import { ReportingService } from '../src/services/reportingService';
import { LeadStatus, LeadChannel } from '../src/types';

// Mock the database connection
jest.mock('../src/config/database', () => {
  const mockKnex = {
    select: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    whereBetween: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    havingRaw: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  };
  
  return mockKnex;
});

describe('ReportingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFunnelMetrics', () => {
    it('should return funnel metrics with conversion rates', async () => {
      const db = require('../src/config/database');
      
      // Mock database responses
      const mockStatusCounts = [
        { status: LeadStatus.NEW, count: '100' },
        { status: LeadStatus.CONTACTED, count: '80' },
        { status: LeadStatus.QUALIFIED, count: '50' },
        { status: LeadStatus.WON, count: '10' }
      ];

      const mockTimeInStageData = [
        { 
          lead_id: '1', 
          status: LeadStatus.NEW, 
          first_activity: new Date('2023-01-01'), 
          last_activity: new Date('2023-01-02') 
        }
      ];

      // Setup mock chain for status counts query
      db.mockResolvedValueOnce(mockStatusCounts);
      // Setup mock chain for time in stage query  
      db.mockResolvedValueOnce(mockTimeInStageData);

      const result = await ReportingService.getFunnelMetrics();

      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({
        stage: LeadStatus.NEW,
        count: 100
      });
    });

    it('should handle date range filtering', async () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };

      const mockKnex = {
        select: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        whereBetween: jest.fn().mockReturnThis(),
        avg: jest.fn().mockReturnThis(),
        join: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis()
      };

      mockKnex.select.mockResolvedValue([]);

      const BaseModel = require('../src/models/BaseModel').BaseModel;
      BaseModel.knex = jest.fn().mockReturnValue(mockKnex);

      await ReportingService.getFunnelMetrics(dateRange);

      expect(mockKnex.whereBetween).toHaveBeenCalledWith('created_at', [dateRange.startDate, dateRange.endDate]);
    });
  });

  describe('getTimeToFirstTouchReport', () => {
    it('should calculate average and median time to first touch', async () => {
      const mockLeads = [
        {
          id: '1',
          source_channel: LeadChannel.WEB_FORM,
          assigned_to: 'user1',
          created_at: new Date('2023-01-01T10:00:00Z'),
          assigned_at: new Date('2023-01-01T12:00:00Z'), // 2 hours
          first_name: 'John',
          last_name: 'Doe'
        },
        {
          id: '2',
          source_channel: LeadChannel.EMAIL,
          assigned_to: 'user1',
          created_at: new Date('2023-01-01T10:00:00Z'),
          assigned_at: new Date('2023-01-01T14:00:00Z'), // 4 hours
          first_name: 'John',
          last_name: 'Doe'
        }
      ];

      const mockKnex = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereBetween: jest.fn().mockReturnThis()
      };

      mockKnex.select.mockResolvedValue(mockLeads);

      const BaseModel = require('../src/models/BaseModel').BaseModel;
      BaseModel.knex = jest.fn().mockReturnValue(mockKnex);

      const result = await ReportingService.getTimeToFirstTouchReport();

      expect(result.averageTimeToFirstTouch).toBe(3); // (2 + 4) / 2
      expect(result.medianTimeToFirstTouch).toBe(4); // median of [2, 4]
      expect(result.bySource).toHaveLength(2);
      expect(result.byAssignee).toHaveLength(1);
    });
  });

  describe('getSLAComplianceReport', () => {
    it('should calculate SLA compliance rates', async () => {
      const mockLeads = [
        {
          id: '1',
          source_channel: LeadChannel.WEB_FORM,
          assigned_to: 'user1',
          created_at: new Date('2023-01-01T10:00:00Z'),
          assigned_at: new Date('2023-01-01T12:00:00Z'), // 2 hours - compliant
          first_name: 'John',
          last_name: 'Doe'
        },
        {
          id: '2',
          source_channel: LeadChannel.EMAIL,
          assigned_to: 'user1',
          created_at: new Date('2023-01-01T10:00:00Z'),
          assigned_at: new Date('2023-01-02T12:00:00Z'), // 26 hours - breach
          first_name: 'John',
          last_name: 'Doe'
        }
      ];

      const mockKnex = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereBetween: jest.fn().mockReturnThis()
      };

      mockKnex.select.mockResolvedValue(mockLeads);

      const BaseModel = require('../src/models/BaseModel').BaseModel;
      BaseModel.knex = jest.fn().mockReturnValue(mockKnex);

      const result = await ReportingService.getSLAComplianceReport(24);

      expect(result.overallCompliance).toBe(50); // 1 out of 2 compliant
      expect(result.totalLeads).toBe(2);
      expect(result.compliantLeads).toBe(1);
      expect(result.breachedLeads).toBe(1);
    });
  });

  describe('getSourceEffectivenessReport', () => {
    it('should calculate source effectiveness metrics', async () => {
      const mockResults = [
        {
          source_channel: LeadChannel.WEB_FORM,
          total_leads: '100',
          qualified_leads: '50',
          converted_leads: '10',
          avg_score: '75.5',
          avg_conversion_days: '30.2'
        }
      ];

      const mockKnex = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        whereBetween: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis()
      };

      mockKnex.select.mockResolvedValue(mockResults);

      const BaseModel = require('../src/models/BaseModel').BaseModel;
      BaseModel.knex = jest.fn().mockReturnValue(mockKnex);

      const result = await ReportingService.getSourceEffectivenessReport();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: LeadChannel.WEB_FORM,
        totalLeads: 100,
        qualifiedLeads: 50,
        convertedLeads: 10,
        qualificationRate: 50,
        conversionRate: 10,
        averageScore: 75.5,
        averageTimeToConversion: 30.2
      });
    });
  });

  describe('getSalesRepPerformanceReport', () => {
    it('should calculate sales rep performance metrics', async () => {
      const mockLeadResults = [
        {
          assigned_to: 'user1',
          first_name: 'John',
          last_name: 'Doe',
          total_leads: '50',
          active_leads: '30',
          qualified_leads: '25',
          converted_leads: '5',
          avg_score: '80.5',
          avg_first_touch_hours: '2.5',
          avg_conversion_days: '25.3'
        }
      ];

      const mockTaskStats = [
        {
          assigned_to: 'user1',
          completed_tasks: '20',
          overdue_tasks: '2'
        }
      ];

      const mockActivityStats = [
        {
          performed_by: 'user1',
          activities_logged: '150'
        }
      ];

      const mockKnex = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        whereBetween: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis()
      };

      mockKnex.select
        .mockResolvedValueOnce(mockLeadResults)
        .mockResolvedValueOnce(mockTaskStats)
        .mockResolvedValueOnce(mockActivityStats);

      const BaseModel = require('../src/models/BaseModel').BaseModel;
      BaseModel.knex = jest.fn().mockReturnValue(mockKnex);

      const result = await ReportingService.getSalesRepPerformanceReport();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        assigneeId: 'user1',
        assigneeName: 'John Doe',
        totalLeads: 50,
        activeLeads: 30,
        qualifiedLeads: 25,
        convertedLeads: 5,
        qualificationRate: 50,
        conversionRate: 10,
        averageScore: 80.5,
        averageTimeToFirstTouch: 2.5,
        averageTimeToConversion: 25.3,
        tasksCompleted: 20,
        tasksOverdue: 2,
        activitiesLogged: 150
      });
    });
  });

  describe('getDataQualityReport', () => {
    it('should calculate data quality metrics', async () => {
      const mockTotalLeads = { count: '1000' };
      const mockMissingFields = {
        missing_phone: '100',
        missing_industry: '50',
        missing_company_size: '75',
        missing_campaign: '200',
        missing_business_type: '150'
      };
      const mockInvalidData = {
        invalid_emails: '25',
        invalid_phones: '15'
      };
      const mockDuplicates = [
        {
          contact_email: 'test@example.com',
          count: '3',
          ids: ['1', '2', '3']
        }
      ];

      const mockKnex = {
        where: jest.fn().mockReturnThis(),
        whereBetween: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis()
      };

      mockKnex.first
        .mockResolvedValueOnce(mockTotalLeads)
        .mockResolvedValueOnce(mockMissingFields)
        .mockResolvedValueOnce(mockInvalidData);
      
      mockKnex.select.mockResolvedValue(mockDuplicates);

      const BaseModel = require('../src/models/BaseModel').BaseModel;
      BaseModel.knex = jest.fn().mockReturnValue(mockKnex);

      const result = await ReportingService.getDataQualityReport();

      expect(result.totalLeads).toBe(1000);
      expect(result.duplicateLeads).toBe(3);
      expect(result.duplicateRate).toBe(0.3);
      expect(result.invalidEmails).toBe(25);
      expect(result.invalidPhones).toBe(15);
      expect(result.missingFields).toHaveLength(5);
      expect(result.dataCompletenessScore).toBeGreaterThan(0);
    });
  });
});