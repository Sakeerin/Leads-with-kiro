import { Blacklist } from '../models/Blacklist';
import { BlacklistTable, BlacklistType, BlacklistReason } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';
import { DataValidator } from '../utils/dataValidation';

export interface AddToBlacklistRequest {
  type: BlacklistType;
  value: string;
  reason: BlacklistReason;
  notes?: string;
  addedBy: string;
}

export interface BlacklistSearchCriteria {
  type?: BlacklistType;
  reason?: BlacklistReason;
  searchTerm?: string;
  addedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface BlacklistSearchResult {
  items: BlacklistTable[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class BlacklistService {
  /**
   * Add item to blacklist with validation
   */
  static async addToBlacklist(request: AddToBlacklistRequest): Promise<BlacklistTable> {
    // Validate the value based on type
    this.validateBlacklistValue(request.type, request.value);

    // Sanitize the value
    const sanitizedValue = this.sanitizeBlacklistValue(request.type, request.value);

    try {
      switch (request.type) {
        case BlacklistType.EMAIL:
          return await Blacklist.addEmail(
            sanitizedValue,
            request.reason,
            request.addedBy,
            request.notes
          );
        case BlacklistType.PHONE:
          return await Blacklist.addPhone(
            sanitizedValue,
            request.reason,
            request.addedBy,
            request.notes
          );
        case BlacklistType.DOMAIN:
          return await Blacklist.addDomain(
            sanitizedValue,
            request.reason,
            request.addedBy,
            request.notes
          );
        case BlacklistType.COMPANY:
          return await Blacklist.addCompany(
            sanitizedValue,
            request.reason,
            request.addedBy,
            request.notes
          );
        default:
          throw new ValidationError(`Unsupported blacklist type: ${request.type}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('already blacklisted')) {
        throw new ValidationError(`${request.type} '${sanitizedValue}' is already blacklisted`);
      }
      throw error;
    }
  }

  /**
   * Remove item from blacklist
   */
  static async removeFromBlacklist(id: string, removedBy: string): Promise<BlacklistTable> {
    const item = await Blacklist.findById(id);
    if (!item) {
      throw new NotFoundError(`Blacklist item with ID ${id} not found`);
    }

    if (!item.is_active) {
      throw new ValidationError('Blacklist item is already inactive');
    }

    return await Blacklist.removeFromBlacklist(id, removedBy);
  }

  /**
   * Search blacklist items with filters
   */
  static async searchBlacklist(criteria: BlacklistSearchCriteria): Promise<BlacklistSearchResult> {
    const page = criteria.page || 1;
    const limit = Math.min(criteria.limit || 50, 100);

    let query = Blacklist.query.where('is_active', true);

    // Apply filters
    if (criteria.type) {
      query = query.where('type', criteria.type);
    }

    if (criteria.reason) {
      query = query.where('reason', criteria.reason);
    }

    if (criteria.addedBy) {
      query = query.where('added_by', criteria.addedBy);
    }

    if (criteria.searchTerm) {
      const searchTerm = criteria.searchTerm.trim();
      query = query.where(function() {
        this.where('value', 'ilike', `%${searchTerm}%`)
          .orWhere('notes', 'ilike', `%${searchTerm}%`);
      });
    }

    if (criteria.dateFrom) {
      query = query.where('created_at', '>=', criteria.dateFrom);
    }

    if (criteria.dateTo) {
      query = query.where('created_at', '<=', criteria.dateTo);
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

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Check if a value is blacklisted
   */
  static async isBlacklisted(type: BlacklistType, value: string): Promise<BlacklistTable | null> {
    const sanitizedValue = this.sanitizeBlacklistValue(type, value);

    switch (type) {
      case BlacklistType.EMAIL:
        return await Blacklist.isEmailBlacklisted(sanitizedValue);
      case BlacklistType.PHONE:
        return await Blacklist.isPhoneBlacklisted(sanitizedValue);
      case BlacklistType.COMPANY:
        return await Blacklist.isCompanyBlacklisted(sanitizedValue);
      case BlacklistType.DOMAIN:
        // For domain check, we need to extract domain from email if provided
        const domain = sanitizedValue.includes('@') ? sanitizedValue.split('@')[1] : sanitizedValue;
        return await Blacklist.query
          .where('type', BlacklistType.DOMAIN)
          .where('value', domain.toLowerCase())
          .where('is_active', true)
          .first();
      default:
        return null;
    }
  }

  /**
   * Bulk check multiple values against blacklist
   */
  static async bulkCheck(items: Array<{ type: BlacklistType; value: string }>): Promise<Array<{
    type: BlacklistType;
    value: string;
    isBlacklisted: boolean;
    match?: BlacklistTable;
  }>> {
    const results = [];

    for (const item of items) {
      const match = await this.isBlacklisted(item.type, item.value);
      results.push({
        type: item.type,
        value: item.value,
        isBlacklisted: !!match,
        match: match || undefined
      });
    }

    return results;
  }

  /**
   * Get blacklist statistics
   */
  static async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byReason: Record<string, number>;
    recentCount: number;
    topDomains: Array<{ domain: string; count: number }>;
  }> {
    const stats = await Blacklist.getBlacklistStats();

    // Get top blacklisted domains
    const topDomains = await Blacklist.query
      .where('type', BlacklistType.DOMAIN)
      .where('is_active', true)
      .select('value')
      .count('* as count')
      .groupBy('value')
      .orderBy('count', 'desc')
      .limit(10);

    return {
      ...stats,
      topDomains: topDomains.map((row: any) => ({
        domain: row.value,
        count: parseInt(row.count)
      }))
    };
  }

  /**
   * Export blacklist for compliance
   */
  static async exportBlacklist(type?: BlacklistType): Promise<BlacklistTable[]> {
    return await Blacklist.exportBlacklist(type);
  }

  /**
   * Import blacklist from external source
   */
  static async importBlacklist(
    items: Array<{
      type: BlacklistType;
      value: string;
      reason: BlacklistReason;
      notes?: string;
    }>,
    importedBy: string
  ): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ item: any; error: string }>;
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: Array<{ item: any; error: string }> = [];

    for (const item of items) {
      try {
        await this.addToBlacklist({
          ...item,
          addedBy: importedBy
        });
        imported++;
      } catch (error) {
        if (error instanceof ValidationError && error.message.includes('already blacklisted')) {
          skipped++;
        } else {
          errors.push({
            item,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Validate blacklist value based on type
   */
  private static validateBlacklistValue(type: BlacklistType, value: string): void {
    if (!value || !value.trim()) {
      throw new ValidationError('Blacklist value is required');
    }

    switch (type) {
      case BlacklistType.EMAIL:
        const emailValidation = DataValidator.validateEmail(value);
        if (!emailValidation.isValid) {
          throw new ValidationError(`Invalid email format: ${emailValidation.errors.join(', ')}`);
        }
        break;
      case BlacklistType.PHONE:
        const phoneValidation = DataValidator.validatePhone(value, true);
        if (!phoneValidation.isValid) {
          throw new ValidationError(`Invalid phone format: ${phoneValidation.errors.join(', ')}`);
        }
        break;
      case BlacklistType.DOMAIN:
        // Basic domain validation
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(value.replace(/^@/, ''))) {
          throw new ValidationError('Invalid domain format');
        }
        break;
      case BlacklistType.COMPANY:
        if (value.trim().length < 2) {
          throw new ValidationError('Company name must be at least 2 characters long');
        }
        break;
    }
  }

  /**
   * Sanitize blacklist value based on type
   */
  private static sanitizeBlacklistValue(type: BlacklistType, value: string): string {
    switch (type) {
      case BlacklistType.EMAIL:
        return DataValidator.sanitizeEmail(value);
      case BlacklistType.PHONE:
        return DataValidator.sanitizePhone(value);
      case BlacklistType.DOMAIN:
        return value.toLowerCase().trim().replace(/^@/, '');
      case BlacklistType.COMPANY:
        return DataValidator.sanitizeString(value);
      default:
        return value.trim();
    }
  }

  /**
   * Get blacklist suggestions based on patterns
   */
  static async getSuggestions(type: BlacklistType, partialValue: string): Promise<string[]> {
    if (!partialValue || partialValue.length < 2) {
      return [];
    }

    const suggestions = await Blacklist.query
      .where('type', type)
      .where('is_active', true)
      .where('value', 'ilike', `%${partialValue}%`)
      .select('value')
      .distinct()
      .limit(10);

    return suggestions.map(s => s.value);
  }

  /**
   * Clean up expired or invalid blacklist entries
   */
  static async cleanupBlacklist(cleanedBy: string): Promise<{
    removed: number;
    errors: string[];
  }> {
    let removed = 0;
    const errors: string[] = [];

    try {
      // Find entries that might be invalid (e.g., malformed emails, phones)
      const allEntries = await Blacklist.query.where('is_active', true);

      for (const entry of allEntries) {
        try {
          // Validate each entry
          this.validateBlacklistValue(entry.type, entry.value);
        } catch (validationError) {
          // Remove invalid entries
          await Blacklist.removeFromBlacklist(entry.id, cleanedBy);
          removed++;
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error during cleanup');
    }

    return { removed, errors };
  }
}