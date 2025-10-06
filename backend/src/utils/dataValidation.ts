/**
 * Data validation utilities for lead management system
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'email' | 'phone' | 'url' | 'date' | 'number';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => ValidationResult;
}

export class DataValidator {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private static readonly PHONE_REGEX = /^[\+]?[\d\s\-\(\)]{8,15}$/;
  private static readonly URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

  /**
   * Validate email format
   */
  static validateEmail(email: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!email) {
      result.isValid = false;
      result.errors.push('Email is required');
      return result;
    }

    const trimmedEmail = email.trim();

    if (!this.EMAIL_REGEX.test(trimmedEmail)) {
      result.isValid = false;
      result.errors.push('Invalid email format');
    }

    if (trimmedEmail.length > 254) {
      result.isValid = false;
      result.errors.push('Email is too long (maximum 254 characters)');
    }

    // Check for common typos
    const commonDomainTypos = [
      { typo: 'gmial.com', correct: 'gmail.com' },
      { typo: 'gmai.com', correct: 'gmail.com' },
      { typo: 'yahooo.com', correct: 'yahoo.com' },
      { typo: 'hotmial.com', correct: 'hotmail.com' },
      { typo: 'outlok.com', correct: 'outlook.com' }
    ];

    const domain = trimmedEmail.split('@')[1]?.toLowerCase();
    const typo = commonDomainTypos.find(t => t.typo === domain);
    if (typo) {
      result.warnings.push(`Did you mean ${typo.correct}?`);
    }

    return result;
  }

  /**
   * Validate phone number format
   */
  static validatePhone(phone: string, required: boolean = false): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!phone) {
      if (required) {
        result.isValid = false;
        result.errors.push('Phone number is required');
      }
      return result;
    }

    const trimmedPhone = phone.trim();

    // Remove formatting characters for validation
    const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');

    if (!this.PHONE_REGEX.test(trimmedPhone)) {
      result.isValid = false;
      result.errors.push('Invalid phone number format');
    }

    // Additional validation for phone number patterns
    if (cleanPhone.length < 8) {
      result.isValid = false;
      result.errors.push('Phone number is too short');
    } else if (cleanPhone.length > 15) {
      result.isValid = false;
      result.errors.push('Phone number is too long');
    } else if (cleanPhone.startsWith('66') && !cleanPhone.startsWith('+66')) {
      result.warnings.push('Phone number should include + for international format');
    }

    return result;
  }

  /**
   * Validate required string field
   */
  static validateRequiredString(
    value: string,
    fieldName: string,
    minLength: number = 1,
    maxLength: number = 255
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!value || !value.trim()) {
      result.isValid = false;
      result.errors.push(`${fieldName} is required`);
      return result;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < minLength) {
      result.isValid = false;
      result.errors.push(`${fieldName} must be at least ${minLength} characters long`);
    }

    if (trimmedValue.length > maxLength) {
      result.isValid = false;
      result.errors.push(`${fieldName} must not exceed ${maxLength} characters`);
    }

    return result;
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string, required: boolean = false): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!url) {
      if (required) {
        result.isValid = false;
        result.errors.push('URL is required');
      }
      return result;
    }

    const trimmedUrl = url.trim();

    if (!this.URL_REGEX.test(trimmedUrl)) {
      result.isValid = false;
      result.errors.push('Invalid URL format');
    }

    return result;
  }

  /**
   * Validate date
   */
  static validateDate(date: any, fieldName: string, required: boolean = false): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!date) {
      if (required) {
        result.isValid = false;
        result.errors.push(`${fieldName} is required`);
      }
      return result;
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      result.isValid = false;
      result.errors.push(`${fieldName} must be a valid date`);
    }

    return result;
  }

  /**
   * Validate multiple fields using rules
   */
  static validateFields(data: Record<string, any>, rules: FieldValidationRule[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    for (const rule of rules) {
      const value = data[rule.field];
      let fieldResult: ValidationResult;

      // Check required
      if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
        result.isValid = false;
        result.errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip validation if field is not required and empty
      if (!rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
        continue;
      }

      // Type-specific validation
      switch (rule.type) {
        case 'email':
          fieldResult = this.validateEmail(value);
          break;
        case 'phone':
          fieldResult = this.validatePhone(value, rule.required);
          break;
        case 'url':
          fieldResult = this.validateUrl(value, rule.required);
          break;
        case 'date':
          fieldResult = this.validateDate(value, rule.field, rule.required);
          break;
        case 'string':
          fieldResult = this.validateRequiredString(
            value,
            rule.field,
            rule.minLength,
            rule.maxLength
          );
          break;
        default:
          fieldResult = { isValid: true, errors: [], warnings: [] };
      }

      // Apply custom validator if provided
      if (rule.customValidator) {
        const customResult = rule.customValidator(value);
        fieldResult.isValid = fieldResult.isValid && customResult.isValid;
        fieldResult.errors.push(...customResult.errors);
        fieldResult.warnings.push(...customResult.warnings);
      }

      // Apply pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        fieldResult.isValid = false;
        fieldResult.errors.push(`${rule.field} format is invalid`);
      }

      // Merge results
      if (!fieldResult.isValid) {
        result.isValid = false;
      }
      result.errors.push(...fieldResult.errors.map(error => `${rule.field}: ${error}`));
      result.warnings.push(...fieldResult.warnings.map(warning => `${rule.field}: ${warning}`));
    }

    return result;
  }

  /**
   * Validate lead data
   */
  static validateLeadData(leadData: any): ValidationResult {
    const rules: FieldValidationRule[] = [
      {
        field: 'company.name',
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 255
      },
      {
        field: 'contact.name',
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 100
      },
      {
        field: 'contact.email',
        required: true,
        type: 'email'
      },
      {
        field: 'contact.phone',
        required: false,
        type: 'phone'
      },
      {
        field: 'contact.mobile',
        required: false,
        type: 'phone'
      },
      {
        field: 'source.channel',
        required: true,
        type: 'string'
      }
    ];

    // Flatten nested object for validation
    const flatData: Record<string, any> = {};
    
    if (leadData.company) {
      flatData['company.name'] = leadData.company.name;
    }
    
    if (leadData.contact) {
      flatData['contact.name'] = leadData.contact.name;
      flatData['contact.email'] = leadData.contact.email;
      flatData['contact.phone'] = leadData.contact.phone;
      flatData['contact.mobile'] = leadData.contact.mobile;
    }
    
    if (leadData.source) {
      flatData['source.channel'] = leadData.source.channel;
    }

    return this.validateFields(flatData, rules);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      // Remove potentially dangerous characters
      .replace(/[<>\"']/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ');
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    return email
      .trim()
      .toLowerCase()
      // Remove dangerous characters but keep valid email characters
      .replace(/[^a-zA-Z0-9@._+-]/g, '');
  }

  /**
   * Sanitize phone input
   */
  static sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    return phone
      .trim()
      // Keep only digits, +, spaces, hyphens, and parentheses
      .replace(/[^\d+\s\-\(\)]/g, '');
  }
}