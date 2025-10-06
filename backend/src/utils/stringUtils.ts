/**
 * String utility functions for text processing and comparison
 */

export class LevenshteinDistance {
  /**
   * Calculate Levenshtein distance between two strings
   */
  static calculate(str1: string, str2: string): number {
    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= str2.length; i++) {
      matrix[i]![0] = i;
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1, // substitution
            matrix[i]![j - 1]! + 1,     // insertion
            matrix[i - 1]![j]! + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Calculate similarity ratio (0-1) based on Levenshtein distance
   */
  static similarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = this.calculate(str1, str2);
    return (maxLength - distance) / maxLength;
  }
}

export class StringNormalizer {
  /**
   * Normalize text for comparison by removing accents, converting to lowercase, etc.
   */
  static normalize(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      .trim()
      // Remove accents and diacritics
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ');
  }

  /**
   * Remove common business suffixes from company names
   */
  static normalizeCompanyName(companyName: string): string {
    if (!companyName) return '';

    const businessSuffixes = [
      'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation',
      'co', 'company', 'llc', 'plc', 'sa', 'bv', 'gmbh', 'ag',
      'จำกัด', 'บริษัท', 'ห้างหุ้นส่วนจำกัด'
    ];

    let normalized = this.normalize(companyName);

    // Remove business suffixes
    const suffixPattern = new RegExp(
      `\\b(${businessSuffixes.join('|')})\\b\\.?$`,
      'gi'
    );
    normalized = normalized.replace(suffixPattern, '').trim();

    // Remove special characters except spaces and alphanumeric
    normalized = normalized.replace(/[^\w\s]/g, ' ');

    // Normalize spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Normalize person names by removing titles and standardizing format
   */
  static normalizePersonName(name: string): string {
    if (!name) return '';

    const titles = [
      'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'professor',
      'นาย', 'นาง', 'นางสาว', 'ดร', 'ศาสตราจารย์'
    ];

    let normalized = this.normalize(name);

    // Remove titles
    const titlePattern = new RegExp(
      `^(${titles.join('|')})\\.?\\s+`,
      'gi'
    );
    normalized = normalized.replace(titlePattern, '');

    // Normalize spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Extract and normalize phone number
   */
  static normalizePhoneNumber(phone: string): string {
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
}

export class FuzzyMatcher {
  /**
   * Check if two strings are similar using multiple algorithms
   */
  static isSimilar(
    str1: string,
    str2: string,
    threshold: number = 0.8
  ): boolean {
    if (!str1 || !str2) return false;

    const normalized1 = StringNormalizer.normalize(str1);
    const normalized2 = StringNormalizer.normalize(str2);

    // Exact match
    if (normalized1 === normalized2) return true;

    // Levenshtein similarity
    const levenshteinSim = LevenshteinDistance.similarity(normalized1, normalized2);
    if (levenshteinSim >= threshold) return true;

    // Substring match
    const minLength = Math.min(normalized1.length, normalized2.length);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    
    if (minLength > 0 && maxLength > 0) {
      const substringRatio = minLength / maxLength;
      if (substringRatio >= 0.7) {
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate similarity score between two strings
   */
  static calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const normalized1 = StringNormalizer.normalize(str1);
    const normalized2 = StringNormalizer.normalize(str2);

    // Exact match
    if (normalized1 === normalized2) return 1.0;

    // Levenshtein similarity
    const levenshteinSim = LevenshteinDistance.similarity(normalized1, normalized2);

    // Substring bonus
    let substringBonus = 0;
    const minLength = Math.min(normalized1.length, normalized2.length);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    
    if (minLength > 0 && maxLength > 0) {
      if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        substringBonus = (minLength / maxLength) * 0.2;
      }
    }

    return Math.min(1.0, levenshteinSim + substringBonus);
  }
}