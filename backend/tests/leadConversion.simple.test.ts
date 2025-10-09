import { ConversionType, LeadStatus, OpportunityStage, CloseReason } from '../src/types';

describe('Lead Conversion Types', () => {
  it('should have correct conversion types', () => {
    expect(ConversionType.FULL).toBe('full');
    expect(ConversionType.ACCOUNT_ONLY).toBe('account_only');
    expect(ConversionType.CONTACT_ONLY).toBe('contact_only');
  });

  it('should have correct opportunity stages', () => {
    expect(OpportunityStage.PROSPECTING).toBe('prospecting');
    expect(OpportunityStage.QUALIFICATION).toBe('qualification');
    expect(OpportunityStage.NEEDS_ANALYSIS).toBe('needs_analysis');
    expect(OpportunityStage.PROPOSAL).toBe('proposal');
    expect(OpportunityStage.NEGOTIATION).toBe('negotiation');
    expect(OpportunityStage.CLOSED_WON).toBe('closed_won');
    expect(OpportunityStage.CLOSED_LOST).toBe('closed_lost');
  });

  it('should have correct close reasons', () => {
    expect(CloseReason.WON_NEW_BUSINESS).toBe('won_new_business');
    expect(CloseReason.WON_EXPANSION).toBe('won_expansion');
    expect(CloseReason.WON_RENEWAL).toBe('won_renewal');
    expect(CloseReason.LOST_COMPETITOR).toBe('lost_competitor');
    expect(CloseReason.LOST_BUDGET).toBe('lost_budget');
    expect(CloseReason.LOST_TIMING).toBe('lost_timing');
    expect(CloseReason.LOST_NO_DECISION).toBe('lost_no_decision');
    expect(CloseReason.DISQUALIFIED_NOT_FIT).toBe('disqualified_not_fit');
    expect(CloseReason.DISQUALIFIED_BUDGET).toBe('disqualified_budget');
    expect(CloseReason.DISQUALIFIED_AUTHORITY).toBe('disqualified_authority');
  });

  it('should have correct lead statuses for conversion', () => {
    expect(LeadStatus.WON).toBe('won');
    expect(LeadStatus.LOST).toBe('lost');
    expect(LeadStatus.DISQUALIFIED).toBe('disqualified');
  });
});