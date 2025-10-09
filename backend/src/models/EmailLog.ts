import { BaseModel } from './BaseModel';
import { EmailLog, EmailLogTable, EmailStatus } from '../types';

export class EmailLogModel extends BaseModel {
  static tableName = 'email_logs';

  static async create(data: Omit<EmailLog, 'id' | 'createdAt'>): Promise<EmailLog> {
    const [emailLog] = await this.db(this.tableName)
      .insert({
        lead_id: data.leadId,
        template_id: data.templateId,
        to_email: data.to,
        cc_email: data.cc,
        bcc_email: data.bcc,
        subject: data.subject,
        body: data.body,
        status: data.status,
        sent_at: data.sentAt,
        delivered_at: data.deliveredAt,
        opened_at: data.openedAt,
        clicked_at: data.clickedAt,
        replied_at: data.repliedAt,
        bounced_at: data.bouncedAt,
        error_message: data.errorMessage,
        message_id: data.messageId,
        sent_by: data.sentBy
      })
      .returning('*');

    return this.mapFromDb(emailLog);
  }

  static async findById(id: string): Promise<EmailLog | null> {
    const emailLog = await this.db(this.tableName)
      .where({ id })
      .first();

    return emailLog ? this.mapFromDb(emailLog) : null;
  }

  static async findByLeadId(leadId: string, limit: number = 50): Promise<EmailLog[]> {
    const emailLogs = await this.db(this.tableName)
      .where({ lead_id: leadId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return emailLogs.map(this.mapFromDb);
  }

  static async findByMessageId(messageId: string): Promise<EmailLog | null> {
    const emailLog = await this.db(this.tableName)
      .where({ message_id: messageId })
      .first();

    return emailLog ? this.mapFromDb(emailLog) : null;
  }

  static async findByStatus(status: EmailStatus, limit: number = 100): Promise<EmailLog[]> {
    const emailLogs = await this.db(this.tableName)
      .where({ status })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return emailLogs.map(this.mapFromDb);
  }

  static async updateStatus(id: string, status: EmailStatus, metadata?: Partial<EmailLog>): Promise<EmailLog | null> {
    const updateData: Partial<EmailLogTable> = { status };

    if (metadata?.sentAt) updateData.sent_at = metadata.sentAt;
    if (metadata?.deliveredAt) updateData.delivered_at = metadata.deliveredAt;
    if (metadata?.openedAt) updateData.opened_at = metadata.openedAt;
    if (metadata?.clickedAt) updateData.clicked_at = metadata.clickedAt;
    if (metadata?.repliedAt) updateData.replied_at = metadata.repliedAt;
    if (metadata?.bouncedAt) updateData.bounced_at = metadata.bouncedAt;
    if (metadata?.errorMessage) updateData.error_message = metadata.errorMessage;
    if (metadata?.messageId) updateData.message_id = metadata.messageId;

    const [emailLog] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return emailLog ? this.mapFromDb(emailLog) : null;
  }

  static async getEmailStats(leadId?: string, dateFrom?: Date, dateTo?: Date): Promise<{
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    failed: number;
  }> {
    let query = this.db(this.tableName);

    if (leadId) {
      query = query.where({ lead_id: leadId });
    }

    if (dateFrom) {
      query = query.where('created_at', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('created_at', '<=', dateTo);
    }

    const stats = await query
      .select('status')
      .count('* as count')
      .groupBy('status');

    const result = {
      total: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      bounced: 0,
      failed: 0
    };

    stats.forEach((stat: any) => {
      const count = parseInt(stat.count);
      result.total += count;
      
      switch (stat.status) {
        case EmailStatus.SENT:
          result.sent = count;
          break;
        case EmailStatus.DELIVERED:
          result.delivered = count;
          break;
        case EmailStatus.OPENED:
          result.opened = count;
          break;
        case EmailStatus.CLICKED:
          result.clicked = count;
          break;
        case EmailStatus.REPLIED:
          result.replied = count;
          break;
        case EmailStatus.BOUNCED:
          result.bounced = count;
          break;
        case EmailStatus.FAILED:
          result.failed = count;
          break;
      }
    });

    return result;
  }

  private static mapFromDb(row: EmailLogTable): EmailLog {
    return {
      id: row.id,
      leadId: row.lead_id,
      templateId: row.template_id,
      to: row.to_email,
      cc: row.cc_email,
      bcc: row.bcc_email,
      subject: row.subject,
      body: row.body,
      status: row.status,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      openedAt: row.opened_at,
      clickedAt: row.clicked_at,
      repliedAt: row.replied_at,
      bouncedAt: row.bounced_at,
      errorMessage: row.error_message,
      messageId: row.message_id,
      createdAt: row.created_at,
      sentBy: row.sent_by
    };
  }
}