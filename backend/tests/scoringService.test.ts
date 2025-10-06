import { ScoringService, ScoringCriteria, ScoreBandConfig } from '../src/services/scoringService';
import { Lead } from '../src/models/Lead';
import { Activity } from '../src/models/Activity';
import { LeadChannel, CompanySize, BusinessType, InterestLevel, BudgetStatus, PurchaseTimeline, ScoreBand, LeadStatus } from '../src/types';
import { ValidationError, NotFoundError } from '../src/utils/errors';

// Mock the dependencies
jest.mock('../src/models/Lead');
jest.mock('../src/models/Activity');

const MockedLead = Lead as jest.Mocked<typeof Lead>;
const MockedActivity = Activity as jest.Mocked<typeof Activity>;

describe('ScoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateScore', () => {
    const mockLead = {
      id: 'lead-1',
      accountLeadId: 'AL-25-01-001',
      company: {
        name: 'Test Company',
        industry: 'technology',
        size: CompanySize.LARGE
      },
      contact: {
        name: 'John Doe',
        email: 'john@test.com',
        phone: '+1234567890'
      },
      source: {
        channel: LeadChannel.WEB_FORM,
        campaign: 'test-campaign'
      },
      assignment: {},
      status: LeadStatus.NEW,
      score: {
        value: 0,
        band: ScoreBand.COLD,
        lastCalculated: new Date()
      },
      qualification: {
        interest: InterestLevel.HIGH,
        budget: BudgetStatus.CONFIRMED,
        timeline: PurchaseTimeline.IMMEDIATE,
        businessType: BusinessType.B2B
      },
      followUp: {},
      product: {},
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        isActive: true
      },
      customFields: {}
    };

    const mockDbLead = {
      id: 'lead-1',
      account_lead_id: 'AL-25-01-001',
      company_name: 'Test Company',
      company_industry: 'technology',
      company_size: CompanySize.LARGE,
      contact_name: 'John Doe',
      contact_email: 'john@test.com',
      contact_phone: '+1234567890',
      source_channel: LeadChannel.WEB_FORM,
      source_campaign: 'test-campaign',
      status: LeadStatus.NEW,
      score_value: 0,
      score_band: ScoreBand.COLD,
      score_last_calculated: new Date(),
      qualification_interest: InterestLevel.HIGH,
      qualification_budget: BudgetStatus.CONFIRMED,
      qualification_timeline: PurchaseTimeline.IMMEDIATE,
      qualification_business_type: BusinessType.B2B,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'user-1'
    };

    const mockActivities = [
      {
        id: 'activity-1',
        lead_id: 'lead-1',
        type: 'email_opened',
        subject: 'Email opened',
        details: '{}',
        performed_by: 'system',
        performed_at: new Date()
      },
      {
        id: 'activity-2',
        lead_id: 'lead-1',
        type: 'email_replied',
        subject: 'Email replied',
        details: '{}',
        performed_by: 'lead-1',
        performed_at: new Date()
      }
    ];

    it('should calculate lead score successfully', async () => {
      MockedLead.findById.mockResolvedValue(mockDbLead as any);
      MockedLead.transformToLeadType.mockReturnValue(mockLead as any);
      MockedActivity.findByLeadId.mockResolvedValue(mockActivities as any);
      MockedLead.updateLead.mockResolvedValue(mockDbLead as any);
      MockedActivity.logScoreUpdated.mockResolvedValue({} as any);

      const result = await ScoringService.calculateScore('lead-1');

      expect(result).toBeDefined();
      expect(result.leadId).toBe('lead-1');
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.scoreBand).toBeDefined();
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.profileFit).toBeGreaterThan(0);
      expect(result.breakdown.behavioral).toBeGreaterThan(0);
      expect(result.breakdown.source).toBeGreaterThan(0);
      expect(result.breakdown.qualification).toBeGreaterThan(0);
      expect(MockedLead.updateLead).toHaveBeenCalledWith('lead-1', expect.objectContaining({
        score: expect.objectContaining({
          value: expect.any(Number),
          band: expect.any(String),
          lastCalculated: expect.any(Date)
        })
      }));
    });

    it('should throw NotFoundError for non-existent lead', async () => {
      MockedLead.findById.mockResolvedValue(null);

      await expect(ScoringService.calculateScore('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should handle leads with minimal data', async () => {
      const minimalLead = {
        ...mockLead,
        company: { name: 'Test Company' },
        qualification: {},
        source: { channel: LeadChannel.EMAIL }
      };

      const minimalDbLead = {
        ...mockDbLead,
        company_industry: null,
        company_size: null,
        qualification_interest: null,
        qualification_budget: null,
        qualification_timeline: null,
        qualification_business_type: null
      };

      MockedLead.findById.mockResolvedValue(minimalDbLead as any);
      MockedLead.transformToLeadType.mockReturnValue(minimalLead as any);
      MockedActivity.findByLeadId.mockResolvedValue([]);
      MockedLead.updateLead.mockResolvedValue(minimalDbLead as any);
      MockedActivity.logScoreUpdated.mockResolvedValue({} as any);

      const result = await ScoringService.calculateScore('lead-1');

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recalculateAllScores', () => {
    it('should recalculate scores for all active leads', async () => {
      const mockLeads = [
        { id: 'lead-1' },
        { id: 'lead-2' },
        { id: 'lead-3' }
      ];

      (MockedLead as any).query = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockLeads)
      };

      // Mock successful score calculations
      jest.spyOn(ScoringService, 'calculateScore').mockResolvedValue({
        leadId: 'test',
        totalScore: 50,
        scoreBand: ScoreBand.WARM,
        breakdown: {
          profileFit: 10,
          behavioral: 10,
          recency: 10,
          source: 10,
          qualification: 10
        },
        calculatedAt: new Date(),
        modelId: 'default'
      });

      const result = await ScoringService.recalculateAllScores();

      expect(result.processed).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors during batch recalculation', async () => {
      const mockLeads = [
        { id: 'lead-1' },
        { id: 'lead-2' }
      ];

      (MockedLead as any).query = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockLeads)
      };

      // Mock one successful and one failed calculation
      jest.spyOn(ScoringService, 'calculateScore')
        .mockResolvedValueOnce({
          leadId: 'lead-1',
          totalScore: 50,
          scoreBand: ScoreBand.WARM,
          breakdown: {
            profileFit: 10,
            behavioral: 10,
            recency: 10,
            source: 10,
            qualification: 10
          },
          calculatedAt: new Date(),
          modelId: 'default'
        })
        .mockRejectedValueOnce(new Error('Calculation failed'));

      const result = await ScoringService.recalculateAllScores();

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.leadId).toBe('lead-2');
    });
  });

  describe('recalculateScoresForLeads', () => {
    it('should recalculate scores for specific leads', async () => {
      const leadIds = ['lead-1', 'lead-2'];

      jest.spyOn(ScoringService, 'calculateScore').mockResolvedValue({
        leadId: 'test',
        totalScore: 50,
        scoreBand: ScoreBand.WARM,
        breakdown: {
          profileFit: 10,
          behavioral: 10,
          recency: 10,
          source: 10,
          qualification: 10
        },
        calculatedAt: new Date(),
        modelId: 'default'
      });

      const result = await ScoringService.recalculateScoresForLeads(leadIds);

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(ScoringService.calculateScore).toHaveBeenCalledTimes(2);
    });
  });

  describe('getScoreBands', () => {
    it('should return default score bands', () => {
      const scoreBands = ScoringService.getScoreBands();

      expect(scoreBands).toHaveLength(3);
      expect(scoreBands[0]?.band).toBe(ScoreBand.HOT);
      expect(scoreBands[0]?.minScore).toBe(70);
      expect(scoreBands[0]?.maxScore).toBe(100);
      expect(scoreBands[1]?.band).toBe(ScoreBand.WARM);
      expect(scoreBands[2]?.band).toBe(ScoreBand.COLD);
    });
  });

  describe('updateScoreBands', () => {
    it('should update score bands successfully', () => {
      const newScoreBands: ScoreBandConfig[] = [
        {
          band: ScoreBand.HOT,
          minScore: 80,
          maxScore: 100,
          actions: []
        },
        {
          band: ScoreBand.WARM,
          minScore: 50,
          maxScore: 79,
          actions: []
        },
        {
          band: ScoreBand.COLD,
          minScore: 0,
          maxScore: 49,
          actions: []
        }
      ];

      const result = ScoringService.updateScoreBands(newScoreBands);

      expect(result).toEqual(newScoreBands);
    });

    it('should throw ValidationError for overlapping score bands', () => {
      const overlappingBands: ScoreBandConfig[] = [
        {
          band: ScoreBand.HOT,
          minScore: 70,
          maxScore: 100,
          actions: []
        },
        {
          band: ScoreBand.WARM,
          minScore: 60,
          maxScore: 80, // Overlaps with HOT band
          actions: []
        }
      ];

      expect(() => ScoringService.updateScoreBands(overlappingBands)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid score ranges', () => {
      const invalidBands: ScoreBandConfig[] = [
        {
          band: ScoreBand.HOT,
          minScore: 150, // Invalid: > 100
          maxScore: 200,
          actions: []
        }
      ];

      expect(() => ScoringService.updateScoreBands(invalidBands)).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty score bands', () => {
      expect(() => ScoringService.updateScoreBands([])).toThrow(ValidationError);
    });
  });

  describe('getScoringModel', () => {
    it('should return default scoring model', async () => {
      const model = await ScoringService.getScoringModel('default');

      expect(model).toBeDefined();
      expect(model.id).toBe('default');
      expect(model.name).toBe('Default Scoring Model');
      expect(model.isDefault).toBe(true);
      expect(model.criteria).toBeDefined();
      expect(model.scoreBands).toBeDefined();
    });

    it('should throw NotFoundError for non-existent model', async () => {
      await expect(ScoringService.getScoringModel('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createScoringModel', () => {
    it('should create new scoring model', async () => {
      const modelData = {
        name: 'Test Model',
        description: 'Test scoring model',
        criteria: {} as ScoringCriteria,
        scoreBands: [
          {
            band: ScoreBand.HOT,
            minScore: 70,
            maxScore: 100,
            actions: []
          },
          {
            band: ScoreBand.WARM,
            minScore: 40,
            maxScore: 69,
            actions: []
          },
          {
            band: ScoreBand.COLD,
            minScore: 0,
            maxScore: 39,
            actions: []
          }
        ],
        isActive: true,
        isDefault: false,
        createdBy: 'user-1'
      };

      const result = await ScoringService.createScoringModel(modelData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Model');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('getLeadScores', () => {
    it('should return lead scores with pagination', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          score_value: 85,
          score_band: ScoreBand.HOT,
          score_last_calculated: new Date()
        },
        {
          id: 'lead-2',
          score_value: 55,
          score_band: ScoreBand.WARM,
          score_last_calculated: new Date()
        }
      ];

      (MockedLead as any).query = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockLeads),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue([{ count: '2' }])
      };

      const result = await ScoringService.getLeadScores({
        page: 1,
        limit: 10
      });

      expect(result.scores).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter by score band', async () => {
      (MockedLead as any).query = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue([{ count: '0' }])
      };

      await ScoringService.getLeadScores({
        scoreBand: ScoreBand.HOT
      });

      expect((MockedLead as any).query.where).toHaveBeenCalledWith('score_band', ScoreBand.HOT);
    });
  });
});