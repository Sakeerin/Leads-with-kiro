import { Lead } from '../models/Lead';
import { Activity } from '../models/Activity';
import { Lead as LeadType, ScoreBand, CompanySize, BusinessType, LeadChannel, InterestLevel, BudgetStatus, PurchaseTimeline } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface ScoringCriteria {
  profileFit: {
    industry: { [key: string]: number };
    companySize: { [key in CompanySize]: number };
    businessType: { [key in BusinessType]: number };
  };
  behavioral: {
    emailOpens: number;
    emailReplies: number;
    websiteVisits: number;
    formCompletions: number;
    callAnswered: number;
    meetingAttended: number;
  };
  recency: {
    createdWithinDays: { [key: number]: number };
    lastActivityWithinDays: { [key: number]: number };
  };
  source: {
    channels: { [key in LeadChannel]: number };
  };
  qualification: {
    interest: { [key in InterestLevel]: number };
    budget: { [key in BudgetStatus]: number };
    timeline: { [key in PurchaseTimeline]: number };
  };
  weights: {
    profileFit: number;
    behavioral: number;
    recency: number;
    source: number;
    qualification: number;
  };
}

export interface ScoringModel {
  id: string;
  name: string;
  description?: string;
  criteria: ScoringCriteria;
  scoreBands: ScoreBandConfig[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ScoreBandConfig {
  band: ScoreBand;
  minScore: number;
  maxScore: number;
  actions: ScoreBandAction[];
}

export interface ScoreBandAction {
  type: 'assign_to_senior' | 'assign_to_junior' | 'add_to_nurture' | 'set_priority' | 'send_notification';
  parameters: Record<string, any>;
}

export interface LeadScore {
  leadId: string;
  totalScore: number;
  scoreBand: ScoreBand;
  breakdown: {
    profileFit: number;
    behavioral: number;
    recency: number;
    source: number;
    qualification: number;
  };
  calculatedAt: Date;
  modelId: string;
}

export interface BehavioralData {
  emailOpens: number;
  emailReplies: number;
  websiteVisits: number;
  formCompletions: number;
  callAnswered: number;
  meetingAttended: number;
}

export interface BatchResult {
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ leadId: string; error: string }>;
  startedAt: Date;
  completedAt: Date;
}

export class ScoringService {
  private static defaultScoringModel: ScoringCriteria = {
    profileFit: {
      industry: {
        'technology': 15,
        'finance': 12,
        'healthcare': 10,
        'manufacturing': 8,
        'retail': 6,
        'education': 5,
        'other': 3
      },
      companySize: {
        [CompanySize.ENTERPRISE]: 20,
        [CompanySize.LARGE]: 15,
        [CompanySize.MEDIUM]: 10,
        [CompanySize.SMALL]: 6,
        [CompanySize.STARTUP]: 3
      },
      businessType: {
        [BusinessType.B2B]: 15,
        [BusinessType.B2C]: 8
      }
    },
    behavioral: {
      emailOpens: 2,
      emailReplies: 8,
      websiteVisits: 3,
      formCompletions: 5,
      callAnswered: 10,
      meetingAttended: 15
    },
    recency: {
      createdWithinDays: {
        1: 10,
        7: 8,
        30: 5,
        90: 2,
        365: 0
      },
      lastActivityWithinDays: {
        1: 8,
        7: 6,
        30: 3,
        90: 1,
        365: 0
      }
    },
    source: {
      channels: {
        [LeadChannel.REFERRAL]: 15,
        [LeadChannel.WEB_FORM]: 10,
        [LeadChannel.PAID_ADS]: 8,
        [LeadChannel.ORGANIC_SEARCH]: 7,
        [LeadChannel.EMAIL]: 6,
        [LeadChannel.SOCIAL_MEDIA]: 5,
        [LeadChannel.EVENT]: 12,
        [LeadChannel.PHONE]: 8,
        [LeadChannel.CHAT]: 6,
        [LeadChannel.VENDOR_LIST]: 4
      }
    },
    qualification: {
      interest: {
        [InterestLevel.HIGH]: 15,
        [InterestLevel.MEDIUM]: 8,
        [InterestLevel.LOW]: 3
      },
      budget: {
        [BudgetStatus.CONFIRMED]: 12,
        [BudgetStatus.ESTIMATED]: 6,
        [BudgetStatus.UNKNOWN]: 0
      },
      timeline: {
        [PurchaseTimeline.IMMEDIATE]: 15,
        [PurchaseTimeline.WITHIN_MONTH]: 10,
        [PurchaseTimeline.WITHIN_QUARTER]: 6,
        [PurchaseTimeline.WITHIN_YEAR]: 3,
        [PurchaseTimeline.UNKNOWN]: 0
      }
    },
    weights: {
      profileFit: 0.25,
      behavioral: 0.30,
      recency: 0.15,
      source: 0.15,
      qualification: 0.15
    }
  };

  private static defaultScoreBands: ScoreBandConfig[] = [
    {
      band: ScoreBand.HOT,
      minScore: 70,
      maxScore: 100,
      actions: [
        {
          type: 'assign_to_senior',
          parameters: { priority: 'high' }
        },
        {
          type: 'send_notification',
          parameters: { type: 'immediate', message: 'High-value lead requires immediate attention' }
        }
      ]
    },
    {
      band: ScoreBand.WARM,
      minScore: 40,
      maxScore: 69,
      actions: [
        {
          type: 'set_priority',
          parameters: { priority: 'medium' }
        }
      ]
    },
    {
      band: ScoreBand.COLD,
      minScore: 0,
      maxScore: 39,
      actions: [
        {
          type: 'add_to_nurture',
          parameters: { campaign: 'cold_lead_nurture' }
        }
      ]
    }
  ];

  /**
   * Calculate lead score using the default or specified scoring model
   */
  static async calculateScore(leadId: string, modelId?: string): Promise<LeadScore> {
    // Get lead data
    const dbLead = await Lead.findById(leadId);
    if (!dbLead) {
      throw new NotFoundError(`Lead with ID ${leadId} not found`);
    }

    const lead = Lead.transformToLeadType(dbLead);

    // Get behavioral data from activities
    const behavioralData = await this.getBehavioralData(leadId);

    // Use default model for now (in future, load from database)
    const criteria = this.defaultScoringModel;
    const scoreBands = this.defaultScoreBands;

    // Calculate individual scores
    const profileFitScore = this.calculateProfileFitScore(lead, criteria.profileFit);
    const behavioralScore = this.calculateBehavioralScore(behavioralData, criteria.behavioral);
    const recencyScore = this.calculateRecencyScore(lead, criteria.recency);
    const sourceScore = this.calculateSourceScore(lead, criteria.source);
    const qualificationScore = this.calculateQualificationScore(lead, criteria.qualification);

    // Calculate weighted total score
    const totalScore = Math.round(
      (profileFitScore * criteria.weights.profileFit) +
      (behavioralScore * criteria.weights.behavioral) +
      (recencyScore * criteria.weights.recency) +
      (sourceScore * criteria.weights.source) +
      (qualificationScore * criteria.weights.qualification)
    );

    // Determine score band
    const scoreBand = this.determineScoreBand(totalScore, scoreBands);

    const leadScore: LeadScore = {
      leadId,
      totalScore,
      scoreBand,
      breakdown: {
        profileFit: profileFitScore,
        behavioral: behavioralScore,
        recency: recencyScore,
        source: sourceScore,
        qualification: qualificationScore
      },
      calculatedAt: new Date(),
      modelId: modelId || 'default'
    };

    // Update lead with new score
    await Lead.updateLead(leadId, {
      score: {
        value: totalScore,
        band: scoreBand,
        lastCalculated: new Date()
      }
    });

    // Log score update activity
    await Activity.logScoreUpdated(leadId, 'system', leadScore);

    // Execute score band actions
    await this.executeScoreBandActions(leadId, scoreBand, scoreBands);

    return leadScore;
  }

  /**
   * Calculate profile fit score based on industry, company size, and business type
   */
  private static calculateProfileFitScore(lead: LeadType, criteria: ScoringCriteria['profileFit']): number {
    let score = 0;

    // Industry score
    if (lead.company.industry) {
      score += criteria.industry[lead.company.industry.toLowerCase()] || criteria.industry['other'] || 0;
    }

    // Company size score
    if (lead.company.size) {
      score += criteria.companySize[lead.company.size] || 0;
    }

    // Business type score
    if (lead.qualification.businessType) {
      score += criteria.businessType[lead.qualification.businessType] || 0;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Calculate behavioral score based on engagement activities
   */
  private static calculateBehavioralScore(behavioralData: BehavioralData, criteria: ScoringCriteria['behavioral']): number {
    let score = 0;

    score += behavioralData.emailOpens * criteria.emailOpens;
    score += behavioralData.emailReplies * criteria.emailReplies;
    score += behavioralData.websiteVisits * criteria.websiteVisits;
    score += behavioralData.formCompletions * criteria.formCompletions;
    score += behavioralData.callAnswered * criteria.callAnswered;
    score += behavioralData.meetingAttended * criteria.meetingAttended;

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Calculate recency score based on creation date and last activity
   */
  private static calculateRecencyScore(lead: LeadType, criteria: ScoringCriteria['recency']): number {
    let score = 0;
    const now = new Date();

    // Score based on creation date
    const daysSinceCreated = Math.floor((now.getTime() - lead.metadata.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    for (const [days, points] of Object.entries(criteria.createdWithinDays).sort(([a], [b]) => parseInt(a) - parseInt(b))) {
      if (daysSinceCreated <= parseInt(days)) {
        score += points;
        break;
      }
    }

    // Score based on last activity (simplified - using updated date for now)
    const daysSinceActivity = Math.floor((now.getTime() - lead.metadata.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    for (const [days, points] of Object.entries(criteria.lastActivityWithinDays).sort(([a], [b]) => parseInt(a) - parseInt(b))) {
      if (daysSinceActivity <= parseInt(days)) {
        score += points;
        break;
      }
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Calculate source score based on lead channel
   */
  private static calculateSourceScore(lead: LeadType, criteria: ScoringCriteria['source']): number {
    return criteria.channels[lead.source.channel] || 0;
  }

  /**
   * Calculate qualification score based on interest, budget, and timeline
   */
  private static calculateQualificationScore(lead: LeadType, criteria: ScoringCriteria['qualification']): number {
    let score = 0;

    if (lead.qualification.interest) {
      score += criteria.interest[lead.qualification.interest] || 0;
    }

    if (lead.qualification.budget) {
      score += criteria.budget[lead.qualification.budget] || 0;
    }

    if (lead.qualification.timeline) {
      score += criteria.timeline[lead.qualification.timeline] || 0;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Determine score band based on total score
   */
  private static determineScoreBand(totalScore: number, scoreBands: ScoreBandConfig[]): ScoreBand {
    for (const band of scoreBands) {
      if (totalScore >= band.minScore && totalScore <= band.maxScore) {
        return band.band;
      }
    }
    return ScoreBand.COLD; // Default fallback
  }

  /**
   * Get behavioral data for a lead from activities
   */
  private static async getBehavioralData(leadId: string): Promise<BehavioralData> {
    // Get activities for the lead
    const activities = await Activity.findByLeadId(leadId);

    const behavioralData: BehavioralData = {
      emailOpens: 0,
      emailReplies: 0,
      websiteVisits: 0,
      formCompletions: 0,
      callAnswered: 0,
      meetingAttended: 0
    };

    // Count behavioral activities
    activities.forEach(activity => {
      switch (activity.type) {
        case 'email_opened':
          behavioralData.emailOpens++;
          break;
        case 'email_replied':
          behavioralData.emailReplies++;
          break;
        case 'website_visit':
          behavioralData.websiteVisits++;
          break;
        case 'form_completed':
          behavioralData.formCompletions++;
          break;
        case 'call_answered':
          behavioralData.callAnswered++;
          break;
        case 'meeting_attended':
          behavioralData.meetingAttended++;
          break;
      }
    });

    return behavioralData;
  }

  /**
   * Execute actions based on score band
   */
  private static async executeScoreBandActions(leadId: string, scoreBand: ScoreBand, scoreBands: ScoreBandConfig[]): Promise<void> {
    const bandConfig = scoreBands.find(band => band.band === scoreBand);
    if (!bandConfig) return;

    for (const action of bandConfig.actions) {
      try {
        await this.executeAction(leadId, action);
      } catch (error) {
        console.error(`Failed to execute action ${action.type} for lead ${leadId}:`, error);
      }
    }
  }

  /**
   * Execute a specific score band action
   */
  private static async executeAction(leadId: string, action: ScoreBandAction): Promise<void> {
    switch (action.type) {
      case 'assign_to_senior':
        // In a real implementation, this would assign to a senior sales rep
        console.log(`Lead ${leadId} should be assigned to senior rep with priority ${action.parameters['priority']}`);
        break;
      
      case 'assign_to_junior':
        // In a real implementation, this would assign to a junior sales rep
        console.log(`Lead ${leadId} should be assigned to junior rep`);
        break;
      
      case 'add_to_nurture':
        // In a real implementation, this would add to nurture campaign
        console.log(`Lead ${leadId} should be added to nurture campaign: ${action.parameters['campaign']}`);
        break;
      
      case 'set_priority':
        // In a real implementation, this would update lead priority
        console.log(`Lead ${leadId} priority should be set to: ${action.parameters['priority']}`);
        break;
      
      case 'send_notification':
        // In a real implementation, this would send notifications
        console.log(`Notification for lead ${leadId}: ${action.parameters['message']}`);
        break;
    }
  }

  /**
   * Recalculate scores for all active leads
   */
  static async recalculateAllScores(modelId?: string): Promise<BatchResult> {
    const startedAt = new Date();
    const result: BatchResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      startedAt,
      completedAt: new Date()
    };

    try {
      // Get all active leads
      const leads = await Lead.query.where('is_active', true).select('id');
      result.processed = leads.length;

      // Process leads in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (lead) => {
            try {
              await this.calculateScore(lead.id, modelId);
              result.successful++;
            } catch (error) {
              result.failed++;
              result.errors.push({
                leadId: lead.id,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          })
        );
      }

      result.completedAt = new Date();
      console.log(`Batch score recalculation completed: ${result.successful}/${result.processed} successful`);

    } catch (error) {
      console.error('Batch score recalculation failed:', error);
      throw error;
    }

    return result;
  }

  /**
   * Recalculate scores for specific leads
   */
  static async recalculateScoresForLeads(leadIds: string[], modelId?: string): Promise<BatchResult> {
    const startedAt = new Date();
    const result: BatchResult = {
      processed: leadIds.length,
      successful: 0,
      failed: 0,
      errors: [],
      startedAt,
      completedAt: new Date()
    };

    await Promise.allSettled(
      leadIds.map(async (leadId) => {
        try {
          await this.calculateScore(leadId, modelId);
          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            leadId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      })
    );

    result.completedAt = new Date();
    return result;
  }

  /**
   * Get score bands configuration
   */
  static getScoreBands(): ScoreBandConfig[] {
    return this.defaultScoreBands;
  }

  /**
   * Update score bands configuration (in future, this would update database)
   */
  static updateScoreBands(scoreBands: ScoreBandConfig[]): ScoreBandConfig[] {
    // Validate score bands
    this.validateScoreBands(scoreBands);
    
    // In a real implementation, this would update the database
    console.log('Score bands updated:', scoreBands);
    
    return scoreBands;
  }

  /**
   * Validate score bands configuration
   */
  private static validateScoreBands(scoreBands: ScoreBandConfig[]): void {
    if (scoreBands.length === 0) {
      throw new ValidationError('At least one score band is required');
    }

    // Check for overlapping ranges
    const sortedBands = [...scoreBands].sort((a, b) => a.minScore - b.minScore);
    
    for (let i = 0; i < sortedBands.length - 1; i++) {
      const currentBand = sortedBands[i];
      const nextBand = sortedBands[i + 1];
      if (currentBand && nextBand && currentBand.maxScore >= nextBand.minScore) {
        throw new ValidationError('Score bands cannot have overlapping ranges');
      }
    }

    // Check that all bands are within 0-100 range
    for (const band of scoreBands) {
      if (band.minScore < 0 || band.maxScore > 100 || band.minScore > band.maxScore) {
        throw new ValidationError('Score bands must be within 0-100 range and minScore <= maxScore');
      }
    }
  }

  /**
   * Get scoring model (placeholder for future database implementation)
   */
  static async getScoringModel(modelId: string): Promise<ScoringModel> {
    // In a real implementation, this would fetch from database
    if (modelId === 'default') {
      return {
        id: 'default',
        name: 'Default Scoring Model',
        description: 'Default lead scoring model with balanced criteria',
        criteria: this.defaultScoringModel,
        scoreBands: this.defaultScoreBands,
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      };
    }
    
    throw new NotFoundError(`Scoring model with ID ${modelId} not found`);
  }

  /**
   * Create new scoring model (placeholder for future database implementation)
   */
  static async createScoringModel(modelData: Omit<ScoringModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScoringModel> {
    // Validate criteria and score bands
    this.validateScoreBands(modelData.scoreBands);
    
    // In a real implementation, this would save to database
    const model: ScoringModel = {
      ...modelData,
      id: `model_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Scoring model created:', model);
    return model;
  }

  /**
   * Update scoring model (placeholder for future database implementation)
   */
  static async updateScoringModel(modelId: string, updates: Partial<ScoringModel>): Promise<ScoringModel> {
    const existingModel = await this.getScoringModel(modelId);
    
    if (updates.scoreBands) {
      this.validateScoreBands(updates.scoreBands);
    }
    
    const updatedModel: ScoringModel = {
      ...existingModel,
      ...updates,
      updatedAt: new Date()
    };
    
    console.log('Scoring model updated:', updatedModel);
    return updatedModel;
  }

  /**
   * Get lead scores with filtering and pagination
   */
  static async getLeadScores(filters: {
    scoreBand?: ScoreBand;
    minScore?: number;
    maxScore?: number;
    calculatedAfter?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    scores: LeadScore[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = Lead.query.where('is_active', true);

    if (filters.scoreBand) {
      query = query.where('score_band', filters.scoreBand);
    }

    if (filters.minScore !== undefined) {
      query = query.where('score_value', '>=', filters.minScore);
    }

    if (filters.maxScore !== undefined) {
      query = query.where('score_value', '<=', filters.maxScore);
    }

    if (filters.calculatedAfter) {
      query = query.where('score_last_calculated', '>=', filters.calculatedAfter);
    }

    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count');
    const totalCount = parseInt((totalResult[0] as any)?.count || '0');

    const leads = await query
      .orderBy('score_value', 'desc')
      .offset(offset)
      .limit(limit);

    const scores: LeadScore[] = leads.map(lead => ({
      leadId: lead.id,
      totalScore: lead.score_value,
      scoreBand: lead.score_band,
      breakdown: {
        profileFit: 0, // Would need to store breakdown in database
        behavioral: 0,
        recency: 0,
        source: 0,
        qualification: 0
      },
      calculatedAt: lead.score_last_calculated,
      modelId: 'default'
    }));

    return {
      scores,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }
}