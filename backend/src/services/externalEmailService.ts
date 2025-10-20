import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { loggingService } from './loggingService';

export interface EmailProvider {
  sendEmail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<EmailResult>;
  getEmails(folderId?: string, limit?: number): Promise<Email[]>;
  createFolder(name: string): Promise<string>;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailResult {
  messageId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface Email {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: Date;
  attachments: EmailAttachment[];
}

class MicrosoftGraphAuthProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export class Microsoft365EmailService implements EmailProvider {
  private client: Client;

  constructor(accessToken: string) {
    const authProvider = new MicrosoftGraphAuthProvider(accessToken);
    this.client = Client.initWithMiddleware({ authProvider });
  }

  async sendEmail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<EmailResult> {
    try {
      const message = {
        subject,
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients: [{
          emailAddress: {
            address: to
          }
        }],
        attachments: attachments?.map(att => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.filename,
          contentType: att.contentType,
          contentBytes: att.content.toString('base64')
        }))
      };

      const response = await this.client.api('/me/sendMail').post({
        message,
        saveToSentItems: true
      });

      loggingService.info('Email sent via Microsoft 365', { to, subject });
      return {
        messageId: response.id || 'unknown',
        status: 'sent'
      };
    } catch (error) {
      loggingService.error('Failed to send email via Microsoft 365', error instanceof Error ? error : new Error('Unknown error'), { to, subject });
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getEmails(folderId = 'inbox', limit = 50): Promise<Email[]> {
    try {
      const response = await this.client
        .api(`/me/mailFolders/${folderId}/messages`)
        .top(limit)
        .select('id,subject,from,toRecipients,body,receivedDateTime,hasAttachments')
        .get();

      const emails: Email[] = [];
      for (const message of response.value) {
        const email: Email = {
          id: message.id,
          subject: message.subject || '',
          from: message.from?.emailAddress?.address || '',
          to: message.toRecipients?.map((r: any) => r.emailAddress.address) || [],
          body: message.body?.content || '',
          receivedAt: new Date(message.receivedDateTime),
          attachments: []
        };

        // Get attachments if they exist
        if (message.hasAttachments) {
          const attachmentsResponse = await this.client
            .api(`/me/messages/${message.id}/attachments`)
            .get();

          email.attachments = attachmentsResponse.value.map((att: any) => ({
            filename: att.name,
            content: Buffer.from(att.contentBytes, 'base64'),
            contentType: att.contentType
          }));
        }

        emails.push(email);
      }

      return emails;
    } catch (error) {
      loggingService.error('Failed to get emails from Microsoft 365', error instanceof Error ? error : new Error('Unknown error'), { folderId });
      throw error;
    }
  }

  async createFolder(name: string): Promise<string> {
    try {
      const response = await this.client.api('/me/mailFolders').post({
        displayName: name
      });

      return response.id;
    } catch (error) {
      loggingService.error('Failed to create folder in Microsoft 365', error instanceof Error ? error : new Error('Unknown error'), { name });
      throw error;
    }
  }
}

export class GmailEmailService implements EmailProvider {
  private gmail: any;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async sendEmail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<EmailResult> {
    try {
      let message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        body
      ].join('\n');

      if (attachments && attachments.length > 0) {
        const boundary = 'boundary_' + Date.now();
        message = [
          `To: ${to}`,
          `Subject: ${subject}`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=utf-8',
          '',
          body,
          ''
        ].join('\n');

        for (const attachment of attachments) {
          message += [
            `--${boundary}`,
            `Content-Type: ${attachment.contentType}`,
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            'Content-Transfer-Encoding: base64',
            '',
            attachment.content.toString('base64'),
            ''
          ].join('\n');
        }

        message += `--${boundary}--`;
      }

      const encodedMessage = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      loggingService.info('Email sent via Gmail', { to, subject });
      return {
        messageId: response.data.id,
        status: 'sent'
      };
    } catch (error) {
      loggingService.error('Failed to send email via Gmail', error instanceof Error ? error : new Error('Unknown error'), { to, subject });
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getEmails(labelId = 'INBOX', limit = 50): Promise<Email[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        labelIds: [labelId],
        maxResults: limit
      });

      const emails: Email[] = [];
      for (const message of response.data.messages || []) {
        const messageDetail = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });

        const headers = messageDetail.data.payload.headers;
        const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';

        const email: Email = {
          id: message.id,
          subject: getHeader('Subject'),
          from: getHeader('From'),
          to: getHeader('To').split(',').map((t: string) => t.trim()),
          body: this.extractEmailBody(messageDetail.data.payload),
          receivedAt: new Date(parseInt(messageDetail.data.internalDate)),
          attachments: this.extractAttachments(messageDetail.data.payload)
        };

        emails.push(email);
      }

      return emails;
    } catch (error) {
      loggingService.error('Failed to get emails from Gmail', error instanceof Error ? error : new Error('Unknown error'), { labelId });
      throw error;
    }
  }

  async createFolder(name: string): Promise<string> {
    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });

      return response.data.id;
    } catch (error) {
      loggingService.error('Failed to create label in Gmail', error instanceof Error ? error : new Error('Unknown error'), { name });
      throw error;
    }
  }

  private extractEmailBody(payload: any): string {
    if (payload.body && payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString();
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
          if (part.body && part.body.data) {
            return Buffer.from(part.body.data, 'base64').toString();
          }
        }
      }
    }

    return '';
  }

  private extractAttachments(payload: any): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.body && part.body.attachmentId) {
          attachments.push({
            filename: part.filename,
            content: Buffer.from(part.body.data || '', 'base64'),
            contentType: part.mimeType
          });
        }
      }
    }

    return attachments;
  }
}

export class ExternalEmailService {
  private providers: Map<string, EmailProvider> = new Map();

  registerProvider(name: string, provider: EmailProvider): void {
    this.providers.set(name, provider);
  }

  async sendEmail(
    providerName: string,
    to: string,
    subject: string,
    body: string,
    attachments?: EmailAttachment[]
  ): Promise<EmailResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Email provider '${providerName}' not found`);
    }

    return provider.sendEmail(to, subject, body, attachments);
  }

  async getEmails(providerName: string, folderId?: string, limit?: number): Promise<Email[]> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Email provider '${providerName}' not found`);
    }

    return provider.getEmails(folderId, limit);
  }

  async createFolder(providerName: string, name: string): Promise<string> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Email provider '${providerName}' not found`);
    }

    return provider.createFolder(name);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}