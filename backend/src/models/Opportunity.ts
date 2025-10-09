import { BaseModel } from './BaseModel';
import { Opportunity as OpportunityType, OpportunityTable, OpportunityStage, CloseReason } from '../types';

export class Opportunity extends BaseModel {
  protected static override tableName = 'opportunities';

  static async findByAccountId(accountId: string): Promise<OpportunityTable[]> {
    return this.query.where('account_id', accountId).where('is_active', true);
  }

  static async findByOwnerId(ownerId: string): Promise<OpportunityTable[]> {
    return this.query.where('owner_id', ownerId).where('is_active', true);
  }

  static async findByStage(stage: OpportunityStage): Promise<OpportunityTable[]> {
    return this.query.where('stage', stage).where('is_active', true);
  }

  static async findOpenOpportunities(): Promise<OpportunityTable[]> {
    return this.query
      .whereNotIn('stage', [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
      .where('is_active', true)
      .orderBy('expected_close_date', 'asc');
  }

  static async searchOpportunities(searchTerm: string, filters: Record<string, any> = {}, limit: number = 20): Promise<OpportunityTable[]> {
    let query = this.query.where('is_active', true);

    if (searchTerm) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${searchTerm}%`)
          .orWhere('description', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(key, value);
      }
    });

    return query
      .orderBy('expected_close_date', 'asc')
      .limit(limit);
  }

  static async createOpportunity(opportunityData: Omit<OpportunityType, 'id' | 'metadata'>): Promise<OpportunityTable> {
    const dbData: Partial<OpportunityTable> = {
      name: opportunityData.name,
      account_id: opportunityData.accountId,
      ...(opportunityData.primaryContactId && { primary_contact_id: opportunityData.primaryContactId }),
      owner_id: opportunityData.ownerId,
      stage: opportunityData.stage,
      ...(opportunityData.amount !== undefined && { amount: opportunityData.amount }),
      currency: opportunityData.currency,
      probability: opportunityData.probability,
      ...(opportunityData.expectedCloseDate && { expected_close_date: opportunityData.expectedCloseDate }),
      ...(opportunityData.actualCloseDate && { actual_close_date: opportunityData.actualCloseDate }),
      ...(opportunityData.closeReason && { close_reason: opportunityData.closeReason }),
      ...(opportunityData.closeNotes && { close_notes: opportunityData.closeNotes }),
      ...(opportunityData.leadSource && { lead_source: opportunityData.leadSource }),
      ...(opportunityData.campaign && { campaign: opportunityData.campaign }),
      ...(opportunityData.description && { description: opportunityData.description }),
      ...(opportunityData.customFields && Object.keys(opportunityData.customFields).length > 0 && { 
        custom_fields: JSON.stringify(opportunityData.customFields) 
      }),
      is_active: true
    };

    return this.create(dbData);
  }

  static async updateOpportunity(id: string, opportunityData: Partial<OpportunityType>): Promise<OpportunityTable> {
    const dbData: Partial<OpportunityTable> = {};
    
    if (opportunityData.name) dbData.name = opportunityData.name;
    if (opportunityData.accountId) dbData.account_id = opportunityData.accountId;
    if (opportunityData.primaryContactId) dbData.primary_contact_id = opportunityData.primaryContactId;
    if (opportunityData.ownerId) dbData.owner_id = opportunityData.ownerId;
    if (opportunityData.stage) dbData.stage = opportunityData.stage;
    if (opportunityData.amount !== undefined) dbData.amount = opportunityData.amount;
    if (opportunityData.currency) dbData.currency = opportunityData.currency;
    if (opportunityData.probability !== undefined) dbData.probability = opportunityData.probability;
    if (opportunityData.expectedCloseDate) dbData.expected_close_date = opportunityData.expectedCloseDate;
    if (opportunityData.actualCloseDate) dbData.actual_close_date = opportunityData.actualCloseDate;
    if (opportunityData.closeReason) dbData.close_reason = opportunityData.closeReason;
    if (opportunityData.closeNotes) dbData.close_notes = opportunityData.closeNotes;
    if (opportunityData.leadSource) dbData.lead_source = opportunityData.leadSource;
    if (opportunityData.campaign) dbData.campaign = opportunityData.campaign;
    if (opportunityData.description) dbData.description = opportunityData.description;
    if (opportunityData.customFields) {
      dbData.custom_fields = JSON.stringify(opportunityData.customFields);
    }

    return this.update(id, dbData);
  }

  static async closeOpportunity(
    id: string, 
    stage: OpportunityStage.CLOSED_WON | OpportunityStage.CLOSED_LOST,
    closeReason: CloseReason,
    closeNotes?: string,
    actualAmount?: number
  ): Promise<OpportunityTable> {
    const updateData: Partial<OpportunityTable> = {
      stage,
      close_reason: closeReason,
      actual_close_date: new Date(),
      ...(closeNotes && { close_notes: closeNotes }),
      ...(actualAmount !== undefined && { amount: actualAmount })
    };

    return this.update(id, updateData);
  }

  static async getOpportunityStatistics(): Promise<{
    total: number;
    byStage: Record<string, number>;
    totalValue: number;
    averageValue: number;
    winRate: number;
  }> {
    const [total, byStage, valueStats, winStats] = await Promise.all([
      this.query.where('is_active', true).count('* as count').first(),
      this.query.where('is_active', true).select('stage').count('* as count').groupBy('stage'),
      this.query.where('is_active', true).sum('amount as total').avg('amount as average').first(),
      this.query.where('is_active', true)
        .whereIn('stage', [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        .select('stage')
        .count('* as count')
        .groupBy('stage')
    ]);

    const stageStats: Record<string, number> = {};
    byStage.forEach((row: any) => {
      stageStats[row.stage] = parseInt(row.count);
    });

    const wonCount = winStats.find((row: any) => row.stage === OpportunityStage.CLOSED_WON)?.['count'] || 0;
    const lostCount = winStats.find((row: any) => row.stage === OpportunityStage.CLOSED_LOST)?.['count'] || 0;
    const totalClosed = parseInt(wonCount as string) + parseInt(lostCount as string);
    const winRate = totalClosed > 0 ? (parseInt(wonCount as string) / totalClosed) * 100 : 0;

    return {
      total: parseInt(total?.['count'] as string) || 0,
      byStage: stageStats,
      totalValue: parseFloat(valueStats?.['total'] as string) || 0,
      averageValue: parseFloat(valueStats?.['average'] as string) || 0,
      winRate: Math.round(winRate * 100) / 100
    };
  }

  static transformToOpportunityType(dbOpportunity: OpportunityTable): OpportunityType {
    return {
      id: dbOpportunity.id,
      name: dbOpportunity.name,
      accountId: dbOpportunity.account_id,
      ...(dbOpportunity.primary_contact_id && { primaryContactId: dbOpportunity.primary_contact_id }),
      ownerId: dbOpportunity.owner_id,
      stage: dbOpportunity.stage,
      ...(dbOpportunity.amount && { amount: dbOpportunity.amount }),
      currency: dbOpportunity.currency,
      probability: dbOpportunity.probability,
      ...(dbOpportunity.expected_close_date && { expectedCloseDate: dbOpportunity.expected_close_date }),
      ...(dbOpportunity.actual_close_date && { actualCloseDate: dbOpportunity.actual_close_date }),
      ...(dbOpportunity.close_reason && { closeReason: dbOpportunity.close_reason }),
      ...(dbOpportunity.close_notes && { closeNotes: dbOpportunity.close_notes }),
      ...(dbOpportunity.lead_source && { leadSource: dbOpportunity.lead_source }),
      ...(dbOpportunity.campaign && { campaign: dbOpportunity.campaign }),
      ...(dbOpportunity.description && { description: dbOpportunity.description }),
      customFields: dbOpportunity.custom_fields ? JSON.parse(dbOpportunity.custom_fields) : {},
      metadata: {
        createdAt: dbOpportunity.created_at,
        updatedAt: dbOpportunity.updated_at,
        createdBy: dbOpportunity.created_by,
        isActive: dbOpportunity.is_active
      }
    };
  }
}