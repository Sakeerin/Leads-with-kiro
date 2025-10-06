import { LeadService, CreateLeadRequest, UpdateLeadRequest } from '../src/services/leadService';
import { Lead } from '../src/models/Lead';
import { Activity } from '../src/models/Activity';
import { LeadStatus, LeadChannel, ScoreBand } from '../src/types';
import { ValidationError, NotFoundError } from '../src/utils/errors';

// Mock the models
jest.mock('../src/models/Lead');
jest.mock('../src/models/Activity');

const MockedLead = Lead as jest.Mocked<typeof Lead>;
const MockedActivity = Activity as jest.Mocked<typeof Activity>;

describe('LeadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLead', () => {
    const validLeadData: CreateLeadRequest = {
      company: {
        name: 'Test Company',
        industry: 'Technology'
      },
      contact: {
        name: 'John Doe',
        email: 'john@test.com',
        phone: '+1234567890'
      },
      source: {
        channel: LeadChannel.WEB_FORM,
        campaign: 'Test Campaign'
      },
      createdBy: 'user-123'
    };

    const mockDbLead = {
      id: 'lead-123',
      account_lead_id: 'AL-24-01-001',
      company_name: 'Test Company',
      company_industry: 'Technology',
      contact_name: 'John Doe',
      contact_email: 'john@test.com',
      contact_phone: '+1234567890',
      source_channel: LeadChannel.WEB_FORM,
      source_campaign: 'Test Campaign',
      status: LeadStatus.NEW,
      score_value: 0,
      score_band: ScoreBand.COLD,
      score_last_calculated: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'user-123'
    } as any;

    it('should create a lead successfully', async () => {
      MockedLead.createLead.mockResolvedValue(mockDbLead);
      MockedLead.transformToLeadType.mockReturnValue({
        id: 'lead-123',
        accountLeadId: 'AL-24-01-001',
        company: { name: 'Test Company', industry: 'Technology' },
        contact: { name: 'John Doe', email: 'john@test.com', phone: '+1234567890' },
        source: { channel: LeadChannel.WEB_FORM, campaign: 'Test Campaign' },
        assignment: {},
        status: LeadStatus.NEW,
        score: { value: 0, band: ScoreBand.COLD, lastCalculated: new Date() },
        qualification: {},
        followUp: {},
        product: {},
        metadata: { createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-123', isActive: true },
        customFields: {}
      } as any);
      MockedActivity.logLeadCreated.mockResolvedValue({} as any);

      const result = await LeadService.createLead(validLeadData);

      expect(MockedLead.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          company: validLeadData.company,
          contact: validLeadData.contact,
          source: validLeadData.source,
          status: LeadStatus.NEW
        })
      );
      expect(MockedActivity.logLeadCreated).toHaveBeenCalledWith('lead-123', 'user-123', expect.any(Object));
      expect(result.id).toBe('lead-123');
    });

    it('should throw ValidationError for missing company name', async () => {
      const invalidData = { ...validLeadData, company: { name: '' } };

      await expect(LeadService.createLead(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing contact name', async () => {
      const invalidData = { ...validLeadData, contact: { ...validLeadData.contact, name: '' } };

      await expect(LeadService.createLead(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing contact email', async () => {
      const invalidData = { ...validLeadData, contact: { ...validLeadData.contact, email: '' } };

      await expect(LeadService.createLead(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid email format', async () => {
      const invalidData = { ...validLeadData, contact: { ...validLeadData.contact, email: 'invalid-email' } };

      await expect(LeadService.createLead(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid phone format', async () => {
      const invalidData = { ...validLeadData, contact: { ...validLeadData.contact, phone: 'invalid-phone' } };

      await expect(LeadService.createLead(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should log assignment activity when lead is assigned during creation', async () => {
      const dataWithAssignment = {
        ...validLeadData,
        assignment: {
          assignedTo: 'user-456',
          assignmentReason: 'Territory match'
        }
      };

      MockedLead.createLead.mockResolvedValue(mockDbLead);
      MockedLead.transformToLeadType.mockReturnValue({
        id: 'lead-123',
        accountLeadId: 'AL-24-01-001'
      } as any);
      MockedActivity.logLeadCreated.mockResolvedValue({} as any);
      MockedActivity.logLeadAssigned.mockResolvedValue({} as any);

      await LeadService.createLead(dataWithAssignment);

      expect(MockedActivity.logLeadAssigned).toHaveBeenCalledWith(
        'lead-123',
        'user-123',
        'user-456',
        'Territory match'
      );
    });
  });

  describe('getLeadById', () => {
    it('should return lead when found', async () => {
      const mockDbLead = { id: 'lead-123', is_active: true } as any;
      const mockLead = { id: 'lead-123', accountLeadId: 'AL-24-01-001' } as any;

      MockedLead.findById.mockResolvedValue(mockDbLead);
      MockedLead.transformToLeadType.mockReturnValue(mockLead);

      const result = await LeadService.getLeadById('lead-123');

      expect(MockedLead.findById).toHaveBeenCalledWith('lead-123');
      expect(result).toEqual(mockLead);
    });

    it('should throw NotFoundError when lead not found', async () => {
      MockedLead.findById.mockResolvedValue(undefined);

      await expect(LeadService.getLeadById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateLead', () => {
    const mockExistingLead = {
      id: 'lead-123',
      accountLeadId: 'AL-24-01-001',
      company: { name: 'Old Company' },
      contact: { name: 'John Doe', email: 'john@test.com' },
      source: { channel: LeadChannel.WEB_FORM },
      assignment: {},
      status: LeadStatus.NEW,
      score: { value: 0, band: ScoreBand.COLD, lastCalculated: new Date() },
      qualification: {},
      followUp: {},
      product: {},
      metadata: { createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-123', isActive: true },
      customFields: {}
    } as any;

    beforeEach(() => {
      MockedLead.findById.mockResolvedValue({ id: 'lead-123', is_active: true } as any);
      MockedLead.transformToLeadType.mockReturnValue(mockExistingLead);
    });

    it('should update lead successfully', async () => {
      const updateData: UpdateLeadRequest = {
        company: { name: 'New Company' },
        status: LeadStatus.CONTACTED
      };

      const mockUpdatedDbLead = { id: 'lead-123', company_name: 'New Company', status: LeadStatus.CONTACTED } as any;
      const mockUpdatedLead = { ...mockExistingLead, company: { name: 'New Company' }, status: LeadStatus.CONTACTED };

      MockedLead.updateLead.mockResolvedValue(mockUpdatedDbLead);
      MockedLead.transformToLeadType.mockReturnValueOnce(mockExistingLead).mockReturnValueOnce(mockUpdatedLead);
      MockedActivity.logLeadUpdated.mockResolvedValue({} as any);
      MockedActivity.logStatusChanged.mockResolvedValue({} as any);

      const result = await LeadService.updateLead('lead-123', updateData, 'user-456');

      expect(MockedLead.updateLead).toHaveBeenCalledWith('lead-123', expect.objectContaining({
        company: { name: 'New Company' },
        status: LeadStatus.CONTACTED
      }));
      expect(MockedActivity.logLeadUpdated).toHaveBeenCalled();
      expect(MockedActivity.logStatusChanged).toHaveBeenCalledWith('lead-123', 'user-456', LeadStatus.NEW, LeadStatus.CONTACTED);
    });

    it('should throw ValidationError for invalid email', async () => {
      const updateData: UpdateLeadRequest = {
        contact: { email: 'invalid-email' }
      };

      await expect(LeadService.updateLead('lead-123', updateData, 'user-456')).rejects.toThrow(ValidationError);
    });

    it('should log assignment activity when lead is reassigned', async () => {
      const updateData: UpdateLeadRequest = {
        assignment: {
          assignedTo: 'user-789',
          assignmentReason: 'Workload balancing'
        }
      };

      MockedLead.updateLead.mockResolvedValue({} as any);
      MockedLead.transformToLeadType.mockReturnValueOnce(mockExistingLead).mockReturnValueOnce(mockExistingLead);
      MockedActivity.logLeadUpdated.mockResolvedValue({} as any);
      MockedActivity.logLeadAssigned.mockResolvedValue({} as any);

      await LeadService.updateLead('lead-123', updateData, 'user-456');

      expect(MockedActivity.logLeadAssigned).toHaveBeenCalledWith(
        'lead-123',
        'user-456',
        'user-789',
        'Workload balancing'
      );
    });
  });

  describe('deleteLead', () => {
    it('should soft delete lead successfully', async () => {
      const mockLead = { id: 'lead-123', metadata: { isActive: true } } as any;
      MockedLead.findById.mockResolvedValue({ id: 'lead-123', is_active: true } as any);
      MockedLead.transformToLeadType.mockReturnValue(mockLead);
      MockedLead.update.mockResolvedValue({} as any);
      MockedActivity.logLeadUpdated.mockResolvedValue({} as any);

      await LeadService.deleteLead('lead-123', 'user-456');

      expect(MockedLead.update).toHaveBeenCalledWith('lead-123', { is_active: false });
      expect(MockedActivity.logLeadUpdated).toHaveBeenCalledWith('lead-123', 'user-456', {
        deleted: { old: false, new: true }
      });
    });

    it('should throw ValidationError if lead is already deleted', async () => {
      const mockLead = { id: 'lead-123', metadata: { isActive: false } } as any;
      MockedLead.findById.mockResolvedValue({ id: 'lead-123', is_active: false } as any);
      MockedLead.transformToLeadType.mockReturnValue(mockLead);

      await expect(LeadService.deleteLead('lead-123', 'user-456')).rejects.toThrow(ValidationError);
    });
  });

  describe('searchLeads', () => {
    it('should search leads with pagination', async () => {
      const mockDbLeads = [
        { id: 'lead-1', account_lead_id: 'AL-24-01-001' },
        { id: 'lead-2', account_lead_id: 'AL-24-01-002' }
      ] as any[];

      const mockLeads = [
        { id: 'lead-1', accountLeadId: 'AL-24-01-001' },
        { id: 'lead-2', accountLeadId: 'AL-24-01-002' }
      ] as any[];

      // Mock the query builder chain
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '2' }),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockDbLeads)
      };

      MockedLead.query = mockQuery as any;
      MockedLead.transformToLeadType.mockReturnValueOnce(mockLeads[0]).mockReturnValueOnce(mockLeads[1]);

      const result = await LeadService.searchLeads({
        searchTerm: 'test',
        page: 1,
        limit: 10
      });

      expect(result.leads).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('detectDuplicates', () => {
    it('should detect email duplicates', async () => {
      const mockDbLead = { id: 'lead-123', contact_email: 'test@example.com', is_active: true } as any;
      const mockLead = { id: 'lead-123', contact: { email: 'test@example.com' } } as any;

      MockedLead.findByEmail.mockResolvedValue([mockDbLead]);
      MockedLead.transformToLeadType.mockReturnValue(mockLead);

      const result = await LeadService.detectDuplicates({ email: 'test@example.com' });

      expect(result).toHaveLength(1);
      expect(result[0].matchType).toBe('email');
      expect(result[0].confidence).toBe(1.0);
    });

    it('should detect phone duplicates', async () => {
      const mockDbLead = { id: 'lead-123', contact_phone: '+1234567890', is_active: true } as any;
      const mockLead = { id: 'lead-123', contact: { phone: '+1234567890' } } as any;

      MockedLead.findByEmail.mockResolvedValue([]);
      MockedLead.findDuplicates.mockResolvedValue([mockDbLead]);
      MockedLead.transformToLeadType.mockReturnValue(mockLead);

      const result = await LeadService.detectDuplicates({ phone: '+1234567890' });

      expect(result).toHaveLength(1);
      expect(result[0].matchType).toBe('phone');
      expect(result[0].confidence).toBe(0.9);
    });

    it('should detect company name duplicates with fuzzy matching', async () => {
      const mockDbLead = { id: 'lead-123', company_name: 'Test Company Inc', is_active: true } as any;
      const mockLead = { id: 'lead-123', company: { name: 'Test Company Inc' } } as any;

      MockedLead.findByEmail.mockResolvedValue([]);
      MockedLead.findDuplicates.mockResolvedValueOnce([]).mockResolvedValueOnce([mockDbLead]);
      MockedLead.transformToLeadType.mockReturnValue(mockLead);

      const result = await LeadService.detectDuplicates({ companyName: 'Test Company' });

      expect(result).toHaveLength(1);
      expect(result[0].matchType).toBe('company');
      expect(result[0].confidence).toBeGreaterThan(0.7);
    });
  });

  describe('getLeadStatistics', () => {
    it('should return lead statistics', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '10' }),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue([
          { status: 'new', count: '5' },
          { status: 'contacted', count: '3' }
        ])
      };

      MockedLead.query = mockQuery as any;

      const result = await LeadService.getLeadStatistics();

      expect(result.total).toBe(10);
      expect(result.byStatus).toEqual({
        new: 5,
        contacted: 3
      });
    });
  });
});