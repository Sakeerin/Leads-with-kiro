import { LevenshteinDistance } from './stringUtils';

export interface DuplicateDetectionConfig {
  emailExactMatch: boolean;
  phoneNormalization: boolean;
  companyFuzzyThreshold: number;
  contactFuzzyThreshold: number;
  phoneFormatVariations: boolean;
}

export interface MatchResult {
  field: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'normalized';
  originalValue: string;
  matchedValue: string;
}

export interface DuplicateCandidate {
  leadId: string;
  matches: MatchResult[];
  overallConfidence: number;
  primaryMatchType: 'email' | 'phone' | 'company' | 'contact';
}

export class DuplicateDetectionEngine {
  private config: DuplicateDetectionConfig;

  constructor(config: Partial<DuplicateDetectionConfig> = {}) {
    this.config = {
      emailExactMatch: true,
      phoneNormalization: true,
      companyFuzzyThreshold: 0.8,
      contactFuzzyThreshold: 0.85,
      phoneFormatVariations: true,
      ...config
    };
  }

  /**
   * Normalize phone number for comparison
   */
  normalizePhone(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Handle Thai phone numbers
    if (normalized.startsWith('0')) {
      normalized = '+66' + normalized.substring(1);
    } else if (normalized.startsWith('66') && !normalized.startsWith('+66')) {
      normalized = '+' + normalized;
    } else if (!normalized.startsWith('+') && normalized.length >= 10) {
      // Assume it's a local number, add country code
      normalized = '+66' + normalized;
    }
    
    return normalized;
  }

  /**
   * Normalize company name for comparison
   */
  normalizeCompanyName(companyName: string): string {
    if (!companyName) return '';
    
    let normalized = companyName
      .toLowerCase()
      .trim();
    
    // Remove common company suffixes only at the end
    normalized = normalized.replace(/\s+(ltd|limited|inc|incorporated|corp|corporation|co|llc|plc)\.?$/gi, '');
    
    // Replace special characters with spaces and normalize spaces
    normalized = normalized
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return normalized;
  }

  /**
   * Normalize contact name for comparison
   */
  normalizeContactName(contactName: string): string {
    if (!contactName) return '';
    
    let normalized = contactName
      .toLowerCase()
      .trim();
    
    // Remove titles
    normalized = normalized.replace(/^(mr|mrs|ms|dr|prof|professor)\.?\s+/gi, '');
    
    // Replace hyphens and other separators with spaces, then normalize spaces
    normalized = normalized
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return normalized;
  }

  /**
   * Calculate fuzzy match confidence using Levenshtein distance
   */
  calculateFuzzyConfidence(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = LevenshteinDistance.calculate(str1, str2);
    return Math.max(0, (maxLength - distance) / maxLength);
  }

  /**
   * Check if two emails match
   */
  checkEmailMatch(email1: string, email2: string): MatchResult | null {
    if (!email1 || !email2) return null;
    
    const normalized1 = email1.toLowerCase().trim();
    const normalized2 = email2.toLowerCase().trim();
    
    if (normalized1 === normalized2) {
      return {
        field: 'email',
        confidence: 1.0,
        matchType: 'exact',
        originalValue: email1,
        matchedValue: email2
      };
    }
    
    return null;
  }

  /**
   * Check if two phone numbers match
   */
  checkPhoneMatch(phone1: string, phone2: string): MatchResult | null {
    if (!phone1 || !phone2) return null;
    
    const normalized1 = this.normalizePhone(phone1);
    const normalized2 = this.normalizePhone(phone2);
    
    if (normalized1 === normalized2) {
      return {
        field: 'phone',
        confidence: 0.95,
        matchType: 'normalized',
        originalValue: phone1,
        matchedValue: phone2
      };
    }
    
    // Check for partial matches (last 8 digits)
    if (normalized1.length >= 8 && normalized2.length >= 8) {
      const suffix1 = normalized1.slice(-8);
      const suffix2 = normalized2.slice(-8);
      
      if (suffix1 === suffix2) {
        return {
          field: 'phone',
          confidence: 0.8,
          matchType: 'fuzzy',
          originalValue: phone1,
          matchedValue: phone2
        };
      }
    }
    
    return null;
  }

  /**
   * Check if two company names match
   */
  checkCompanyMatch(company1: string, company2: string): MatchResult | null {
    if (!company1 || !company2) return null;
    
    const normalized1 = this.normalizeCompanyName(company1);
    const normalized2 = this.normalizeCompanyName(company2);
    
    // Exact match after normalization
    if (normalized1 === normalized2) {
      return {
        field: 'company',
        confidence: 0.95,
        matchType: 'normalized',
        originalValue: company1,
        matchedValue: company2
      };
    }
    
    // Fuzzy match
    const confidence = this.calculateFuzzyConfidence(normalized1, normalized2);
    if (confidence >= this.config.companyFuzzyThreshold) {
      return {
        field: 'company',
        confidence,
        matchType: 'fuzzy',
        originalValue: company1,
        matchedValue: company2
      };
    }
    
    // Check if one contains the other
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      const containsConfidence = Math.min(normalized1.length, normalized2.length) / 
                                Math.max(normalized1.length, normalized2.length);
      if (containsConfidence >= 0.7) {
        return {
          field: 'company',
          confidence: containsConfidence * 0.9, // Slightly lower confidence for contains match
          matchType: 'fuzzy',
          originalValue: company1,
          matchedValue: company2
        };
      }
    }
    
    return null;
  }

  /**
   * Check if two contact names match
   */
  checkContactMatch(contact1: string, contact2: string): MatchResult | null {
    if (!contact1 || !contact2) return null;
    
    const normalized1 = this.normalizeContactName(contact1);
    const normalized2 = this.normalizeContactName(contact2);
    
    // Exact match after normalization
    if (normalized1 === normalized2) {
      return {
        field: 'contact',
        confidence: 0.9,
        matchType: 'normalized',
        originalValue: contact1,
        matchedValue: contact2
      };
    }
    
    // Fuzzy match
    const confidence = this.calculateFuzzyConfidence(normalized1, normalized2);
    if (confidence >= this.config.contactFuzzyThreshold) {
      return {
        field: 'contact',
        confidence,
        matchType: 'fuzzy',
        originalValue: contact1,
        matchedValue: contact2
      };
    }
    
    // Check for name variations (first name + last name combinations)
    const words1 = normalized1.split(' ').filter(w => w.length > 1);
    const words2 = normalized2.split(' ').filter(w => w.length > 1);
    
    if (words1.length >= 2 && words2.length >= 2) {
      // Check if first and last names match in any order
      const hasCommonWords = words1.some(w1 => 
        words2.some(w2 => this.calculateFuzzyConfidence(w1, w2) > 0.8)
      );
      
      if (hasCommonWords) {
        return {
          field: 'contact',
          confidence: 0.75,
          matchType: 'fuzzy',
          originalValue: contact1,
          matchedValue: contact2
        };
      }
    }
    
    return null;
  }

  /**
   * Analyze potential duplicate between two lead records
   */
  analyzeDuplicate(
    lead1: {
      id: string;
      email: string;
      phone?: string;
      mobile?: string;
      companyName: string;
      contactName: string;
    },
    lead2: {
      id: string;
      email: string;
      phone?: string;
      mobile?: string;
      companyName: string;
      contactName: string;
    }
  ): DuplicateCandidate | null {
    const matches: MatchResult[] = [];
    
    // Check email match
    const emailMatch = this.checkEmailMatch(lead1.email, lead2.email);
    if (emailMatch) {
      matches.push(emailMatch);
    }
    
    // Check phone matches
    const phoneMatch = this.checkPhoneMatch(lead1.phone || '', lead2.phone || '');
    if (phoneMatch) {
      matches.push(phoneMatch);
    }
    
    const mobileMatch = this.checkPhoneMatch(lead1.mobile || '', lead2.mobile || '');
    if (mobileMatch) {
      matches.push(mobileMatch);
    }
    
    // Cross-check phone and mobile
    const crossPhoneMatch = this.checkPhoneMatch(lead1.phone || '', lead2.mobile || '');
    if (crossPhoneMatch) {
      matches.push({ ...crossPhoneMatch, field: 'phone_cross' });
    }
    
    const crossMobileMatch = this.checkPhoneMatch(lead1.mobile || '', lead2.phone || '');
    if (crossMobileMatch) {
      matches.push({ ...crossMobileMatch, field: 'mobile_cross' });
    }
    
    // Check company match
    const companyMatch = this.checkCompanyMatch(lead1.companyName, lead2.companyName);
    if (companyMatch) {
      matches.push(companyMatch);
    }
    
    // Check contact name match
    const contactMatch = this.checkContactMatch(lead1.contactName, lead2.contactName);
    if (contactMatch) {
      matches.push(contactMatch);
    }
    
    // If no matches found, not a duplicate
    if (matches.length === 0) {
      return null;
    }
    
    // Calculate overall confidence
    let overallConfidence = 0;
    let primaryMatchType: 'email' | 'phone' | 'company' | 'contact' = 'email';
    
    // Email match is strongest indicator
    if (emailMatch) {
      overallConfidence = 0.95;
      primaryMatchType = 'email';
    }
    // Phone match is second strongest
    else if (phoneMatch || mobileMatch || crossPhoneMatch || crossMobileMatch) {
      overallConfidence = Math.max(
        phoneMatch?.confidence || 0,
        mobileMatch?.confidence || 0,
        crossPhoneMatch?.confidence || 0,
        crossMobileMatch?.confidence || 0
      );
      primaryMatchType = 'phone';
    }
    // Company + contact match combination
    else if (companyMatch && contactMatch) {
      overallConfidence = (companyMatch.confidence + contactMatch.confidence) / 2;
      primaryMatchType = companyMatch.confidence > contactMatch.confidence ? 'company' : 'contact';
    }
    // Single company or contact match
    else if (companyMatch) {
      overallConfidence = companyMatch.confidence * 0.8; // Lower confidence for company-only match
      primaryMatchType = 'company';
    }
    else if (contactMatch) {
      overallConfidence = contactMatch.confidence * 0.7; // Lower confidence for contact-only match
      primaryMatchType = 'contact';
    }
    
    // Apply boost for multiple matches
    if (matches.length > 1) {
      overallConfidence = Math.min(1.0, overallConfidence * (1 + (matches.length - 1) * 0.1));
    }
    
    // Only return if confidence is above minimum threshold
    if (overallConfidence < 0.6) {
      return null;
    }
    
    return {
      leadId: lead2.id,
      matches,
      overallConfidence,
      primaryMatchType
    };
  }
}