import { BaseModel } from './BaseModel';
import { Lead as LeadType, LeadTable, LeadStatus, ScoreBand } from '../types';

export class Lead extends BaseModel {
  protected static override tableName = 'leads';

  static async findByAccountLeadId(accountLeadId: string): Promise<LeadTable | undefined> {
    return this.query.where('account_lead_id', accountLeadId).first();
  }

  static async findByEmail(email: string): Promise<LeadTable[]> {
    return this.query.where('contact_email', email);
  }

  static async findByAssignee(assigneeId: string): Promise<LeadTable[]> {
    return this.query.where('assigned_to', assigneeId).where('is_active', true);
  }

  static async findByStatus(status: LeadStatus): Promise<LeadTable[]> {
    return this.query.where('status', status).where('is_active', true);
  }

  static async findByScoreBand(scoreBand: ScoreBand): Promise<LeadTable[]> {
    return this.query.where('score_band', scoreBand).where('is_active', true);
  }

  static async findDuplicates(email: string, phone?: string, companyName?: string): Promise<LeadTable[]> {
    let query = this.query.where('is_active', true);
    
    if (email) {
      query = query.where('contact_email', email);
    }
    
    if (phone) {
      query = query.orWhere('contact_phone', phone).orWhere('contact_mobile', phone);
    }
    
    if (companyName) {
      query = query.orWhere('company_name', 'ilike', `%${companyName}%`);
    }
    
    return query;
  }

  static async generateAccountLeadId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Find the highest sequence number for this month
    const prefix = `AL-${year}-${month}`;
    const lastLead = await this.query
      .where('account_lead_id', 'like', `${prefix}-%`)
      .orderBy('account_lead_id', 'desc')
      .first();
    
    let sequence = 1;
    if (lastLead) {
      const lastSequence = parseInt(lastLead.account_lead_id.split('-')[3]);
      sequence = lastSequence + 1;
    }
    
    return `${prefix}-${sequence.toString().padStart(3, '0')}`;
  }

  static async createLead(leadData: Omit<LeadType, 'id' | 'accountLeadId' | 'metadata'>): Promise<LeadTable> {
    const accountLeadId = await this.generateAccountLeadId();
    
    const dbData: Partial<LeadTable> = {
      account_lead_id: accountLeadId,
      company_name: leadData.company.name,
      company_id: leadData.company.id,
      company_industry: leadData.company.industry,
      company_size: leadData.company.size,
      contact_name: leadData.contact.name,
      contact_phone: leadData.contact.phone,
      contact_mobile: leadData.contact.mobile,
      contact_email: leadData.contact.email,
      source_channel: leadData.source.channel,
      source_campaign: leadData.source.campaign,
      source_utm_params: leadData.source.utmParams ? JSON.stringify(leadData.source.utmParams) : null,
      assigned_to: leadData.assignment.assignedTo,
      assigned_at: leadData.assignment.assignedAt,
      assignment_reason: leadData.assignment.assignmentReason,
      status: leadData.status,
      score_value: leadData.score.value,
      score_band: leadData.score.band,
      score_last_calculated: leadData.score.lastCalculated,
      qualification_interest: leadData.qualification.interest,
      qualification_budget: leadData.qualification.budget,
      qualification_timeline: leadData.qualification.timeline,
      qualification_business_type: leadData.qualification.businessType,
      follow_up_next_date: leadData.followUp.nextDate,
      follow_up_notes: leadData.followUp.notes,
      product_type: leadData.product.type,
      product_ad_type: leadData.product.adType,
      custom_fields: leadData.customFields ? JSON.stringify(leadData.customFields) : null,
      is_active: true
    };

    return this.create(dbData);
  }

  static async updateLead(id: string, leadData: Partial<LeadType>): Promise<LeadTable> {
    const dbData: Partial<LeadTable> = {};
    
    if (leadData.company) {
      if (leadData.company.name) dbData.company_name = leadData.company.name;
      if (leadData.company.id) dbData.company_id = leadData.company.id;
      if (leadData.company.industry) dbData.company_industry = leadData.company.industry;
      if (leadData.company.size) dbData.company_size = leadData.company.size;
    }
    
    if (leadData.contact) {
      if (leadData.contact.name) dbData.contact_name = leadData.contact.name;
      if (leadData.contact.phone) dbData.contact_phone = leadData.contact.phone;
      if (leadData.contact.mobile) dbData.contact_mobile = leadData.contact.mobile;
      if (leadData.contact.email) dbData.contact_email = leadData.contact.email;
    }
    
    if (leadData.source) {
      if (leadData.source.channel) dbData.source_channel = leadData.source.channel;
      if (leadData.source.campaign) dbData.source_campaign = leadData.source.campaign;
      if (leadData.source.utmParams) {
        dbData.source_utm_params = JSON.stringify(leadData.source.utmParams);
      }
    }
    
    if (leadData.assignment) {
      if (leadData.assignment.assignedTo) dbData.assigned_to = leadData.assignment.assignedTo;
      if (leadData.assignment.assignedAt) dbData.assigned_at = leadData.assignment.assignedAt;
      if (leadData.assignment.assignmentReason) dbData.assignment_reason = leadData.assignment.assignmentReason;
    }
    
    if (leadData.status) dbData.status = leadData.status;
    
    if (leadData.score) {
      if (leadData.score.value !== undefined) dbData.score_value = leadData.score.value;
      if (leadData.score.band) dbData.score_band = leadData.score.band;
      if (leadData.score.lastCalculated) dbData.score_last_calculated = leadData.score.lastCalculated;
    }
    
    if (leadData.qualification) {
      if (leadData.qualification.interest) dbData.qualification_interest = leadData.qualification.interest;
      if (leadData.qualification.budget) dbData.qualification_budget = leadData.qualification.budget;
      if (leadData.qualification.timeline) dbData.qualification_timeline = leadData.qualification.timeline;
      if (leadData.qualification.businessType) dbData.qualification_business_type = leadData.qualification.businessType;
    }
    
    if (leadData.followUp) {
      if (leadData.followUp.nextDate) dbData.follow_up_next_date = leadData.followUp.nextDate;
      if (leadData.followUp.notes) dbData.follow_up_notes = leadData.followUp.notes;
    }
    
    if (leadData.product) {
      if (leadData.product.type) dbData.product_type = leadData.product.type;
      if (leadData.product.adType) dbData.product_ad_type = leadData.product.adType;
    }
    
    if (leadData.customFields) {
      dbData.custom_fields = JSON.stringify(leadData.customFields);
    }

    return this.update(id, dbData);
  }

  static async searchLeads(searchTerm: string, filters: Record<string, any> = {}): Promise<LeadTable[]> {
    let query = this.query.where('is_active', true);
    
    if (searchTerm) {
      query = query.where(function() {
        this.where('company_name', 'ilike', `%${searchTerm}%`)
          .orWhere('contact_name', 'ilike', `%${searchTerm}%`)
          .orWhere('contact_email', 'ilike', `%${searchTerm}%`)
          .orWhere('account_lead_id', 'ilike', `%${searchTerm}%`);
      });
    }
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(key, value);
      }
    });
    
    return query.orderBy('created_at', 'desc');
  }

  static transformToLeadType(dbLead: LeadTable): LeadType {
    return {
      id: dbLead.id,
      accountLeadId: dbLead.account_lead_id,
      company: {
        ...(dbLead.company_id && { id: dbLead.company_id }),
        name: dbLead.company_name,
        ...(dbLead.company_industry && { industry: dbLead.company_industry }),
        ...(dbLead.company_size && { size: dbLead.company_size })
      },
      contact: {
        name: dbLead.contact_name,
        ...(dbLead.contact_phone && { phone: dbLead.contact_phone }),
        ...(dbLead.contact_mobile && { mobile: dbLead.contact_mobile }),
        email: dbLead.contact_email
      },
      source: {
        channel: dbLead.source_channel,
        ...(dbLead.source_campaign && { campaign: dbLead.source_campaign }),
        ...(dbLead.source_utm_params && { utmParams: JSON.parse(dbLead.source_utm_params) })
      },
      assignment: {
        ...(dbLead.assigned_to && { assignedTo: dbLead.assigned_to }),
        ...(dbLead.assigned_at && { assignedAt: dbLead.assigned_at }),
        ...(dbLead.assignment_reason && { assignmentReason: dbLead.assignment_reason })
      },
      status: dbLead.status,
      score: {
        value: dbLead.score_value,
        band: dbLead.score_band,
        lastCalculated: dbLead.score_last_calculated
      },
      qualification: {
        ...(dbLead.qualification_interest && { interest: dbLead.qualification_interest }),
        ...(dbLead.qualification_budget && { budget: dbLead.qualification_budget }),
        ...(dbLead.qualification_timeline && { timeline: dbLead.qualification_timeline }),
        ...(dbLead.qualification_business_type && { businessType: dbLead.qualification_business_type })
      },
      followUp: {
        ...(dbLead.follow_up_next_date && { nextDate: dbLead.follow_up_next_date }),
        ...(dbLead.follow_up_notes && { notes: dbLead.follow_up_notes })
      },
      product: {
        ...(dbLead.product_type && { type: dbLead.product_type }),
        ...(dbLead.product_ad_type && { adType: dbLead.product_ad_type })
      },
      metadata: {
        createdAt: dbLead.created_at,
        updatedAt: dbLead.updated_at,
        createdBy: dbLead.created_by,
        isActive: dbLead.is_active
      },
      customFields: dbLead.custom_fields ? JSON.parse(dbLead.custom_fields) : {}
    };
  }
}