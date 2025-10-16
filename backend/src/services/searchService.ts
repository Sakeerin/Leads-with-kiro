import { Client } from '@elastic/elasticsearch';
import { Lead } from '../models/Lead';
import { Lead as LeadType, Activity as ActivityType } from '../types';

export interface SearchResult {
  leads: LeadType[];
  total: number;
  aggregations?: {
    status: Array<{ key: string; doc_count: number }>;
    source: Array<{ key: string; doc_count: number }>;
    assignedTo: Array<{ key: string; doc_count: number }>;
    scoreBand: Array<{ key: string; doc_count: number }>;
  };
}

export interface SearchSuggestion {
  text: string;
  type: 'company' | 'contact' | 'email' | 'phone';
  score: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  userId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchQuery {
  searchTerm?: string;
  filters?: {
    status?: string[];
    source?: string[];
    assignedTo?: string[];
    scoreBand?: string[];
    dateRange?: {
      field: 'created_at' | 'updated_at' | 'follow_up_date';
      from?: Date;
      to?: Date;
    };
    customFields?: Record<string, any>;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  page?: number;
  size?: number;
}

export class SearchService {
  private static client: Client;
  private static readonly LEADS_INDEX = 'leads';
  private static readonly ACTIVITIES_INDEX = 'activities';

  /**
   * Initialize Elasticsearch client
   */
  static initialize(): void {
    const elasticsearchUrl = process.env['ELASTICSEARCH_URL'] || 'http://localhost:9200';
    
    this.client = new Client({
      node: elasticsearchUrl,
      requestTimeout: 30000,
      pingTimeout: 3000,
      maxRetries: 3
    });

    console.log(`Elasticsearch client initialized with URL: ${elasticsearchUrl}`);
  }

  /**
   * Check if Elasticsearch is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.warn('Elasticsearch is not available:', error);
      return false;
    }
  }

  /**
   * Create indices with proper mappings
   */
  static async createIndices(): Promise<void> {
    try {
      // Create leads index
      const leadsIndexExists = await this.client.indices.exists({
        index: this.LEADS_INDEX
      });

      if (!leadsIndexExists) {
        await this.client.indices.create({
          index: this.LEADS_INDEX,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                accountLeadId: { type: 'keyword' },
                company: {
                  properties: {
                    id: { type: 'keyword' },
                    name: { 
                      type: 'text',
                      analyzer: 'standard',
                      fields: {
                        keyword: { type: 'keyword' },
                        suggest: { type: 'completion' }
                      }
                    },
                    industry: { type: 'keyword' },
                    size: { type: 'keyword' }
                  }
                },
                contact: {
                  properties: {
                    name: { 
                      type: 'text',
                      analyzer: 'standard',
                      fields: {
                        keyword: { type: 'keyword' },
                        suggest: { type: 'completion' }
                      }
                    },
                    email: { 
                      type: 'keyword',
                      fields: {
                        suggest: { type: 'completion' }
                      }
                    },
                    phone: { type: 'keyword' },
                    mobile: { type: 'keyword' }
                  }
                },
                source: {
                  properties: {
                    channel: { type: 'keyword' },
                    campaign: { type: 'keyword' },
                    utmParams: { type: 'object' }
                  }
                },
                assignment: {
                  properties: {
                    assignedTo: { type: 'keyword' },
                    assignedAt: { type: 'date' },
                    assignmentReason: { type: 'text' }
                  }
                },
                status: { type: 'keyword' },
                score: {
                  properties: {
                    value: { type: 'integer' },
                    band: { type: 'keyword' },
                    lastCalculated: { type: 'date' }
                  }
                },
                qualification: {
                  properties: {
                    interest: { type: 'keyword' },
                    budget: { type: 'keyword' },
                    timeline: { type: 'keyword' },
                    businessType: { type: 'keyword' }
                  }
                },
                followUp: {
                  properties: {
                    nextDate: { type: 'date' },
                    notes: { type: 'text' }
                  }
                },
                product: {
                  properties: {
                    type: { type: 'keyword' },
                    adType: { type: 'keyword' }
                  }
                },
                customFields: { type: 'object' },
                metadata: {
                  properties: {
                    createdAt: { type: 'date' },
                    updatedAt: { type: 'date' },
                    createdBy: { type: 'keyword' },
                    isActive: { type: 'boolean' }
                  }
                },
                // Full-text search field combining all searchable content
                searchText: { 
                  type: 'text',
                  analyzer: 'standard'
                }
              }
            },
            settings: {
              analysis: {
                analyzer: {
                  standard: {
                    type: 'standard',
                    stopwords: '_none_'
                  }
                }
              }
            }
          }
        });

        console.log('Created leads index');
      }

      // Create activities index
      const activitiesIndexExists = await this.client.indices.exists({
        index: this.ACTIVITIES_INDEX
      });

      if (!activitiesIndexExists) {
        await this.client.indices.create({
          index: this.ACTIVITIES_INDEX,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                leadId: { type: 'keyword' },
                type: { type: 'keyword' },
                subject: { 
                  type: 'text',
                  analyzer: 'standard'
                },
                details: { type: 'object' },
                performedBy: { type: 'keyword' },
                performedAt: { type: 'date' },
                relatedEntities: { type: 'object' },
                // Full-text search field
                searchText: { 
                  type: 'text',
                  analyzer: 'standard'
                }
              }
            }
          }
        });

        console.log('Created activities index');
      }

    } catch (error) {
      console.error('Error creating Elasticsearch indices:', error);
      throw error;
    }
  }

  /**
   * Index a lead document
   */
  static async indexLead(lead: LeadType): Promise<void> {
    if (!await this.isAvailable()) {
      console.warn('Elasticsearch not available, skipping lead indexing');
      return;
    }

    try {
      // Create searchable text combining all relevant fields
      const searchText = [
        lead.company.name,
        lead.contact.name,
        lead.contact.email,
        lead.contact.phone,
        lead.contact.mobile,
        lead.accountLeadId,
        lead.followUp.notes,
        lead.source.campaign,
        Object.values(lead.customFields || {}).join(' ')
      ].filter(Boolean).join(' ');

      const document = {
        ...lead,
        searchText
      };

      await this.client.index({
        index: this.LEADS_INDEX,
        id: lead.id,
        body: document
      });

      console.log(`Indexed lead: ${lead.id}`);
    } catch (error) {
      console.error('Error indexing lead:', error);
    }
  }

  /**
   * Index an activity document
   */
  static async indexActivity(activity: ActivityType): Promise<void> {
    if (!await this.isAvailable()) {
      console.warn('Elasticsearch not available, skipping activity indexing');
      return;
    }

    try {
      // Create searchable text
      const searchText = [
        activity.subject,
        JSON.stringify(activity.details)
      ].filter(Boolean).join(' ');

      const document = {
        ...activity,
        searchText
      };

      await this.client.index({
        index: this.ACTIVITIES_INDEX,
        id: activity.id,
        body: document
      });

      console.log(`Indexed activity: ${activity.id}`);
    } catch (error) {
      console.error('Error indexing activity:', error);
    }
  }

  /**
   * Remove a lead from the index
   */
  static async removeLead(leadId: string): Promise<void> {
    if (!await this.isAvailable()) {
      return;
    }

    try {
      await this.client.delete({
        index: this.LEADS_INDEX,
        id: leadId
      });

      console.log(`Removed lead from index: ${leadId}`);
    } catch (error) {
      if ((error as any).meta?.statusCode !== 404) {
        console.error('Error removing lead from index:', error);
      }
    }
  }

  /**
   * Perform advanced search with filters and aggregations
   */
  static async search(query: SearchQuery): Promise<SearchResult> {
    if (!await this.isAvailable()) {
      // Fallback to database search
      return this.fallbackSearch(query);
    }

    try {
      const searchBody: any = {
        query: {
          bool: {
            must: [],
            filter: []
          }
        },
        sort: [],
        aggs: {
          status: {
            terms: { field: 'status', size: 20 }
          },
          source: {
            terms: { field: 'source.channel', size: 20 }
          },
          assignedTo: {
            terms: { field: 'assignment.assignedTo', size: 50 }
          },
          scoreBand: {
            terms: { field: 'score.band', size: 10 }
          }
        }
      };

      // Add search term query
      if (query.searchTerm) {
        searchBody.query.bool.must.push({
          multi_match: {
            query: query.searchTerm,
            fields: [
              'searchText^1',
              'company.name^3',
              'contact.name^2',
              'contact.email^2',
              'accountLeadId^4'
            ],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      } else {
        searchBody.query.bool.must.push({
          match_all: {}
        });
      }

      // Add filters
      if (query.filters) {
        const filters = query.filters;

        // Only show active leads
        searchBody.query.bool.filter.push({
          term: { 'metadata.isActive': true }
        });

        if (filters.status && filters.status.length > 0) {
          searchBody.query.bool.filter.push({
            terms: { status: filters.status }
          });
        }

        if (filters.source && filters.source.length > 0) {
          searchBody.query.bool.filter.push({
            terms: { 'source.channel': filters.source }
          });
        }

        if (filters.assignedTo && filters.assignedTo.length > 0) {
          searchBody.query.bool.filter.push({
            terms: { 'assignment.assignedTo': filters.assignedTo }
          });
        }

        if (filters.scoreBand && filters.scoreBand.length > 0) {
          searchBody.query.bool.filter.push({
            terms: { 'score.band': filters.scoreBand }
          });
        }

        if (filters.dateRange) {
          const dateFilter: any = {
            range: {}
          };
          dateFilter.range[`metadata.${filters.dateRange.field}`] = {};

          if (filters.dateRange.from) {
            dateFilter.range[`metadata.${filters.dateRange.field}`].gte = filters.dateRange.from;
          }

          if (filters.dateRange.to) {
            dateFilter.range[`metadata.${filters.dateRange.field}`].lte = filters.dateRange.to;
          }

          searchBody.query.bool.filter.push(dateFilter);
        }

        // Custom fields filters
        if (filters.customFields) {
          Object.entries(filters.customFields).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              searchBody.query.bool.filter.push({
                term: { [`customFields.${key}`]: value }
              });
            }
          });
        }
      } else {
        // Only show active leads by default
        searchBody.query.bool.filter.push({
          term: { 'metadata.isActive': true }
        });
      }

      // Add sorting
      if (query.sort) {
        const sortField = query.sort.field === 'created_at' ? 'metadata.createdAt' : 
                         query.sort.field === 'updated_at' ? 'metadata.updatedAt' :
                         query.sort.field === 'company_name' ? 'company.name.keyword' :
                         query.sort.field === 'contact_name' ? 'contact.name.keyword' :
                         query.sort.field;

        searchBody.sort.push({
          [sortField]: { order: query.sort.order }
        });
      } else {
        // Default sort by relevance score, then by creation date
        searchBody.sort.push(
          { _score: { order: 'desc' } },
          { 'metadata.createdAt': { order: 'desc' } }
        );
      }

      // Pagination
      const page = query.page || 1;
      const size = Math.min(query.size || 20, 100);
      const from = (page - 1) * size;

      const response = await this.client.search({
        index: this.LEADS_INDEX,
        body: searchBody,
        from,
        size
      });

      // Transform results
      const leads = (response as any).body.hits.hits.map((hit: any) => hit._source);
      const total = (response as any).body.hits.total.value;

      // Transform aggregations
      const aggregations = {
        status: (response as any).body.aggregations.status.buckets,
        source: (response as any).body.aggregations.source.buckets,
        assignedTo: (response as any).body.aggregations.assignedTo.buckets,
        scoreBand: (response as any).body.aggregations.scoreBand.buckets
      };

      return {
        leads,
        total,
        aggregations
      };

    } catch (error) {
      console.error('Elasticsearch search error:', error);
      // Fallback to database search
      return this.fallbackSearch(query);
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  static async getSuggestions(term: string, types: string[] = ['company', 'contact', 'email']): Promise<SearchSuggestion[]> {
    if (!await this.isAvailable() || !term || term.length < 2) {
      return [];
    }

    try {
      const suggestions: SearchSuggestion[] = [];

      // Company name suggestions
      if (types.includes('company')) {
        const companyResponse = await this.client.search({
          index: this.LEADS_INDEX,
          body: {
            suggest: {
              company_suggest: {
                prefix: term,
                completion: {
                  field: 'company.name.suggest',
                  size: 5
                }
              }
            }
          }
        });

        (companyResponse as any).body.suggest.company_suggest[0].options.forEach((option: any) => {
          suggestions.push({
            text: option.text,
            type: 'company',
            score: option._score
          });
        });
      }

      // Contact name suggestions
      if (types.includes('contact')) {
        const contactResponse = await this.client.search({
          index: this.LEADS_INDEX,
          body: {
            suggest: {
              contact_suggest: {
                prefix: term,
                completion: {
                  field: 'contact.name.suggest',
                  size: 5
                }
              }
            }
          }
        });

        (contactResponse as any).body.suggest.contact_suggest[0].options.forEach((option: any) => {
          suggestions.push({
            text: option.text,
            type: 'contact',
            score: option._score
          });
        });
      }

      // Email suggestions
      if (types.includes('email')) {
        const emailResponse = await this.client.search({
          index: this.LEADS_INDEX,
          body: {
            suggest: {
              email_suggest: {
                prefix: term,
                completion: {
                  field: 'contact.email.suggest',
                  size: 5
                }
              }
            }
          }
        });

        (emailResponse as any).body.suggest.email_suggest[0].options.forEach((option: any) => {
          suggestions.push({
            text: option.text,
            type: 'email',
            score: option._score
          });
        });
      }

      // Sort by score and remove duplicates
      return suggestions
        .sort((a, b) => b.score - a.score)
        .filter((suggestion, index, self) => 
          index === self.findIndex(s => s.text === suggestion.text)
        )
        .slice(0, 10);

    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Reindex all leads from database
   */
  static async reindexAllLeads(): Promise<void> {
    if (!await this.isAvailable()) {
      throw new Error('Elasticsearch is not available');
    }

    try {
      console.log('Starting lead reindexing...');

      // Delete existing index
      try {
        await this.client.indices.delete({ index: this.LEADS_INDEX });
      } catch (error) {
        // Index might not exist
      }

      // Recreate index
      await this.createIndices();

      // Get all active leads from database
      const dbLeads = await Lead.query.where('is_active', true);
      
      console.log(`Found ${dbLeads.length} leads to reindex`);

      // Index leads in batches
      const batchSize = 100;
      for (let i = 0; i < dbLeads.length; i += batchSize) {
        const batch = dbLeads.slice(i, i + batchSize);
        const operations = [];

        for (const dbLead of batch) {
          const lead = Lead.transformToLeadType(dbLead);
          const searchText = [
            lead.company.name,
            lead.contact.name,
            lead.contact.email,
            lead.contact.phone,
            lead.contact.mobile,
            lead.accountLeadId,
            lead.followUp.notes,
            lead.source.campaign,
            Object.values(lead.customFields || {}).join(' ')
          ].filter(Boolean).join(' ');

          operations.push(
            { index: { _index: this.LEADS_INDEX, _id: lead.id } },
            { ...lead, searchText }
          );
        }

        if (operations.length > 0) {
          await this.client.bulk({ body: operations });
        }

        console.log(`Indexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dbLeads.length / batchSize)}`);
      }

      console.log('Lead reindexing completed');

    } catch (error) {
      console.error('Error during reindexing:', error);
      throw error;
    }
  }

  /**
   * Fallback search using database when Elasticsearch is not available
   */
  private static async fallbackSearch(query: SearchQuery): Promise<SearchResult> {
    console.log('Using database fallback search');

    let dbQuery = Lead.query.where('is_active', true);

    // Apply search term
    if (query.searchTerm) {
      const searchTerm = query.searchTerm.trim();
      dbQuery = dbQuery.where(function() {
        this.where('company_name', 'ilike', `%${searchTerm}%`)
          .orWhere('contact_name', 'ilike', `%${searchTerm}%`)
          .orWhere('contact_email', 'ilike', `%${searchTerm}%`)
          .orWhere('account_lead_id', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply filters
    if (query.filters) {
      const filters = query.filters;

      if (filters.status && filters.status.length > 0) {
        dbQuery = dbQuery.whereIn('status', filters.status);
      }

      if (filters.source && filters.source.length > 0) {
        dbQuery = dbQuery.whereIn('source_channel', filters.source);
      }

      if (filters.assignedTo && filters.assignedTo.length > 0) {
        dbQuery = dbQuery.whereIn('assigned_to', filters.assignedTo);
      }

      if (filters.scoreBand && filters.scoreBand.length > 0) {
        dbQuery = dbQuery.whereIn('score_band', filters.scoreBand);
      }

      if (filters.dateRange) {
        const field = filters.dateRange.field === 'created_at' ? 'created_at' :
                     filters.dateRange.field === 'updated_at' ? 'updated_at' :
                     'follow_up_next_date';

        if (filters.dateRange.from) {
          dbQuery = dbQuery.where(field, '>=', filters.dateRange.from);
        }

        if (filters.dateRange.to) {
          dbQuery = dbQuery.where(field, '<=', filters.dateRange.to);
        }
      }
    }

    // Apply sorting
    if (query.sort) {
      const sortField = query.sort.field === 'company_name' ? 'company_name' :
                       query.sort.field === 'contact_name' ? 'contact_name' :
                       query.sort.field === 'created_at' ? 'created_at' :
                       query.sort.field === 'updated_at' ? 'updated_at' :
                       'created_at';

      dbQuery = dbQuery.orderBy(sortField, query.sort.order);
    } else {
      dbQuery = dbQuery.orderBy('created_at', 'desc');
    }

    // Get total count
    const totalQuery = dbQuery.clone();
    const totalResult = await totalQuery.count('* as count');
    const total = parseInt((totalResult[0] as any)?.count || '0');

    // Apply pagination
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);
    const offset = (page - 1) * size;

    const dbLeads = await dbQuery.offset(offset).limit(size);
    const leads = dbLeads.map(dbLead => Lead.transformToLeadType(dbLead));

    return {
      leads,
      total,
      aggregations: {
        status: [],
        source: [],
        assignedTo: [],
        scoreBand: []
      }
    };
  }
}