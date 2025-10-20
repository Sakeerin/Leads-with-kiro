import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { loggingService } from './loggingService';
import { Lead } from '../models/Lead';
import { Account } from '../models/Account';
import { Contact } from '../models/Contact';
import { Opportunity } from '../models/Opportunity';

export interface CRMProvider {
  name: string;
  authenticate(credentials: CRMCredentials): Promise<boolean>;
  syncLead(lead: Lead): Promise<CRMSyncResult>;
  syncAccount(account: Account): Promise<CRMSyncResult>;
  syncContact(contact: Contact): Promise<CRMSyncResult>;
  syncOpportunity(opportunity: Opportunity): Promise<CRMSyncResult>;
  pullLeads(lastSyncDate?: Date): Promise<Lead[]>;
  pullAccounts(lastSyncDate?: Date): Promise<Account[]>;
  pullContacts(lastSyncDate?: Date): Promise<Contact[]>;
  pullOpportunities(lastSyncDate?: Date): Promise<Opportunity[]>;
}

export interface CRMCredentials {
  type: 'oauth' | 'api_key' | 'basic_auth';
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  instanceUrl?: string;
}

export interface CRMSyncResult {
  success: boolean;
  externalId?: string;
  error?: string;
  conflictResolution?: 'local_wins' | 'remote_wins' | 'manual_review';
}

export interface CRMFieldMapping {
  localField: string;
  remoteField: string;
  transformation?: 'date_format' | 'currency_format' | 'phone_format' | 'custom';
  customTransform?: (value: any) => any;
}

export interface CRMIntegrationConfig {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  credentials: CRMCredentials;
  fieldMappings: {
    lead: CRMFieldMapping[];
    account: CRMFieldMapping[];
    contact: CRMFieldMapping[];
    opportunity: CRMFieldMapping[];
  };
  syncSettings: {
    bidirectional: boolean;
    conflictResolution: 'local_wins' | 'remote_wins' | 'manual_review';
    syncFrequency: number; // minutes
    lastSyncDate?: Date;
  };
}

export class SalesforceProvider implements CRMProvider {
  name = 'Salesforce';
  private client: AxiosInstance;
  private instanceUrl: string = '';
  private accessToken: string = '';

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async authenticate(credentials: CRMCredentials): Promise<boolean> {
    try {
      if (credentials.type === 'oauth' && credentials.accessToken) {
        this.accessToken = credentials.accessToken;
        this.instanceUrl = credentials.instanceUrl || '';
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
        this.client.defaults.baseURL = this.instanceUrl;
        return true;
      }

      if (credentials.type === 'oauth' && credentials.refreshToken) {
        const response = await axios.post('https://login.salesforce.com/services/oauth2/token', {
          grant_type: 'refresh_token',
          refresh_token: credentials.refreshToken,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret
        });

        this.accessToken = response.data.access_token;
        this.instanceUrl = response.data.instance_url;
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
        this.client.defaults.baseURL = this.instanceUrl;
        return true;
      }

      return false;
    } catch (error) {
      loggingService.error('Salesforce authentication failed', error instanceof Error ? error : new Error('Unknown error'));
      return false;
    }
  }

  async syncLead(lead: Lead): Promise<CRMSyncResult> {
    try {
      const salesforceData = {
        FirstName: lead.contact.name.split(' ')[0],
        LastName: lead.contact.name.split(' ').slice(1).join(' ') || 'Unknown',
        Email: lead.contact.email,
        Phone: lead.contact.phone,
        MobilePhone: lead.contact.mobile,
        Company: lead.company.name,
        LeadSource: lead.source.channel,
        Status: this.mapLeadStatus(lead.status),
        Rating: this.mapLeadScore(lead.score?.value || 0)
      };

      const response = await this.client.post('/services/data/v58.0/sobjects/Lead/', salesforceData);

      loggingService.info('Lead synced to Salesforce', { leadId: lead.id, salesforceId: response.data.id });
      return {
        success: true,
        externalId: response.data.id
      };
    } catch (error) {
      loggingService.error('Failed to sync lead to Salesforce', error instanceof Error ? error : new Error('Unknown error'), { leadId: lead.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async syncAccount(account: Account): Promise<CRMSyncResult> {
    try {
      const salesforceData = {
        Name: account.name,
        Type: account.type,
        Industry: account.industry,
        Phone: account.phone,
        Website: account.website,
        BillingStreet: account.billingAddress?.street,
        BillingCity: account.billingAddress?.city,
        BillingState: account.billingAddress?.state,
        BillingPostalCode: account.billingAddress?.postalCode,
        BillingCountry: account.billingAddress?.country
      };

      const response = await this.client.post('/services/data/v58.0/sobjects/Account/', salesforceData);

      return {
        success: true,
        externalId: response.data.id
      };
    } catch (error) {
      loggingService.error('Failed to sync account to Salesforce', error instanceof Error ? error : new Error('Unknown error'), { accountId: account.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async syncContact(contact: Contact): Promise<CRMSyncResult> {
    try {
      const salesforceData = {
        FirstName: contact.firstName,
        LastName: contact.lastName,
        Email: contact.email,
        Phone: contact.phone,
        MobilePhone: contact.mobile,
        Title: contact.jobTitle,
        AccountId: contact.accountId // Assuming this is the Salesforce Account ID
      };

      const response = await this.client.post('/services/data/v58.0/sobjects/Contact/', salesforceData);

      return {
        success: true,
        externalId: response.data.id
      };
    } catch (error) {
      loggingService.error('Failed to sync contact to Salesforce', error instanceof Error ? error : new Error('Unknown error'), { contactId: contact.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async syncOpportunity(opportunity: Opportunity): Promise<CRMSyncResult> {
    try {
      const salesforceData = {
        Name: opportunity.name,
        AccountId: opportunity.accountId,
        StageName: this.mapOpportunityStage(opportunity.stage),
        CloseDate: opportunity.expectedCloseDate?.toISOString().split('T')[0],
        Amount: opportunity.amount,
        Probability: opportunity.probability,
        LeadSource: opportunity.source,
        Description: opportunity.description
      };

      const response = await this.client.post('/services/data/v58.0/sobjects/Opportunity/', salesforceData);

      return {
        success: true,
        externalId: response.data.id
      };
    } catch (error) {
      loggingService.error('Failed to sync opportunity to Salesforce', error instanceof Error ? error : new Error('Unknown error'), { opportunityId: opportunity.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async pullLeads(lastSyncDate?: Date): Promise<Lead[]> {
    try {
      let query = "SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, Company, LeadSource, Status, Rating, CreatedDate, LastModifiedDate FROM Lead";
      
      if (lastSyncDate) {
        query += ` WHERE LastModifiedDate > ${lastSyncDate.toISOString()}`;
      }

      const response = await this.client.get(`/services/data/v58.0/query/?q=${encodeURIComponent(query)}`);

      return response.data.records.map((record: any) => ({
        id: record.Id,
        contact: {
          name: `${record.FirstName || ''} ${record.LastName || ''}`.trim(),
          email: record.Email,
          phone: record.Phone,
          mobile: record.MobilePhone
        },
        company: {
          name: record.Company
        },
        source: {
          channel: record.LeadSource
        },
        status: this.mapSalesforceStatus(record.Status),
        score: {
          value: this.mapSalesforceRating(record.Rating),
          lastCalculated: new Date()
        },
        metadata: {
          createdAt: new Date(record.CreatedDate),
          updatedAt: new Date(record.LastModifiedDate),
          createdBy: 'salesforce_sync',
          isActive: true
        }
      }));
    } catch (error) {
      loggingService.error('Failed to pull leads from Salesforce', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  async pullAccounts(lastSyncDate?: Date): Promise<Account[]> {
    // Implementation similar to pullLeads but for accounts
    return [];
  }

  async pullContacts(lastSyncDate?: Date): Promise<Contact[]> {
    // Implementation similar to pullLeads but for contacts
    return [];
  }

  async pullOpportunities(lastSyncDate?: Date): Promise<Opportunity[]> {
    // Implementation similar to pullLeads but for opportunities
    return [];
  }

  private mapLeadStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'new': 'Open - Not Contacted',
      'contacted': 'Working - Contacted',
      'qualified': 'Qualified',
      'unqualified': 'Unqualified',
      'converted': 'Closed - Converted'
    };
    return statusMap[status] || 'Open - Not Contacted';
  }

  private mapLeadScore(score: number): string {
    if (score >= 80) return 'Hot';
    if (score >= 60) return 'Warm';
    if (score >= 40) return 'Cold';
    return 'Unrated';
  }

  private mapOpportunityStage(stage: string): string {
    const stageMap: Record<string, string> = {
      'prospecting': 'Prospecting',
      'qualification': 'Qualification',
      'needs_analysis': 'Needs Analysis',
      'proposal': 'Proposal/Price Quote',
      'negotiation': 'Negotiation/Review',
      'closed_won': 'Closed Won',
      'closed_lost': 'Closed Lost'
    };
    return stageMap[stage] || 'Prospecting';
  }

  private mapSalesforceStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'Open - Not Contacted': 'new',
      'Working - Contacted': 'contacted',
      'Qualified': 'qualified',
      'Unqualified': 'unqualified',
      'Closed - Converted': 'converted'
    };
    return statusMap[status] || 'new';
  }

  private mapSalesforceRating(rating: string): number {
    const ratingMap: Record<string, number> = {
      'Hot': 90,
      'Warm': 70,
      'Cold': 50,
      'Unrated': 30
    };
    return ratingMap[rating] || 30;
  }
}

export class HubSpotProvider implements CRMProvider {
  name = 'HubSpot';
  private client: AxiosInstance;
  private apiKey: string = '';

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async authenticate(credentials: CRMCredentials): Promise<boolean> {
    try {
      if (credentials.type === 'api_key' && credentials.apiKey) {
        this.apiKey = credentials.apiKey;
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
        
        // Test the connection
        await this.client.get('/crm/v3/objects/contacts?limit=1');
        return true;
      }

      return false;
    } catch (error) {
      loggingService.error('HubSpot authentication failed', error instanceof Error ? error : new Error('Unknown error'));
      return false;
    }
  }

  async syncLead(lead: Lead): Promise<CRMSyncResult> {
    try {
      const hubspotData = {
        properties: {
          firstname: lead.contact.name.split(' ')[0],
          lastname: lead.contact.name.split(' ').slice(1).join(' ') || 'Unknown',
          email: lead.contact.email,
          phone: lead.contact.phone,
          mobilephone: lead.contact.mobile,
          company: lead.company.name,
          hs_lead_status: this.mapLeadStatus(lead.status),
          hubspotscore: lead.score?.value || 0
        }
      };

      const response = await this.client.post('/crm/v3/objects/contacts', hubspotData);

      loggingService.info('Lead synced to HubSpot', { leadId: lead.id, hubspotId: response.data.id });
      return {
        success: true,
        externalId: response.data.id
      };
    } catch (error) {
      loggingService.error('Failed to sync lead to HubSpot', error instanceof Error ? error : new Error('Unknown error'), { leadId: lead.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async syncAccount(account: Account): Promise<CRMSyncResult> {
    try {
      const hubspotData = {
        properties: {
          name: account.name,
          domain: account.website,
          industry: account.industry,
          phone: account.phone,
          address: account.billingAddress?.street,
          city: account.billingAddress?.city,
          state: account.billingAddress?.state,
          zip: account.billingAddress?.postalCode,
          country: account.billingAddress?.country
        }
      };

      const response = await this.client.post('/crm/v3/objects/companies', hubspotData);

      return {
        success: true,
        externalId: response.data.id
      };
    } catch (error) {
      loggingService.error('Failed to sync account to HubSpot', error instanceof Error ? error : new Error('Unknown error'), { accountId: account.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async syncContact(contact: Contact): Promise<CRMSyncResult> {
    // Similar implementation to syncLead
    return { success: false, error: 'Not implemented' };
  }

  async syncOpportunity(opportunity: Opportunity): Promise<CRMSyncResult> {
    try {
      const hubspotData = {
        properties: {
          dealname: opportunity.name,
          amount: opportunity.amount,
          dealstage: this.mapOpportunityStage(opportunity.stage),
          closedate: opportunity.expectedCloseDate?.getTime(),
          pipeline: 'default'
        }
      };

      const response = await this.client.post('/crm/v3/objects/deals', hubspotData);

      return {
        success: true,
        externalId: response.data.id
      };
    } catch (error) {
      loggingService.error('Failed to sync opportunity to HubSpot', error instanceof Error ? error : new Error('Unknown error'), { opportunityId: opportunity.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async pullLeads(lastSyncDate?: Date): Promise<Lead[]> {
    // Implementation for pulling leads from HubSpot
    return [];
  }

  async pullAccounts(lastSyncDate?: Date): Promise<Account[]> {
    return [];
  }

  async pullContacts(lastSyncDate?: Date): Promise<Contact[]> {
    return [];
  }

  async pullOpportunities(lastSyncDate?: Date): Promise<Opportunity[]> {
    return [];
  }

  private mapLeadStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'new': 'NEW',
      'contacted': 'IN_PROGRESS',
      'qualified': 'QUALIFIED',
      'unqualified': 'UNQUALIFIED',
      'converted': 'CONNECTED'
    };
    return statusMap[status] || 'NEW';
  }

  private mapOpportunityStage(stage: string): string {
    const stageMap: Record<string, string> = {
      'prospecting': 'appointmentscheduled',
      'qualification': 'qualifiedtobuy',
      'proposal': 'presentationscheduled',
      'negotiation': 'decisionmakerboughtin',
      'closed_won': 'closedwon',
      'closed_lost': 'closedlost'
    };
    return stageMap[stage] || 'appointmentscheduled';
  }
}

export class CRMIntegrationService {
  private providers: Map<string, CRMProvider> = new Map();
  private configurations: Map<string, CRMIntegrationConfig> = new Map();

  constructor() {
    // Register default providers
    this.registerProvider('salesforce', new SalesforceProvider());
    this.registerProvider('hubspot', new HubSpotProvider());
  }

  registerProvider(name: string, provider: CRMProvider): void {
    this.providers.set(name, provider);
    loggingService.info('CRM provider registered', { provider: name });
  }

  async configureIntegration(config: CRMIntegrationConfig): Promise<boolean> {
    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(`CRM provider '${config.provider}' not found`);
    }

    const authenticated = await provider.authenticate(config.credentials);
    if (!authenticated) {
      throw new Error(`Failed to authenticate with ${config.provider}`);
    }

    this.configurations.set(config.id, config);
    loggingService.info('CRM integration configured', { configId: config.id, provider: config.provider });
    return true;
  }

  async syncLead(configId: string, lead: Lead): Promise<CRMSyncResult> {
    const config = this.configurations.get(configId);
    if (!config || !config.isActive) {
      throw new Error(`CRM configuration '${configId}' not found or inactive`);
    }

    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(`CRM provider '${config.provider}' not found`);
    }

    return provider.syncLead(lead);
  }

  async syncAccount(configId: string, account: Account): Promise<CRMSyncResult> {
    const config = this.configurations.get(configId);
    if (!config || !config.isActive) {
      throw new Error(`CRM configuration '${configId}' not found or inactive`);
    }

    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(`CRM provider '${config.provider}' not found`);
    }

    return provider.syncAccount(account);
  }

  async syncContact(configId: string, contact: Contact): Promise<CRMSyncResult> {
    const config = this.configurations.get(configId);
    if (!config || !config.isActive) {
      throw new Error(`CRM configuration '${configId}' not found or inactive`);
    }

    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(`CRM provider '${config.provider}' not found`);
    }

    return provider.syncContact(contact);
  }

  async syncOpportunity(configId: string, opportunity: Opportunity): Promise<CRMSyncResult> {
    const config = this.configurations.get(configId);
    if (!config || !config.isActive) {
      throw new Error(`CRM configuration '${configId}' not found or inactive`);
    }

    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(`CRM provider '${config.provider}' not found`);
    }

    return provider.syncOpportunity(opportunity);
  }

  async pullData(configId: string, entityType: 'leads' | 'accounts' | 'contacts' | 'opportunities', lastSyncDate?: Date): Promise<any[]> {
    const config = this.configurations.get(configId);
    if (!config || !config.isActive) {
      throw new Error(`CRM configuration '${configId}' not found or inactive`);
    }

    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(`CRM provider '${config.provider}' not found`);
    }

    switch (entityType) {
      case 'leads':
        return provider.pullLeads(lastSyncDate);
      case 'accounts':
        return provider.pullAccounts(lastSyncDate);
      case 'contacts':
        return provider.pullContacts(lastSyncDate);
      case 'opportunities':
        return provider.pullOpportunities(lastSyncDate);
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getConfigurations(): CRMIntegrationConfig[] {
    return Array.from(this.configurations.values());
  }
}

// Export singleton instance
export const crmIntegrationService = new CRMIntegrationService();