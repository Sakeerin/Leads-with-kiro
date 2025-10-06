import { Lead } from '../models/Lead';
import { Activity } from '../models/Activity';
import { Blacklist } from '../models/Blacklist';
import { Lead as LeadType, LeadStatus, LeadChannel, ScoreBand, CompanySize, InterestLevel, BudgetStatus, PurchaseTimeline, BusinessType, ProductType, AdType, BlacklistTable } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';
import { DuplicateDetectionEngine, DuplicateCandidate } from '../utils/duplicateDetection';
import { DataValidator } from '../utils/dataValidation';
import { LeadMergeService, MergePreview, MergeRequest, MergeResult } from './leadMergeService';

export interface CreateLeadRequest {
  company: {
    name: string;
    id?: string;
    industry?: string;
    size?: CompanySize;
  };
  contact: {
    name: string;
    phone?: string;
    mobile?: string;
    email: string;
  };
  source: {
    channel: LeadChannel;
    campaign?: string;
    utmParams?: any;
  };
  assignment?: {
    assignedTo?: string;
    assignmentReason?: string;
  };
  status?: LeadStatus;
  qualification?: {
    interest?: InterestLevel;
    budget?: BudgetStatus;
    timeline?: PurchaseTimeline;
    businessType?: BusinessType;
  };
  followUp?: {
    nextDate?: Date;
    notes?: string;
  };
  product?: {
    type?: ProductType;
    adType?: AdType;
  };
  customFields?: Record<string, any>;
  createdBy: string;
}

export interface UpdateLeadRequest {
  company?: {
    name?: string;
    id?: string;
    industry?: string;
    size?: CompanySize;
  };
  contact?: {
    name?: string;
    phone?: string;
    mobile?: string;
    email?: string;
  };
  source?: {
    channel?: LeadChannel;
    campaign?: string;
    utmParams?: any;
  };
  assignment?: {
    assignedTo?: string;
    assignmentReason?: string;
  };
  status?: LeadStatus;
  qualification?: {
    interest?: InterestLevel;
    budget?: BudgetStatus;
    timeline?: PurchaseTimeline;
    businessType?: BusinessType;
  };
  followUp?: {
    nextDate?: Date;
    notes?: string;
  };
  product?: {
    type?: ProductType;
    adType?: AdType;
  };
  customFields?: Record<string, any>;
}

export interface SearchCriteria {
  searchTerm?: string;
  status?: LeadStatus;
  assignedTo?: string;
  source?: LeadChannel;
  scoreBand?: ScoreBand;
  createdAfter?: Date;
  createdBefore?: Date;
  followUpAfter?: Date;
  followUpBefore?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedLeads {
  leads: LeadType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DuplicateMatch {
  lead: LeadType;
  matchType: 'email' | 'phone' | 'company' | 'contact';
  confidence: number;
  matches: Array<{
    field: string;
    confidence: number;
    matchType: 'exact' | 'fuzzy' | 'normalized';
  }>;
}

export interface DataQualityCheck {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isBlacklisted: boolean;
  blacklistMatches: BlacklistTable[];
  duplicates: DuplicateMatch[];
  suggestions: string[];
}

export class LeadService {
  private static duplicateEngine = new DuplicateDetectionEngine();

  /**
   * Comprehensive data quality check for lead data
   */
  static async performDataQualityCheck(data: CreateLeadRequest): Promise<DataQualityCheck> {
    const result: DataQualityCheck = {
      isValid: true,
      errors: [],
      warnings: [],
      isBlacklisted: false,
      blacklistMatches: [],
      duplicates: [],
      suggestions: []
    };

    // Validate data format and required fields
    const validationResult = DataValidator.validateLeadData(data);
    result.isValid = validationResult.isValid;
    result.errors = validationResult.errors;
    result.warnings = validationResult.warnings;

    // Check against blacklist
    const blacklistCheck = await Blacklist.checkLeadAgainstBlacklist({
      email: data.contact.email,
      phone: data.contact.phone,
      mobile: data.contact.mobile,
      companyName: data.company.name
    });

    result.isBlacklisted = blacklistCheck.isBlacklisted;
    result.blacklistMatches = blacklistCheck.matches;

    if (result.isBlacklisted) {
      result.isValid = false;
      result.errors.push('Lead data matches blacklisted entries');
    }

    // Detect duplicates
    const duplicates = await this.detectDuplicatesAdvanced({
      email: data.contact.email,
      phone: data.contact.phone,
      mobile: data.contact.mobile,
      companyName: data.company.name,
      contactName: data.contact.name
    });

    result.duplicates = duplicates;

    if (duplicates.length > 0) {
      result.warnings.push(`Found ${duplicates.length} potential duplicate(s)`);
      result.suggestions.push('Review duplicates before creating lead');
    }

    // Additional data quality suggestions
    if (data.contact.phone && data.contact.mobile && data.contact.phone === data.contact.mobile) {
      result.warnings.push('Phone and mobile numbers are identical');
      result.suggestions.push('Verify if both phone numbers are correct');
    }

    if (data.company.name.length < 3) {
      result.warnings.push('Company name is very short');
      result.suggestions.push('Consider providing a more complete company name');
    }

    if (!data.contact.phone && !data.contact.mobile) {
      result.warnings.push('No phone number provided');
      result.suggestions.push('Adding a phone number improves lead quality');
    }

    return result;
  }

  /**
   * Validate required fields for lead creation
   */
  private static validateCreateLeadData(data: CreateLeadRequest): void {
    const validationResult = DataValidator.validateLeadData(data);
    
    if (!validationResult.isValid) {
      throw new ValidationError('Lead validation failed', validationResult.errors);
    }
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    return DataValidator.validateEmail(email).isValid;
  }

  /**
   * Validate phone number format
   */
  private static isValidPhone(phone: string): boolean {
    return DataValidator.validatePhone(phone).isValid;
  }

  /**
   * Create a new lead with comprehensive validation and quality checks
   */
  static async createLead(data: CreateLeadRequest, skipQualityCheck: boolean = false): Promise<LeadType> {
    // Perform comprehensive data quality check
    if (!skipQualityCheck) {
      const qualityCheck = await this.performDataQualityCheck(data);
      
      if (!qualityCheck.isValid) {
        throw new ValidationError('Lead data quality check failed', qualityCheck.errors);
      }

      // Log warnings if any
      if (qualityCheck.warnings.length > 0) {
        console.warn('Lead creation warnings:', qualityCheck.warnings);
      }

      // Log duplicates found
      if (qualityCheck.duplicates.length > 0) {
        console.warn(`Potential duplicates found for lead: ${data.contact.email}`, qualityCheck.duplicates);
      }
    } else {
      // Basic validation only
      this.validateCreateLeadData(data);
    }

    // Prepare lead data with defaults
    const leadData: Omit<LeadType, 'id' | 'accountLeadId' | 'metadata'> = {
      company: data.company,
      contact: data.contact,
      source: data.source,
      assignment: data.assignment?.assignedTo ? {
        assignedTo: data.assignment.assignedTo,
        assignedAt: new Date(),
        ...(data.assignment.assignmentReason && { assignmentReason: data.assignment.assignmentReason })
      } : {},
      status: data.status || LeadStatus.NEW,
      score: {
        value: 0,
        band: ScoreBand.COLD,
        lastCalculated: new Date()
      },
      qualification: data.qualification || {},
      followUp: data.followUp || {},
      product: data.product || {},
      customFields: data.customFields || {}
    };

    // Create the lead
    const dbLead = await Lead.createLead(leadData);
    const lead = Lead.transformToLeadType(dbLead);

    // Log the activity
    await Activity.logLeadCreated(lead.id, data.createdBy, leadData);

    // Log assignment if assigned during creation
    if (data.assignment?.assignedTo) {
      await Activity.logLeadAssigned(
        lead.id,
        data.createdBy,
        data.assignment.assignedTo,
        data.assignment.assignmentReason
      );
    }

    return lead;
  }

  /**
   * Get a lead by ID
   */
  static async getLeadById(id: string): Promise<LeadType> {
    const dbLead = await Lead.findById(id);
    if (!dbLead) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }

    return Lead.transformToLeadType(dbLead);
  }

  /**
   * Get a lead by Account Lead ID
   */
  static async getLeadByAccountId(accountLeadId: string): Promise<LeadType> {
    const dbLead = await Lead.findByAccountLeadId(accountLeadId);
    if (!dbLead) {
      throw new NotFoundError(`Lead with Account ID ${accountLeadId} not found`);
    }

    return Lead.transformToLeadType(dbLead);
  }

  /**
   * Update a lead with validation and audit logging
   */
  static async updateLead(id: string, data: UpdateLeadRequest, updatedBy: string): Promise<LeadType> {
    // Get existing lead
    const existingLead = await this.getLeadById(id);

    // Validate email if being updated
    if (data.contact?.email && !this.isValidEmail(data.contact.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate phone numbers if being updated
    if (data.contact?.phone && !this.isValidPhone(data.contact.phone)) {
      throw new ValidationError('Invalid phone number format');
    }
    if (data.contact?.mobile && !this.isValidPhone(data.contact.mobile)) {
      throw new ValidationError('Invalid mobile number format');
    }

    // Track changes for audit logging
    const changes: Record<string, { old: any; new: any }> = {};

    // Build update data and track changes
    const updateData: Partial<LeadType> = {};

    if (data.company) {
      updateData.company = { ...existingLead.company, ...data.company };
      if (JSON.stringify(existingLead.company) !== JSON.stringify(updateData.company)) {
        changes['company'] = { old: existingLead.company, new: updateData.company };
      }
    }

    if (data.contact) {
      updateData.contact = { ...existingLead.contact, ...data.contact };
      if (JSON.stringify(existingLead.contact) !== JSON.stringify(updateData.contact)) {
        changes['contact'] = { old: existingLead.contact, new: updateData.contact };
      }
    }

    if (data.source) {
      updateData.source = { ...existingLead.source, ...data.source };
      if (JSON.stringify(existingLead.source) !== JSON.stringify(updateData.source)) {
        changes['source'] = { old: existingLead.source, new: updateData.source };
      }
    }

    if (data.assignment) {
      updateData.assignment = { ...existingLead.assignment, ...data.assignment };
      if (data.assignment.assignedTo && data.assignment.assignedTo !== existingLead.assignment.assignedTo) {
        updateData.assignment.assignedAt = new Date();
        changes['assignment'] = { old: existingLead.assignment, new: updateData.assignment };
      }
    }

    if (data.status && data.status !== existingLead.status) {
      updateData.status = data.status;
      changes['status'] = { old: existingLead.status, new: data.status };
    }

    if (data.qualification) {
      updateData.qualification = { ...existingLead.qualification, ...data.qualification };
      if (JSON.stringify(existingLead.qualification) !== JSON.stringify(updateData.qualification)) {
        changes['qualification'] = { old: existingLead.qualification, new: updateData.qualification };
      }
    }

    if (data.followUp) {
      updateData.followUp = { ...existingLead.followUp, ...data.followUp };
      if (JSON.stringify(existingLead.followUp) !== JSON.stringify(updateData.followUp)) {
        changes['followUp'] = { old: existingLead.followUp, new: updateData.followUp };
      }
    }

    if (data.product) {
      updateData.product = { ...existingLead.product, ...data.product };
      if (JSON.stringify(existingLead.product) !== JSON.stringify(updateData.product)) {
        changes['product'] = { old: existingLead.product, new: updateData.product };
      }
    }

    if (data.customFields) {
      updateData.customFields = { ...existingLead.customFields, ...data.customFields };
      if (JSON.stringify(existingLead.customFields) !== JSON.stringify(updateData.customFields)) {
        changes['customFields'] = { old: existingLead.customFields, new: updateData.customFields };
      }
    }

    // Update the lead
    const dbLead = await Lead.updateLead(id, updateData);
    const updatedLead = Lead.transformToLeadType(dbLead);

    // Log activities for significant changes
    if (Object.keys(changes).length > 0) {
      await Activity.logLeadUpdated(id, updatedBy, changes);
    }

    // Log specific activities
    if (changes['assignment'] && data.assignment?.assignedTo) {
      await Activity.logLeadAssigned(
        id,
        updatedBy,
        data.assignment.assignedTo,
        data.assignment.assignmentReason
      );
    }

    if (changes['status']) {
      await Activity.logStatusChanged(id, updatedBy, changes['status'].old, changes['status'].new);
    }

    return updatedLead;
  }

  /**
   * Soft delete a lead
   */
  static async deleteLead(id: string, deletedBy: string): Promise<void> {
    const existingLead = await this.getLeadById(id);
    
    if (!existingLead.metadata.isActive) {
      throw new ValidationError('Lead is already deleted');
    }

    // Soft delete by setting is_active to false
    await Lead.update(id, { is_active: false });

    // Log the deletion
    await Activity.logLeadUpdated(id, deletedBy, {
      deleted: { old: false, new: true }
    });
  }

  /**
   * Restore a soft-deleted lead
   */
  static async restoreLead(id: string, restoredBy: string): Promise<LeadType> {
    const dbLead = await Lead.findById(id);
    if (!dbLead) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }

    if (dbLead.is_active) {
      throw new ValidationError('Lead is not deleted');
    }

    // Restore by setting is_active to true
    const updatedDbLead = await Lead.update(id, { is_active: true });
    const restoredLead = Lead.transformToLeadType(updatedDbLead);

    // Log the restoration
    await Activity.logLeadUpdated(id, restoredBy, {
      restored: { old: false, new: true }
    });

    return restoredLead;
  }

  /**
   * Search leads with filters and pagination
   */
  static async searchLeads(criteria: SearchCriteria): Promise<PaginatedLeads> {
    const page = criteria.page || 1;
    const limit = Math.min(criteria.limit || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    let query = Lead.query.where('is_active', true);

    // Apply search term
    if (criteria.searchTerm) {
      const searchTerm = criteria.searchTerm.trim();
      query = query.where(function() {
        this.where('company_name', 'ilike', `%${searchTerm}%`)
          .orWhere('contact_name', 'ilike', `%${searchTerm}%`)
          .orWhere('contact_email', 'ilike', `%${searchTerm}%`)
          .orWhere('account_lead_id', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply filters
    if (criteria.status) {
      query = query.where('status', criteria.status);
    }

    if (criteria.assignedTo) {
      query = query.where('assigned_to', criteria.assignedTo);
    }

    if (criteria.source) {
      query = query.where('source_channel', criteria.source);
    }

    if (criteria.scoreBand) {
      query = query.where('score_band', criteria.scoreBand);
    }

    if (criteria.createdAfter) {
      query = query.where('created_at', '>=', criteria.createdAfter);
    }

    if (criteria.createdBefore) {
      query = query.where('created_at', '<=', criteria.createdBefore);
    }

    if (criteria.followUpAfter) {
      query = query.where('follow_up_next_date', '>=', criteria.followUpAfter);
    }

    if (criteria.followUpBefore) {
      query = query.where('follow_up_next_date', '<=', criteria.followUpBefore);
    }

    // Apply sorting
    const sortBy = criteria.sortBy || 'created_at';
    const sortOrder = criteria.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);

    // Get total count for pagination
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count');
    const totalCount = parseInt((totalResult[0] as any)?.count || '0');

    // Apply pagination
    const dbLeads = await query.offset(offset).limit(limit);

    // Transform to Lead type
    const leads = dbLeads.map(dbLead => Lead.transformToLeadType(dbLead));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      leads,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Advanced duplicate detection using fuzzy matching
   */
  static async detectDuplicatesAdvanced(data: {
    email: string;
    phone?: string;
    mobile?: string;
    companyName: string;
    contactName: string;
  }): Promise<DuplicateMatch[]> {
    // Get all active leads for comparison
    const allLeads = await Lead.query.where('is_active', true);
    const duplicates: DuplicateMatch[] = [];

    for (const dbLead of allLeads) {
      const candidate = this.duplicateEngine.analyzeDuplicate(
        {
          id: 'new',
          email: data.email,
          phone: data.phone,
          mobile: data.mobile,
          companyName: data.companyName,
          contactName: data.contactName
        },
        {
          id: dbLead.id,
          email: dbLead.contact_email,
          phone: dbLead.contact_phone,
          mobile: dbLead.contact_mobile,
          companyName: dbLead.company_name,
          contactName: dbLead.contact_name
        }
      );

      if (candidate) {
        duplicates.push({
          lead: Lead.transformToLeadType(dbLead),
          matchType: candidate.primaryMatchType,
          confidence: candidate.overallConfidence,
          matches: candidate.matches.map(match => ({
            field: match.field,
            confidence: match.confidence,
            matchType: match.matchType
          }))
        });
      }
    }

    // Sort by confidence descending
    return duplicates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Legacy duplicate detection method (for backward compatibility)
   */
  static async detectDuplicates(data: {
    email?: string;
    phone?: string;
    companyName?: string;
  }): Promise<DuplicateMatch[]> {
    return this.detectDuplicatesAdvanced({
      email: data.email || '',
      phone: data.phone,
      mobile: undefined,
      companyName: data.companyName || '',
      contactName: ''
    });
  }

  /**
   * Get leads assigned to a specific user
   */
  static async getLeadsByAssignee(assigneeId: string, criteria?: Omit<SearchCriteria, 'assignedTo'>): Promise<PaginatedLeads> {
    return this.searchLeads({
      ...criteria,
      assignedTo: assigneeId
    });
  }

  /**
   * Get leads by status
   */
  static async getLeadsByStatus(status: LeadStatus, criteria?: Omit<SearchCriteria, 'status'>): Promise<PaginatedLeads> {
    return this.searchLeads({
      ...criteria,
      status
    });
  }

  /**
   * Get lead statistics
   */
  static async getLeadStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byScoreBand: Record<string, number>;
    recentCount: number;
  }> {
    const [total, byStatus, bySource, byScoreBand, recent] = await Promise.all([
      Lead.query.where('is_active', true).count('* as count').first(),
      Lead.query.where('is_active', true).select('status').count('* as count').groupBy('status'),
      Lead.query.where('is_active', true).select('source_channel').count('* as count').groupBy('source_channel'),
      Lead.query.where('is_active', true).select('score_band').count('* as count').groupBy('score_band'),
      Lead.query.where('is_active', true)
        .where('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .count('* as count').first()
    ]);

    const statusStats: Record<string, number> = {};
    byStatus.forEach((row: any) => {
      statusStats[row.status] = parseInt(row.count);
    });

    const sourceStats: Record<string, number> = {};
    bySource.forEach((row: any) => {
      sourceStats[row.source_channel] = parseInt(row.count);
    });

    const scoreBandStats: Record<string, number> = {};
    byScoreBand.forEach((row: any) => {
      scoreBandStats[row.score_band] = parseInt(row.count);
    });

    return {
      total: parseInt(total?.['count'] as string) || 0,
      byStatus: statusStats,
      bySource: sourceStats,
      byScoreBand: scoreBandStats,
      recentCount: parseInt(recent?.['count'] as string) || 0
    };
  }

  /**
   * Generate merge preview for two leads
   */
  static async generateMergePreview(sourceId: string, targetId: string): Promise<MergePreview> {
    return LeadMergeService.generateMergePreview(sourceId, targetId);
  }

  /**
   * Merge two leads
   */
  static async mergeLeads(request: MergeRequest): Promise<MergeResult> {
    return LeadMergeService.mergeLead(request);
  }

  /**
   * Undo a lead merge
   */
  static async undoMerge(
    mergedLeadId: string,
    originalSourceData: any,
    undoneBy: string
  ): Promise<LeadType> {
    return LeadMergeService.undoMerge(mergedLeadId, originalSourceData, undoneBy);
  }

  /**
   * Sanitize lead data before processing
   */
  static sanitizeLeadData(data: CreateLeadRequest): CreateLeadRequest {
    return {
      ...data,
      company: {
        ...data.company,
        name: DataValidator.sanitizeString(data.company.name)
      },
      contact: {
        ...data.contact,
        name: DataValidator.sanitizeString(data.contact.name),
        email: DataValidator.sanitizeEmail(data.contact.email),
        phone: data.contact.phone ? DataValidator.sanitizePhone(data.contact.phone) : undefined,
        mobile: data.contact.mobile ? DataValidator.sanitizePhone(data.contact.mobile) : undefined
      }
    };
  }

  /**
   * Bulk data quality check for multiple leads
   */
  static async bulkDataQualityCheck(leads: CreateLeadRequest[]): Promise<{
    results: Array<{ index: number; result: DataQualityCheck }>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      blacklisted: number;
      duplicates: number;
    };
  }> {
    const results: Array<{ index: number; result: DataQualityCheck }> = [];
    let valid = 0;
    let invalid = 0;
    let blacklisted = 0;
    let duplicates = 0;

    for (let i = 0; i < leads.length; i++) {
      const result = await this.performDataQualityCheck(leads[i]);
      results.push({ index: i, result });

      if (result.isValid) {
        valid++;
      } else {
        invalid++;
      }

      if (result.isBlacklisted) {
        blacklisted++;
      }

      if (result.duplicates.length > 0) {
        duplicates++;
      }
    }

    return {
      results,
      summary: {
        total: leads.length,
        valid,
        invalid,
        blacklisted,
        duplicates
      }
    };
  }
}