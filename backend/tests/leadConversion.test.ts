import { LeadConversionService, ConversionRequest, LeadClosureRequest } from '../src/services/leadConversionService';
import { Lead } from '../src/models/Lead';
import { Account } from '../src/models/Account';
import { Contact } from '../src/models/Contact';
import { Opportunity } from '../src/models/Opportunity';
import { LeadConversion } from '../src/models/LeadConversion';
import { ConversionType, LeadStatus, OpportunityStage, CloseReason } from '../src/types';
import { ValidationError, NotFoundError } from '../src/utils/errors';

// Mock the models
jest.mock('../src/models/Lead');
jest.mock('../src/models/Account');
jest.mock('../src/models/Contact');
jest.mock('../src/models/Opportunity');
jest.mock('../src/models/LeadConversion');
jest.mock('../src/models/Activity');
jest.mock('../src/services/workflowTrigger');

const mockLead = Lead as jest.Mocked<typeof Lead>;
const mockAccount = Account as jest.Mocked<typeof Account>;
const mockContact = Contact as jest.Mocked<typeof Contact>;
const mockOpportunity = Opportunity as jest.Mocked<typeof Opportunity>;
const mockLeadConversion = LeadConversion as jest.Mocked<typeof LeadConversion>;

describe('LeadConversionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateConversionPreview', () => {
    it('should generate conversion preview successfully', async () => {
      const mockLeadData = {
        id: 'lead-1',
        account_lead_id: 'AL-24-01-001',
        company_name: 'Test Company',
        company_industry: 'Technology',
        company_size: 'medium',
        contact_name: 'John Doe',
        contact_email: 'john@test.com',
        contact_phone: '+1234567890',
        source_channel: 'web_form',
        status: 'qualified',
        score_value: 75,
        score_band: 'warm',
        score_last_calculated: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1'
      };

      mockLead.findById.mockResolvedValue(mockLeadData as any);
      mockLead.transformToLeadType.mockReturnValue({
        id: 'lead-1',
        accountLeadId: 'AL-24-01-001',
        company: { name: 'Test Company', industry: 'Technology', size: 'medium' },
        contact: { name: 'John Doe', email: 'john@test.com', phone: '+1234567890' },
        source: { channel: 'web_form' },
        assignment: {},
        status: 'qualified',
        score: { value: 75, band: 'warm', lastCalculated: new Date() },
        qualification: { businessType: 'b2b' },
        followUp: { notes: 'Follow up needed' },
        product: { type: 'software' },
        metadata: { createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', isActive: true },
        customFields: {}
      } as any);

      mockAccount.findByName.mockResolvedValue([]);
      mockContact.findByEmail.mockResolvedValue([]);

      const preview = await LeadConversionService.generateConversionPreview('lead-1');

      expect(preview).toBeDefined();
      expect(preview.lead.id).toBe('lead-1');
      expect(preview.suggestedAccountName).toBe('Test Company');
      expect(preview.suggestedContactName).toBe('John Doe');
      expect(preview.suggestedOpportunityName).toBe('Test Company - software');
      expect(preview.duplicateAccounts).toHaveLength(0);
      expect(preview.duplicateContacts).toHaveLength(0);
    });

    it('should throw NotFoundError for non-existent lead', async () => {
      mockLead.findById.mockResolvedValue(undefined);

      await expect(LeadConversionService.generateConversionPreview('non-existent'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('convertLead', () => {
    const mockLeadData = {
      id: 'lead-1',
      account_lead_id: 'AL-24-01-001',
      company_name: 'Test Company',
      contact_name: 'John Doe',
      contact_email: 'john@test.com',
      status: 'qualified',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'user-1'
    };

    beforeEach(() => {
      mockLead.findById.mockResolvedValue(mockLeadData as any);
      mockLead.transformToLeadType.mockReturnValue({
        id: 'lead-1',
        accountLeadId: 'AL-24-01-001',
        company: { name: 'Test Company' },
        contact: { name: 'John Doe', email: 'john@test.com' },
        source: { channel: 'web_form' },
        assignment: { assignedTo: 'user-2' },
        status: 'qualified',
        score: { value: 75, band: 'warm', lastCalculated: new Date() },
        qualification: { businessType: 'b2b' },
        followUp: { notes: 'Follow up needed' },
        product: { type: 'software' },
        metadata: { createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', isActive: true },
        customFields: {}
      } as any);
    });

    it('should convert lead to full conversion successfully', async () => {
      const conversionRequest: ConversionRequest = {
        leadId: 'lead-1',
        conversionType: ConversionType.FULL,
        accountData: { name: 'Test Company' },
        contactData: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        opportunityData: { name: 'Test Opportunity' },
        convertedBy: 'user-1'
      };

      const mockAccountData = { id: 'account-1', name: 'Test Company', created_at: new Date(), updated_at: new Date(), created_by: 'user-1', is_active: true };
      const mockContactData = { id: 'contact-1', account_id: 'account-1', first_name: 'John', last_name: 'Doe', email: 'john@test.com', created_at: new Date(), updated_at: new Date(), created_by: 'user-1', is_active: true, is_primary: true, is_decision_maker: true };
      const mockOpportunityData = { id: 'opportunity-1', account_id: 'account-1', name: 'Test Opportunity', stage: OpportunityStage.QUALIFICATION, created_at: new Date(), updated_at: new Date(), created_by: 'user-1', is_active: true, owner_id: 'user-2', currency: 'USD', probability: 75 };
      const mockConversionData = { id: 'conversion-1', lead_id: 'lead-1', account_id: 'account-1', contact_id: 'contact-1', opportunity_id: 'opportunity-1', conversion_type: ConversionType.FULL, lead_data_snapshot: '{}', created_at: new Date(), updated_at: new Date(), converted_by: 'user-1' };

      mockAccount.findExactByName.mockResolvedValue(undefined);
      mockAccount.createAccount.mockResolvedValue(mockAccountData as any);
      mockAccount.transformToAccountType.mockReturnValue({ id: 'account-1', name: 'Test Company', customFields: {}, metadata: { createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', isActive: true } } as any);

      mockContact.createContact.mockResolvedValue(mockContactData as any);
      mockContact.transformToContactType.mockReturnValue({ id: 'contact-1', accountId: 'account-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', isPrimary: true, isDecisionMaker: true, customFields: {}, metadata: { createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', isActive: true } } as any);

      mockOpportunity.createOpportunity.mockResolvedValue(mockOpportunityData as any);
      mockOpportunity.transformToOpportunityType.mockReturnValue({ id: 'opportunity-1', accountId: 'account-1', name: 'Test Opportunity', ownerId: 'user-2', stage: OpportunityStage.QUALIFICATION, currency: 'USD', probability: 75, customFields: {}, metadata: { createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', isActive: true } } as any);

      mockLeadConversion.createConversion.mockResolvedValue(mockConversionData as any);
      mockLeadConversion.transformToLeadConversionType.mockReturnValue({ id: 'conversion-1', leadId: 'lead-1', accountId: 'account-1', contactId: 'contact-1', opportunityId: 'opportunity-1', conversionType: ConversionType.FULL, leadDataSnapshot: {} as any, metadata: { createdAt: new Date(), updatedAt: new Date(), convertedBy: 'user-1' } } as any);

      mockLead.updateLead.mockResolvedValue(mockLeadData as any);

      const result = await LeadConversionService.convertLead(conversionRequest);

      expect(result.success).toBe(true);
      expect(result.account?.id).toBe('account-1');
      expect(result.contact?.id).toBe('contact-1');
      expect(result.opportunity?.id).toBe('opportunity-1');
      expect(mockAccount.createAccount).toHaveBeenCalled();
      expect(mockContact.createContact).toHaveBeenCalled();
      expect(mockOpportunity.createOpportunity).toHaveBeenCalled();
      expect(mockLeadConversion.createConversion).toHaveBeenCalled();
    });

    it('should handle account-only conversion', async () => {
      const conversionRequest: ConversionRequest = {
        leadId: 'lead-1',
        conversionType: ConversionType.ACCOUNT_ONLY,
        accountData: { name: 'Test Company' },
        convertedBy: 'user-1'
      };

      const mockAccountData = { id: 'account-1', name: 'Test Company', created_at: new Date(), updated_at: new Date(), created_by: 'user-1', is_active: true };
      const mockConversionData = { id: 'conversion-1', lead_id: 'lead-1', account_id: 'account-1', conversion_type: ConversionType.ACCOUNT_ONLY, lead_data_snapshot: '{}', created_at: new Date(), updated_at: new Date(), converted_by: 'user-1' };

      mockAccount.findExactByName.mockResolvedValue(undefined);
      mockAccount.createAccount.mockResolvedValue(mockAccountData as any);
      mockAccount.transformToAccountType.mockReturnValue({ id: 'account-1', name: 'Test Company', customFields: {}, metadata: { createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', isActive: true } } as any);

      mockLeadConversion.createConversion.mockResolvedValue(mockConversionData as any);
      mockLeadConversion.transformToLeadConversionType.mockReturnValue({ id: 'conversion-1', leadId: 'lead-1', accountId: 'account-1', conversionType: ConversionType.ACCOUNT_ONLY, leadDataSnapshot: {} as any, metadata: { createdAt: new Date(), updatedAt: new Date(), convertedBy: 'user-1' } } as any);

      mockLead.updateLead.mockResolvedValue(mockLeadData as any);

      const result = await LeadConversionService.convertLead(conversionRequest);

      expect(result.success).toBe(true);
      expect(result.account?.id).toBe('account-1');
      expect(result.contact).toBeUndefined();
      expect(result.opportunity).toBeUndefined();
      expect(mockAccount.createAccount).toHaveBeenCalled();
      expect(mockContact.createContact).not.toHaveBeenCalled();
      expect(mockOpportunity.createOpportunity).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for already closed lead', async () => {
      const closedLeadData = { ...mockLeadData, status: 'won' };
      mockLead.findById.mockResolvedValue(closedLeadData as any);
      mockLead.transformToLeadType.mockReturnValue({
        id: 'lead-1',
        status: LeadStatus.WON,
        metadata: { isActive: true }
      } as any);

      const conversionRequest: ConversionRequest = {
        leadId: 'lead-1',
        conversionType: ConversionType.FULL,
        convertedBy: 'user-1'
      };

      await expect(LeadConversionService.convertLead(conversionRequest))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('closeLead', () => {
    it('should close lead successfully', async () => {
      const mockLeadData = {
        id: 'lead-1',
        status: 'qualified',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1'
      };

      const mockUpdatedLeadData = { ...mockLeadData, status: 'won' };

      mockLead.findById.mockResolvedValue(mockLeadData as any);
      mockLead.transformToLeadType
        .mockReturnValueOnce({
          id: 'lead-1',
          status: LeadStatus.QUALIFIED,
          metadata: { isActive: true }
        } as any)
        .mockReturnValueOnce({
          id: 'lead-1',
          status: LeadStatus.WON,
          metadata: { isActive: true }
        } as any);

      mockLead.updateLead.mockResolvedValue(mockUpdatedLeadData as any);

      mockLeadConversion.createConversion.mockResolvedValue({
        id: 'conversion-1',
        lead_id: 'lead-1',
        conversion_type: ConversionType.ACCOUNT_ONLY,
        created_at: new Date(),
        updated_at: new Date(),
        converted_by: 'user-1'
      } as any);

      const closureRequest: LeadClosureRequest = {
        leadId: 'lead-1',
        status: LeadStatus.WON,
        closeReason: CloseReason.WON_NEW_BUSINESS,
        closeNotes: 'Successfully closed',
        closedBy: 'user-1'
      };

      const result = await LeadConversionService.closeLead(closureRequest);

      expect(result.id).toBe('lead-1');
      expect(result.status).toBe(LeadStatus.WON);
      expect(mockLead.updateLead).toHaveBeenCalledWith('lead-1', { status: LeadStatus.WON });
      expect(mockLeadConversion.createConversion).toHaveBeenCalled();
    });

    it('should throw ValidationError for already closed lead', async () => {
      const closedLeadData = {
        id: 'lead-1',
        status: 'won',
        is_active: true
      };

      mockLead.findById.mockResolvedValue(closedLeadData as any);
      mockLead.transformToLeadType.mockReturnValue({
        id: 'lead-1',
        status: LeadStatus.WON,
        metadata: { isActive: true }
      } as any);

      const closureRequest: LeadClosureRequest = {
        leadId: 'lead-1',
        status: LeadStatus.LOST,
        closeReason: CloseReason.LOST_COMPETITOR,
        closedBy: 'user-1'
      };

      await expect(LeadConversionService.closeLead(closureRequest))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getConversionStatistics', () => {
    it('should return conversion statistics', async () => {
      const mockStats = {
        total: 100,
        byType: { full: 60, account_only: 30, contact_only: 10 },
        recentCount: 15,
        conversionRate: 25.5
      };

      mockLeadConversion.getConversionStatistics.mockResolvedValue(mockStats);
      (mockLeadConversion as any).query = {
        join: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { conversion_date: new Date(), lead_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        ])
      };

      const statistics = await LeadConversionService.getConversionStatistics();

      expect(statistics.totalConversions).toBe(100);
      expect(statistics.conversionsByType).toEqual(mockStats.byType);
      expect(statistics.recentConversions).toBe(15);
      expect(statistics.conversionRate).toBe(25.5);
      expect(statistics.averageTimeToConversion).toBeGreaterThanOrEqual(0);
    });
  });
});