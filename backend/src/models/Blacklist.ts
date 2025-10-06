import { BaseModel } from './BaseModel';
import { BlacklistTable, BlacklistType, BlacklistReason } from '../types';

export class Blacklist extends BaseModel {
  protected static override tableName = 'blacklist';

  /**
   * Add email to blacklist
   */
  static async addEmail(
    email: string,
    reason: BlacklistReason,
    addedBy: string,
    notes?: string
  ): Promise<BlacklistTable> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if already exists
    const existing = await this.query
      .where('type', BlacklistType.EMAIL)
      .where('value', normalizedEmail)
      .where('is_active', true)
      .first();

    if (existing) {
      throw new Error('Email is already blacklisted');
    }

    return this.create({
      type: BlacklistType.EMAIL,
      value: normalizedEmail,
      reason,
      notes,
      added_by: addedBy,
      is_active: true
    });
  }

  /**
   * Add phone to blacklist
   */
  static async addPhone(
    phone: string,
    reason: BlacklistReason,
    addedBy: string,
    notes?: string
  ): Promise<BlacklistTable> {
    // Normalize phone number
    const normalizedPhone = this.normalizePhone(phone);
    
    // Check if already exists
    const existing = await this.query
      .where('type', BlacklistType.PHONE)
      .where('value', normalizedPhone)
      .where('is_active', true)
      .first();

    if (existing) {
      throw new Error('Phone number is already blacklisted');
    }

    return this.create({
      type: BlacklistType.PHONE,
      value: normalizedPhone,
      reason,
      notes,
      added_by: addedBy,
      is_active: true
    });
  }

  /**
   * Add domain to blacklist
   */
  static async addDomain(
    domain: string,
    reason: BlacklistReason,
    addedBy: string,
    notes?: string
  ): Promise<BlacklistTable> {
    const normalizedDomain = domain.toLowerCase().trim().replace(/^@/, '');
    
    // Check if already exists
    const existing = await this.query
      .where('type', BlacklistType.DOMAIN)
      .where('value', normalizedDomain)
      .where('is_active', true)
      .first();

    if (existing) {
      throw new Error('Domain is already blacklisted');
    }

    return this.create({
      type: BlacklistType.DOMAIN,
      value: normalizedDomain,
      reason,
      notes,
      added_by: addedBy,
      is_active: true
    });
  }

  /**
   * Add company to blacklist
   */
  static async addCompany(
    companyName: string,
    reason: BlacklistReason,
    addedBy: string,
    notes?: string
  ): Promise<BlacklistTable> {
    const normalizedCompany = companyName.toLowerCase().trim();
    
    // Check if already exists
    const existing = await this.query
      .where('type', BlacklistType.COMPANY)
      .where('value', normalizedCompany)
      .where('is_active', true)
      .first();

    if (existing) {
      throw new Error('Company is already blacklisted');
    }

    return this.create({
      type: BlacklistType.COMPANY,
      value: normalizedCompany,
      reason,
      notes,
      added_by: addedBy,
      is_active: true
    });
  }

  /**
   * Check if email is blacklisted
   */
  static async isEmailBlacklisted(email: string): Promise<BlacklistTable | null> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check exact email match
    const emailMatch = await this.query
      .where('type', BlacklistType.EMAIL)
      .where('value', normalizedEmail)
      .where('is_active', true)
      .first();

    if (emailMatch) {
      return emailMatch;
    }

    // Check domain match
    const domain = normalizedEmail.split('@')[1];
    if (domain) {
      const domainMatch = await this.query
        .where('type', BlacklistType.DOMAIN)
        .where('value', domain)
        .where('is_active', true)
        .first();

      if (domainMatch) {
        return domainMatch;
      }
    }

    return null;
  }

  /**
   * Check if phone is blacklisted
   */
  static async isPhoneBlacklisted(phone: string): Promise<BlacklistTable | null> {
    const normalizedPhone = this.normalizePhone(phone);
    
    return this.query
      .where('type', BlacklistType.PHONE)
      .where('value', normalizedPhone)
      .where('is_active', true)
      .first();
  }

  /**
   * Check if company is blacklisted
   */
  static async isCompanyBlacklisted(companyName: string): Promise<BlacklistTable | null> {
    const normalizedCompany = companyName.toLowerCase().trim();
    
    return this.query
      .where('type', BlacklistType.COMPANY)
      .where('value', normalizedCompany)
      .where('is_active', true)
      .first();
  }

  /**
   * Remove from blacklist (soft delete)
   */
  static async removeFromBlacklist(id: string, removedBy: string): Promise<BlacklistTable> {
    return this.update(id, {
      is_active: false,
      removed_at: new Date(),
      removed_by: removedBy
    });
  }

  /**
   * Get all blacklisted items with pagination
   */
  static async getBlacklistedItems(
    type?: BlacklistType,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    items: BlacklistTable[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    let query = this.query.where('is_active', true);
    
    if (type) {
      query = query.where('type', type);
    }

    // Get total count
    const totalResult = await query.clone().count('* as count');
    const total = parseInt((totalResult[0] as any)?.count || '0');

    // Get paginated results
    const offset = (page - 1) * limit;
    const items = await query
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Bulk check if lead data contains blacklisted items
   */
  static async checkLeadAgainstBlacklist(leadData: {
    email: string;
    phone?: string;
    mobile?: string;
    companyName: string;
  }): Promise<{
    isBlacklisted: boolean;
    matches: BlacklistTable[];
  }> {
    const matches: BlacklistTable[] = [];

    // Check email
    const emailMatch = await this.isEmailBlacklisted(leadData.email);
    if (emailMatch) {
      matches.push(emailMatch);
    }

    // Check phone
    if (leadData.phone) {
      const phoneMatch = await this.isPhoneBlacklisted(leadData.phone);
      if (phoneMatch) {
        matches.push(phoneMatch);
      }
    }

    // Check mobile
    if (leadData.mobile) {
      const mobileMatch = await this.isPhoneBlacklisted(leadData.mobile);
      if (mobileMatch) {
        matches.push(mobileMatch);
      }
    }

    // Check company
    const companyMatch = await this.isCompanyBlacklisted(leadData.companyName);
    if (companyMatch) {
      matches.push(companyMatch);
    }

    return {
      isBlacklisted: matches.length > 0,
      matches
    };
  }

  /**
   * Normalize phone number for blacklist comparison
   */
  private static normalizePhone(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Handle Thai phone numbers
    if (normalized.startsWith('0')) {
      normalized = '+66' + normalized.substring(1);
    } else if (normalized.startsWith('66') && !normalized.startsWith('+66')) {
      normalized = '+' + normalized;
    } else if (!normalized.startsWith('+') && normalized.length >= 9) {
      // Assume it's a local number, add Thai country code
      normalized = '+66' + normalized;
    }
    
    return normalized;
  }

  /**
   * Export blacklist for compliance purposes
   */
  static async exportBlacklist(type?: BlacklistType): Promise<BlacklistTable[]> {
    let query = this.query.where('is_active', true);
    
    if (type) {
      query = query.where('type', type);
    }

    return query.orderBy('created_at', 'desc');
  }

  /**
   * Get blacklist statistics
   */
  static async getBlacklistStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byReason: Record<string, number>;
    recentCount: number;
  }> {
    const [total, byType, byReason, recent] = await Promise.all([
      this.query.where('is_active', true).count('* as count').first(),
      this.query.where('is_active', true).select('type').count('* as count').groupBy('type'),
      this.query.where('is_active', true).select('reason').count('* as count').groupBy('reason'),
      this.query.where('is_active', true)
        .where('created_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .count('* as count').first()
    ]);

    const typeStats: Record<string, number> = {};
    byType.forEach((row: any) => {
      typeStats[row.type] = parseInt(row.count);
    });

    const reasonStats: Record<string, number> = {};
    byReason.forEach((row: any) => {
      reasonStats[row.reason] = parseInt(row.count);
    });

    return {
      total: parseInt(total?.['count'] as string) || 0,
      byType: typeStats,
      byReason: reasonStats,
      recentCount: parseInt(recent?.['count'] as string) || 0
    };
  }
}