import { BaseModel } from './BaseModel';
import { CommunicationHistory, CommunicationHistoryTable, CommunicationType, CommunicationDirection } from '../types';

export class CommunicationHistoryModel extends BaseModel {
  static tableName = 'communication_history';

  static async create(data: Omit<CommunicationHistory, 'id'>): Promise<CommunicationHistory> {
    const [communication] = await this.db(this.tableName)
      .insert({
        lead_id: data.leadId,
        type: data.type,
        direction: data.direction,
        subject: data.subject,
        content: data.content,
        metadata: JSON.stringify(data.metadata),
        performed_by: data.performedBy,
        performed_at: data.performedAt,
        related_email_id: data.relatedEmailId,
        related_task_id: data.relatedTaskId
      })
      .returning('*');

    return this.mapFromDb(communication);
  }

  static async findById(id: string): Promise<CommunicationHistory | null> {
    const communication = await this.db(this.tableName)
      .where({ id })
      .first();

    return communication ? this.mapFromDb(communication) : null;
  }

  static async findByLeadId(leadId: string, limit: number = 100): Promise<CommunicationHistory[]> {
    const communications = await this.db(this.tableName)
      .where({ lead_id: leadId })
      .orderBy('performed_at', 'desc')
      .limit(limit);

    return communications.map(this.mapFromDb);
  }

  static async findByType(
    leadId: string, 
    type: CommunicationType, 
    direction?: CommunicationDirection,
    limit: number = 50
  ): Promise<CommunicationHistory[]> {
    let query = this.db(this.tableName)
      .where({ lead_id: leadId, type });

    if (direction) {
      query = query.where({ direction });
    }

    const communications = await query
      .orderBy('performed_at', 'desc')
      .limit(limit);

    return communications.map(this.mapFromDb);
  }

  static async findByDateRange(
    leadId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<CommunicationHistory[]> {
    const communications = await this.db(this.tableName)
      .where({ lead_id: leadId })
      .whereBetween('performed_at', [startDate, endDate])
      .orderBy('performed_at', 'desc')
      .limit(limit);

    return communications.map(this.mapFromDb);
  }

  static async getTimelineForLead(leadId: string, limit: number = 100): Promise<CommunicationHistory[]> {
    const communications = await this.db(this.tableName)
      .where({ lead_id: leadId })
      .orderBy('performed_at', 'desc')
      .limit(limit);

    return communications.map(this.mapFromDb);
  }

  static async getCommunicationStats(
    leadId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    total: number;
    byType: Record<CommunicationType, number>;
    byDirection: Record<CommunicationDirection, number>;
  }> {
    let query = this.db(this.tableName);

    if (leadId) {
      query = query.where({ lead_id: leadId });
    }

    if (dateFrom) {
      query = query.where('performed_at', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('performed_at', '<=', dateTo);
    }

    const [typeStats, directionStats] = await Promise.all([
      query.clone()
        .select('type')
        .count('* as count')
        .groupBy('type'),
      query.clone()
        .select('direction')
        .count('* as count')
        .groupBy('direction')
    ]);

    const byType: Record<CommunicationType, number> = {
      [CommunicationType.EMAIL]: 0,
      [CommunicationType.PHONE]: 0,
      [CommunicationType.SMS]: 0,
      [CommunicationType.WHATSAPP]: 0,
      [CommunicationType.LINE]: 0,
      [CommunicationType.MEETING]: 0,
      [CommunicationType.NOTE]: 0
    };

    const byDirection: Record<CommunicationDirection, number> = {
      [CommunicationDirection.INBOUND]: 0,
      [CommunicationDirection.OUTBOUND]: 0
    };

    let total = 0;

    typeStats.forEach((stat: any) => {
      const count = parseInt(stat.count);
      byType[stat.type as CommunicationType] = count;
      total += count;
    });

    directionStats.forEach((stat: any) => {
      const count = parseInt(stat.count);
      byDirection[stat.direction as CommunicationDirection] = count;
    });

    return { total, byType, byDirection };
  }

  private static mapFromDb(row: CommunicationHistoryTable): CommunicationHistory {
    return {
      id: row.id,
      leadId: row.lead_id,
      type: row.type,
      direction: row.direction,
      subject: row.subject,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      performedBy: row.performed_by,
      performedAt: row.performed_at,
      relatedEmailId: row.related_email_id,
      relatedTaskId: row.related_task_id
    };
  }
}