import { Lead } from '../models/Lead';
import { Account } from '../models/Account';
import { Contact } from '../models/Contact';
import { Opportunity } from '../models/Opportunity';
import { LeadConversion } from '../models/LeadConversion';
import { Activity } from '../models/Activity';
import { 
  Lead as LeadType, 
  Account as AccountType, 
  Contact as ContactType, 
  Opportunity as OpportunityType,
  LeadConversion as LeadConversionType,
  ConversionType,
  OpportunityStage,
  LeadStatus,
  CloseReason
} from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';
import { workflowTrigger } from './workflowTrigger';

export interface ConversionRequest {
  leadId: string;
  conversionType: ConversionType;
  accountData?: {
    name?: string;
    industry?: string;
    size?: string;
    website?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    description?: string;
    customFields?: Record<string, any>;
  };
  contactData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    title?: string;
    department?: string;
    isPrimary?: boolean;
    isDecisionMaker?: boolean;
    customFields?: Record<string, any>;
  };
  opportunityData?: {
    name?: string;
    stage?: OpportunityStage;
    amount?: number;
    currency?: string;
    probability?: number;
    expectedCloseDate?: Date;
    description?: string;
    customFields?: Record<string, any>;
  };
  existingAccountId?: string;
  existingContactId?: string;
  notes?: string;
  convertedBy: string;
}

export interface ConversionResult {
  success: boolean;
  leadConversion: LeadConversionType;
  account?: AccountType;
  contact?: ContactType;
  opportunity?: OpportunityType;
  duplicateAccountsFound?: AccountType[];
  warnings?: string[];
}

export interface ConversionPreview {
  lead: LeadType;
  suggestedAccountName: string;
  suggestedContactName: string;
  suggestedOpportunityName: string;
  duplicateAccounts: AccountType[];
  duplicateContacts: ContactType[];
  fieldMapping: {
    account: Record<string, any>;
    contact: Record<string, any>;
    opportunity: Record<string, any>;
  };
  warnings: string[];
}

export interface LeadClosureRequest {
  leadId: string;
  status: LeadStatus.WON | LeadStatus.LOST | LeadStatus.DISQUALIFIED;
  closeReason: CloseReason;
  closeNotes?: string;
  closedBy: string;
}

export class LeadConversionService {
  /**
   * Generate a preview of what the conversion would create
   */
  static async generateConversionPreview(leadId: string): Promise<ConversionPreview> {
    const dbLead = await Lead.findById(leadId);
    if (!dbLead) {
      throw new NotFoundError(`Lead with ID ${leadId} not found`);
    }

    const lead = Lead.transformToLeadType(dbLead);

    // Check for duplicate accounts
    const duplicateAccounts = await Account.findByName(lead.company.name);
    const duplicateAccountsTyped = duplicateAccounts.map(acc => Account.transformToAccountType(acc));

    // Check for duplicate contacts
    const duplicateContacts = await Contact.findByEmail(lead.contact.email);
    const duplicateContactsTyped = duplicateContacts.map(contact => Contact.transformToContactType(contact));

    // Generate suggested names
    const suggestedAccountName = lead.company.name;
    const suggestedContactName = lead.contact.name;
    const suggestedOpportunityName = `${lead.company.name} - ${lead.product.type || 'Opportunity'}`;

    // Generate field mapping
    const fieldMapping = {
      account: {
        name: lead.company.name,
        industry: lead.company.industry,
        size: lead.company.size,
        customFields: lead.customFields
      },
      contact: {
        firstName: lead.contact.name.split(' ')[0],
        lastName: lead.contact.name.split(' ').slice(1).join(' ') || '',
        email: lead.contact.email,
        phone: lead.contact.phone,
        mobile: lead.contact.mobile,
        isPrimary: true,
        isDecisionMaker: lead.qualification.businessType === 'b2b',
        customFields: lead.customFields
      },
      opportunity: {
        name: suggestedOpportunityName,
        stage: this.mapLeadStatusToOpportunityStage(lead.status),
        probability: this.calculateProbabilityFromScore(lead.score.value),
        leadSource: lead.source.channel,
        campaign: lead.source.campaign,
        description: lead.followUp.notes,
        customFields: lead.customFields
      }
    };

    // Generate warnings
    const warnings: string[] = [];
    if (duplicateAccountsTyped.length > 0) {
      warnings.push(`Found ${duplicateAccountsTyped.length} potential duplicate account(s)`);
    }
    if (duplicateContactsTyped.length > 0) {
      warnings.push(`Found ${duplicateContactsTyped.length} potential duplicate contact(s)`);
    }
    if (!lead.contact.phone && !lead.contact.mobile) {
      warnings.push('No phone number available for contact');
    }
    if (!lead.company.industry) {
      warnings.push('No industry information available for account');
    }

    return {
      lead,
      suggestedAccountName,
      suggestedContactName,
      suggestedOpportunityName,
      duplicateAccounts: duplicateAccountsTyped,
      duplicateContacts: duplicateContactsTyped,
      fieldMapping,
      warnings
    };
  }

  /**
   * Convert a lead to account, contact, and opportunity
   */
  static async convertLead(request: ConversionRequest): Promise<ConversionResult> {
    const dbLead = await Lead.findById(request.leadId);
    if (!dbLead) {
      throw new NotFoundError(`Lead with ID ${request.leadId} not found`);
    }

    const lead = Lead.transformToLeadType(dbLead);
    
    // Validate lead status
    if (lead.status === LeadStatus.WON || lead.status === LeadStatus.LOST || lead.status === LeadStatus.DISQUALIFIED) {
      throw new ValidationError('Cannot convert a lead that is already closed');
    }

    const result: ConversionResult = {
      success: false,
      leadConversion: {} as LeadConversionType,
      warnings: []
    };

    let accountId: string | undefined;
    let contactId: string | undefined;
    let opportunityId: string | undefined;

    try {
      // Handle account creation or selection
      if (request.conversionType === ConversionType.FULL || request.conversionType === ConversionType.ACCOUNT_ONLY) {
        if (request.existingAccountId) {
          // Use existing account
          const existingAccount = await Account.findById(request.existingAccountId);
          if (!existingAccount) {
            throw new NotFoundError(`Account with ID ${request.existingAccountId} not found`);
          }
          accountId = request.existingAccountId;
          result.account = Account.transformToAccountType(existingAccount);
        } else {
          // Check for duplicate accounts
          const duplicateAccounts = await Account.findExactByName(request.accountData?.name || lead.company.name);
          if (duplicateAccounts) {
            result.duplicateAccountsFound = [Account.transformToAccountType(duplicateAccounts)];
            result.warnings?.push('Duplicate account found but proceeding with creation');
          }

          // Create new account
          const accountData: Omit<AccountType, 'id' | 'metadata'> = {
            name: request.accountData?.name || lead.company.name,
            ...(request.accountData?.industry || lead.company.industry ? { industry: request.accountData?.industry || lead.company.industry } : {}),
            ...(request.accountData?.size || lead.company.size ? { size: request.accountData?.size as any || lead.company.size } : {}),
            ...(request.accountData?.website ? { website: request.accountData.website } : {}),
            ...(request.accountData?.phone ? { phone: request.accountData.phone } : {}),
            ...(request.accountData?.address ? { address: request.accountData.address } : {}),
            ...(request.accountData?.city ? { city: request.accountData.city } : {}),
            ...(request.accountData?.state ? { state: request.accountData.state } : {}),
            ...(request.accountData?.country ? { country: request.accountData.country } : {}),
            ...(request.accountData?.postalCode ? { postalCode: request.accountData.postalCode } : {}),
            ...(request.accountData?.description ? { description: request.accountData.description } : {}),
            customFields: request.accountData?.customFields || {}
          };

          const dbAccount = await Account.createAccount(accountData);
          accountId = dbAccount.id;
          result.account = Account.transformToAccountType(dbAccount);

          // Log account creation activity
          await Activity.logLeadUpdated(request.leadId, request.convertedBy, {
            account_created: { old: null, new: result.account }
          });
        }
      }

      // Handle contact creation or selection
      if (request.conversionType === ConversionType.FULL || request.conversionType === ConversionType.CONTACT_ONLY) {
        if (!accountId) {
          throw new ValidationError('Account ID is required for contact creation');
        }

        if (request.existingContactId) {
          // Use existing contact
          const existingContact = await Contact.findById(request.existingContactId);
          if (!existingContact) {
            throw new NotFoundError(`Contact with ID ${request.existingContactId} not found`);
          }
          contactId = request.existingContactId;
          result.contact = Contact.transformToContactType(existingContact);
        } else {
          // Create new contact
          const nameParts = (request.contactData?.firstName && request.contactData?.lastName) 
            ? [request.contactData.firstName, request.contactData.lastName]
            : lead.contact.name.split(' ');
          
          const contactData: Omit<ContactType, 'id' | 'metadata'> = {
            accountId: accountId,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: request.contactData?.email || lead.contact.email,
            ...(request.contactData?.phone || lead.contact.phone ? { phone: request.contactData?.phone || lead.contact.phone } : {}),
            ...(request.contactData?.mobile || lead.contact.mobile ? { mobile: request.contactData?.mobile || lead.contact.mobile } : {}),
            ...(request.contactData?.title ? { title: request.contactData.title } : {}),
            ...(request.contactData?.department ? { department: request.contactData.department } : {}),
            isPrimary: request.contactData?.isPrimary ?? true,
            isDecisionMaker: request.contactData?.isDecisionMaker ?? (lead.qualification.businessType === 'b2b'),
            customFields: request.contactData?.customFields || {}
          };

          const dbContact = await Contact.createContact(contactData);
          contactId = dbContact.id;
          result.contact = Contact.transformToContactType(dbContact);

          // Log contact creation activity
          await Activity.logLeadUpdated(request.leadId, request.convertedBy, {
            contact_created: { old: null, new: result.contact }
          });
        }
      }

      // Handle opportunity creation (only for full conversion)
      if (request.conversionType === ConversionType.FULL) {
        if (!accountId) {
          throw new ValidationError('Account ID is required for opportunity creation');
        }

        const opportunityData: Omit<OpportunityType, 'id' | 'metadata'> = {
          name: request.opportunityData?.name || `${lead.company.name} - ${lead.product.type || 'Opportunity'}`,
          accountId: accountId,
          ...(contactId ? { primaryContactId: contactId } : {}),
          ownerId: lead.assignment.assignedTo || request.convertedBy,
          stage: request.opportunityData?.stage || this.mapLeadStatusToOpportunityStage(lead.status),
          ...(request.opportunityData?.amount ? { amount: request.opportunityData.amount } : {}),
          currency: request.opportunityData?.currency || 'USD',
          probability: request.opportunityData?.probability || this.calculateProbabilityFromScore(lead.score.value),
          ...(request.opportunityData?.expectedCloseDate || lead.followUp.nextDate ? { expectedCloseDate: request.opportunityData?.expectedCloseDate || lead.followUp.nextDate } : {}),
          ...(lead.source.channel ? { leadSource: lead.source.channel } : {}),
          ...(lead.source.campaign ? { campaign: lead.source.campaign } : {}),
          ...(request.opportunityData?.description || lead.followUp.notes ? { description: request.opportunityData?.description || lead.followUp.notes } : {}),
          customFields: request.opportunityData?.customFields || {}
        };

        const dbOpportunity = await Opportunity.createOpportunity(opportunityData);
        opportunityId = dbOpportunity.id;
        result.opportunity = Opportunity.transformToOpportunityType(dbOpportunity);

        // Log opportunity creation activity
        await Activity.logLeadUpdated(request.leadId, request.convertedBy, {
          opportunity_created: { old: null, new: result.opportunity }
        });
      }

      // Create conversion record
      const conversionData: Omit<LeadConversionType, 'id' | 'metadata'> = {
        leadId: request.leadId,
        ...(accountId ? { accountId } : {}),
        ...(contactId ? { contactId } : {}),
        ...(opportunityId ? { opportunityId } : {}),
        conversionType: request.conversionType,
        leadDataSnapshot: lead,
        ...(result.account || result.contact || result.opportunity ? {
          conversionMapping: {
            accountMapping: result.account ? this.generateAccountMapping(lead, result.account) : null,
            contactMapping: result.contact ? this.generateContactMapping(lead, result.contact) : null,
            opportunityMapping: result.opportunity ? this.generateOpportunityMapping(lead, result.opportunity) : null
          }
        } : {}),
        ...(request.notes ? { notes: request.notes } : {})
      };

      const dbConversion = await LeadConversion.createConversion(conversionData);
      result.leadConversion = LeadConversion.transformToLeadConversionType(dbConversion);

      // Update lead status to converted
      await Lead.updateLead(request.leadId, { status: LeadStatus.WON });

      // Log conversion activity
      await Activity.logLeadUpdated(request.leadId, request.convertedBy, {
        converted: { 
          old: lead.status, 
          new: LeadStatus.WON,
          conversionType: request.conversionType,
          accountId,
          contactId,
          opportunityId
        }
      });

      // Trigger workflow automation
      try {
        await workflowTrigger.onLeadConverted(
          request.leadId,
          request.convertedBy,
          request.conversionType,
          { 
            ...(accountId ? { accountId } : {}),
            ...(contactId ? { contactId } : {}),
            ...(opportunityId ? { opportunityId } : {})
          }
        );
      } catch (error) {
        console.warn('Failed to trigger conversion workflows:', error);
      }

      result.success = true;
      return result;

    } catch (error) {
      // Rollback any created entities on error
      if (opportunityId) {
        try {
          await Opportunity.delete(opportunityId);
        } catch (rollbackError) {
          console.error('Failed to rollback opportunity creation:', rollbackError);
        }
      }
      if (contactId && !request.existingContactId) {
        try {
          await Contact.delete(contactId);
        } catch (rollbackError) {
          console.error('Failed to rollback contact creation:', rollbackError);
        }
      }
      if (accountId && !request.existingAccountId) {
        try {
          await Account.delete(accountId);
        } catch (rollbackError) {
          console.error('Failed to rollback account creation:', rollbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Close a lead with Won/Lost/Disqualified status
   */
  static async closeLead(request: LeadClosureRequest): Promise<LeadType> {
    const dbLead = await Lead.findById(request.leadId);
    if (!dbLead) {
      throw new NotFoundError(`Lead with ID ${request.leadId} not found`);
    }

    const lead = Lead.transformToLeadType(dbLead);

    // Validate current status
    if (lead.status === LeadStatus.WON || lead.status === LeadStatus.LOST || lead.status === LeadStatus.DISQUALIFIED) {
      throw new ValidationError('Lead is already closed');
    }

    // Update lead status
    const updatedDbLead = await Lead.updateLead(request.leadId, { 
      status: request.status 
    });
    const updatedLead = Lead.transformToLeadType(updatedDbLead);

    // Log closure activity
    await Activity.logLeadUpdated(request.leadId, request.closedBy, {
      closed: { 
        old: lead.status, 
        new: request.status,
        closeReason: request.closeReason,
        closeNotes: request.closeNotes
      }
    });

    // Create a closure record in lead_conversions for audit trail
    const conversionData: Omit<LeadConversionType, 'id' | 'metadata'> = {
      leadId: request.leadId,
      conversionType: ConversionType.ACCOUNT_ONLY, // Placeholder type for closure
      leadDataSnapshot: lead,
      conversionMapping: {
        closeReason: request.closeReason,
        closeNotes: request.closeNotes,
        closureType: 'direct_closure'
      },
      notes: `Lead closed as ${request.status}: ${request.closeReason}${request.closeNotes ? ` - ${request.closeNotes}` : ''}`
    };

    await LeadConversion.createConversion(conversionData);

    // Trigger workflow automation
    try {
      await workflowTrigger.onLeadClosed(
        request.leadId,
        request.closedBy,
        request.status,
        request.closeReason
      );
    } catch (error) {
      console.warn('Failed to trigger closure workflows:', error);
    }

    return updatedLead;
  }

  /**
   * Get conversion history for a lead
   */
  static async getLeadConversionHistory(leadId: string): Promise<LeadConversionType[]> {
    const dbConversions = await LeadConversion.findByLeadId(leadId);
    return dbConversions.map(conv => LeadConversion.transformToLeadConversionType(conv));
  }

  /**
   * Get conversion statistics
   */
  static async getConversionStatistics(): Promise<{
    totalConversions: number;
    conversionsByType: Record<string, number>;
    recentConversions: number;
    conversionRate: number;
    averageTimeToConversion: number;
  }> {
    const stats = await LeadConversion.getConversionStatistics();
    
    // Calculate average time to conversion
    const conversions = await LeadConversion.query
      .join('leads', 'lead_conversions.lead_id', 'leads.id')
      .select('lead_conversions.created_at as conversion_date', 'leads.created_at as lead_date')
      .limit(100);

    let totalDays = 0;
    let validConversions = 0;

    conversions.forEach((conv: any) => {
      const leadDate = new Date(conv.lead_date);
      const conversionDate = new Date(conv.conversion_date);
      const daysDiff = Math.floor((conversionDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0) {
        totalDays += daysDiff;
        validConversions++;
      }
    });

    const averageTimeToConversion = validConversions > 0 ? Math.round(totalDays / validConversions) : 0;

    return {
      totalConversions: stats.total,
      conversionsByType: stats.byType,
      recentConversions: stats.recentCount,
      conversionRate: stats.conversionRate,
      averageTimeToConversion
    };
  }

  /**
   * Helper method to map lead status to opportunity stage
   */
  private static mapLeadStatusToOpportunityStage(leadStatus: LeadStatus): OpportunityStage {
    switch (leadStatus) {
      case LeadStatus.NEW:
      case LeadStatus.CONTACTED:
        return OpportunityStage.PROSPECTING;
      case LeadStatus.QUALIFIED:
        return OpportunityStage.QUALIFICATION;
      case LeadStatus.PROPOSAL:
        return OpportunityStage.PROPOSAL;
      case LeadStatus.NEGOTIATION:
        return OpportunityStage.NEGOTIATION;
      case LeadStatus.WON:
        return OpportunityStage.CLOSED_WON;
      case LeadStatus.LOST:
      case LeadStatus.DISQUALIFIED:
        return OpportunityStage.CLOSED_LOST;
      case LeadStatus.NURTURE:
        return OpportunityStage.PROSPECTING;
      default:
        return OpportunityStage.PROSPECTING;
    }
  }

  /**
   * Helper method to calculate probability from lead score
   */
  private static calculateProbabilityFromScore(score: number): number {
    // Simple mapping: score 0-100 maps to probability 0-100
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Generate account field mapping for audit trail
   */
  private static generateAccountMapping(lead: LeadType, account: AccountType): Record<string, any> {
    return {
      name: { source: lead.company.name, target: account.name },
      industry: { source: lead.company.industry, target: account.industry },
      size: { source: lead.company.size, target: account.size }
    };
  }

  /**
   * Generate contact field mapping for audit trail
   */
  private static generateContactMapping(lead: LeadType, contact: ContactType): Record<string, any> {
    return {
      name: { source: lead.contact.name, target: `${contact.firstName} ${contact.lastName}` },
      email: { source: lead.contact.email, target: contact.email },
      phone: { source: lead.contact.phone, target: contact.phone },
      mobile: { source: lead.contact.mobile, target: contact.mobile }
    };
  }

  /**
   * Generate opportunity field mapping for audit trail
   */
  private static generateOpportunityMapping(lead: LeadType, opportunity: OpportunityType): Record<string, any> {
    return {
      name: { source: `${lead.company.name} - Lead`, target: opportunity.name },
      stage: { source: lead.status, target: opportunity.stage },
      leadSource: { source: lead.source.channel, target: opportunity.leadSource },
      campaign: { source: lead.source.campaign, target: opportunity.campaign }
    };
  }
}