import { BaseModel } from './BaseModel';
import { LeadConversion as LeadConversionType, LeadConversionTable } from '../types';
import db from '../config/database';

export class LeadConversion extends BaseModel {
  protected static override tableName = 'lead_conversions';

  static async findByLeadId(leadId: string): Promise<LeadConversionTable[]> {
    return this.query.where('lead_id', leadId).orderBy('created_at', 'desc');
  }

  static async findByAccountId(accountId: string): Promise<LeadConversionTable[]> {
    return this.query.where('account_id', accountId).orderBy('created_at', 'desc');
  }

  static async findByContactId(contactId: string): Promise<LeadConversionTable[]> {
    return this.query.where('contact_id', contactId).orderBy('created_at', 'desc');
  }

  static async findByOpportunityId(opportunityId: string): Promise<LeadConversionTable[]> {
    return this.query.where('opportunity_id', opportunityId).orderBy('created_at', 'desc');
  }

  static async createConversion(conversionData: Omit<LeadConversionType, 'id' | 'metadata'>): Promise<LeadConversionTable> {
    const dbData: Partial<LeadConversionTable> = {
      lead_id: conversionData.leadId,
      ...(conversionData.accountId && { account_id: conversionData.accountId }),
      ...(conversionData.contactId && { contact_id: conversionData.contactId }),
      ...(conversionData.opportunityId && { opportunity_id: conversionData.opportunityId }),
      conversion_type: conversionData.conversionType,
      lead_data_snapshot: JSON.stringify(conversionData.leadDataSnapshot),
      ...(conversionData.conversionMapping && { 
        conversion_mapping: JSON.stringify(conversionData.conversionMapping) 
      }),
      ...(conversionData.notes && { notes: conversionData.notes })
    };

    return this.create(dbData);
  }

  static async getConversionStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    recentCount: number;
    conversionRate: number;
  }> {
    const [total, byType, recent, totalLeads] = await Promise.all([
      this.query.count('* as count').first(),
      this.query.select('conversion_type').count('* as count').groupBy('conversion_type'),
      this.query
        .where('created_at', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .count('* as count').first(),
      // Get total active leads for conversion rate calculation
      db('leads').where('is_active', true).count('* as count').first()
    ]);

    const typeStats: Record<string, number> = {};
    byType.forEach((row: any) => {
      typeStats[row.conversion_type] = parseInt(row.count);
    });

    const totalConversions = parseInt(total?.['count'] as string) || 0;
    const totalActiveLeads = parseInt(totalLeads?.['count'] as string) || 0;
    const conversionRate = totalActiveLeads > 0 ? (totalConversions / totalActiveLeads) * 100 : 0;

    return {
      total: totalConversions,
      byType: typeStats,
      recentCount: parseInt(recent?.['count'] as string) || 0,
      conversionRate: Math.round(conversionRate * 100) / 100
    };
  }

  static transformToLeadConversionType(dbConversion: LeadConversionTable): LeadConversionType {
    return {
      id: dbConversion.id,
      leadId: dbConversion.lead_id,
      ...(dbConversion.account_id && { accountId: dbConversion.account_id }),
      ...(dbConversion.contact_id && { contactId: dbConversion.contact_id }),
      ...(dbConversion.opportunity_id && { opportunityId: dbConversion.opportunity_id }),
      conversionType: dbConversion.conversion_type,
      leadDataSnapshot: JSON.parse(dbConversion.lead_data_snapshot),
      ...(dbConversion.conversion_mapping && { conversionMapping: JSON.parse(dbConversion.conversion_mapping) }),
      ...(dbConversion.notes && { notes: dbConversion.notes }),
      metadata: {
        createdAt: dbConversion.created_at,
        updatedAt: dbConversion.updated_at,
        convertedBy: dbConversion.converted_by
      }
    };
  }
}