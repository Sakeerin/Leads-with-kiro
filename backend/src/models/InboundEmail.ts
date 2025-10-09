import { BaseModel } from './BaseModel';
import { InboundEmail, InboundEmailTable } from '../types';

export class InboundEmailModel extends BaseModel {
  static tableName = 'inbound_emails';

  static async create(data: Omit<InboundEmail, 'id'>): Promise<InboundEmail> {
    const [inboundEmail] = await this.db(this.tableName)
      .insert({
        lead_id: data.leadId,
        from_email: data.from,
        to_email: data.to,
        subject: data.subject,
        body: data.body,
        html_body: data.htmlBody,
        message_id: data.messageId,
        in_reply_to: data.inReplyTo,
        references: data.references,
        received_at: data.receivedAt,
        processed: data.processed,
        processed_at: data.processedAt,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null
      })
      .returning('*');

    return this.mapFromDb(inboundEmail);
  }

  static async findById(id: string): Promise<InboundEmail | null> {
    const inboundEmail = await this.db(this.tableName)
      .where({ id })
      .first();

    return inboundEmail ? this.mapFromDb(inboundEmail) : null;
  }

  static async findByMessageId(messageId: string): Promise<InboundEmail | null> {
    const inboundEmail = await this.db(this.tableName)
      .where({ message_id: messageId })
      .first();

    return inboundEmail ? this.mapFromDb(inboundEmail) : null;
  }

  static async findByLeadId(leadId: string, limit: number = 50): Promise<InboundEmail[]> {
    const inboundEmails = await this.db(this.tableName)
      .where({ lead_id: leadId })
      .orderBy('received_at', 'desc')
      .limit(limit);

    return inboundEmails.map(this.mapFromDb);
  }

  static async findUnprocessed(limit: number = 100): Promise<InboundEmail[]> {
    const inboundEmails = await this.db(this.tableName)
      .where({ processed: false })
      .orderBy('received_at', 'asc')
      .limit(limit);

    return inboundEmails.map(this.mapFromDb);
  }

  static async findByFromEmail(fromEmail: string, limit: number = 50): Promise<InboundEmail[]> {
    const inboundEmails = await this.db(this.tableName)
      .where({ from_email: fromEmail })
      .orderBy('received_at', 'desc')
      .limit(limit);

    return inboundEmails.map(this.mapFromDb);
  }

  static async markAsProcessed(id: string, leadId?: string): Promise<InboundEmail | null> {
    const updateData: Partial<InboundEmailTable> = {
      processed: true,
      processed_at: new Date()
    };

    if (leadId) {
      updateData.lead_id = leadId;
    }

    const [inboundEmail] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return inboundEmail ? this.mapFromDb(inboundEmail) : null;
  }

  static async associateWithLead(id: string, leadId: string): Promise<InboundEmail | null> {
    const [inboundEmail] = await this.db(this.tableName)
      .where({ id })
      .update({ lead_id: leadId })
      .returning('*');

    return inboundEmail ? this.mapFromDb(inboundEmail) : null;
  }

  static async findRecentUnassociated(hours: number = 24, limit: number = 100): Promise<InboundEmail[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const inboundEmails = await this.db(this.tableName)
      .whereNull('lead_id')
      .where('received_at', '>=', cutoffTime)
      .orderBy('received_at', 'desc')
      .limit(limit);

    return inboundEmails.map(this.mapFromDb);
  }

  private static mapFromDb(row: InboundEmailTable): InboundEmail {
    return {
      id: row.id,
      leadId: row.lead_id,
      from: row.from_email,
      to: row.to_email,
      subject: row.subject,
      body: row.body,
      htmlBody: row.html_body,
      messageId: row.message_id,
      inReplyTo: row.in_reply_to,
      references: row.references,
      receivedAt: row.received_at,
      processed: row.processed,
      processedAt: row.processed_at,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined
    };
  }
}