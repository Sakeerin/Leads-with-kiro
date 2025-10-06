import { DataValidator } from '../src/utils/dataValidation';

describe('DataValidator', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        const result = DataValidator.validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        ''
      ];

      invalidEmails.forEach(email => {
        const result = DataValidator.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should detect common email typos', () => {
      const result = DataValidator.validateEmail('test@gmial.com');
      expect(result.warnings).toContain('Did you mean gmail.com?');
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = DataValidator.validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is too long (maximum 254 characters)');
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone formats', () => {
      const validPhones = [
        '+66812345678',
        '0812345678',
        '+1234567890',
        '081-234-5678',
        '(081) 234-5678'
      ];

      validPhones.forEach(phone => {
        const result = DataValidator.validatePhone(phone);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid phone formats', () => {
      const invalidPhones = [
        '123',
        'abc123',
        '++66812345678',
        '12345678901234567890'
      ];

      invalidPhones.forEach(phone => {
        const result = DataValidator.validatePhone(phone);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should provide warnings for phone format improvements', () => {
      const result = DataValidator.validatePhone('66812345678');
      expect(result.warnings).toContain('Phone number should include + for international format');
    });

    it('should handle required vs optional phone validation', () => {
      const emptyPhoneRequired = DataValidator.validatePhone('', true);
      expect(emptyPhoneRequired.isValid).toBe(false);
      expect(emptyPhoneRequired.errors).toContain('Phone number is required');

      const emptyPhoneOptional = DataValidator.validatePhone('', false);
      expect(emptyPhoneOptional.isValid).toBe(true);
      expect(emptyPhoneOptional.errors).toHaveLength(0);
    });
  });

  describe('validateRequiredString', () => {
    it('should validate strings within length limits', () => {
      const result = DataValidator.validateRequiredString('Valid Name', 'Name', 2, 50);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty or whitespace-only strings', () => {
      const emptyResult = DataValidator.validateRequiredString('', 'Name');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.errors).toContain('Name is required');

      const whitespaceResult = DataValidator.validateRequiredString('   ', 'Name');
      expect(whitespaceResult.isValid).toBe(false);
      expect(whitespaceResult.errors).toContain('Name is required');
    });

    it('should enforce minimum length', () => {
      const result = DataValidator.validateRequiredString('A', 'Name', 2, 50);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be at least 2 characters long');
    });

    it('should enforce maximum length', () => {
      const longString = 'A'.repeat(100);
      const result = DataValidator.validateRequiredString(longString, 'Name', 1, 50);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must not exceed 50 characters');
    });
  });

  describe('validateLeadData', () => {
    it('should validate complete lead data', () => {
      const validLeadData = {
        company: {
          name: 'Example Corp'
        },
        contact: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+66812345678'
        },
        source: {
          channel: 'web_form'
        }
      };

      const result = DataValidator.validateLeadData(validLeadData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject lead data with missing required fields', () => {
      const invalidLeadData = {
        company: {},
        contact: {
          name: 'John Doe'
          // Missing email
        },
        source: {}
      };

      const result = DataValidator.validateLeadData(invalidLeadData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate nested field formats', () => {
      const leadDataWithInvalidEmail = {
        company: {
          name: 'Example Corp'
        },
        contact: {
          name: 'John Doe',
          email: 'invalid-email',
          phone: 'invalid-phone'
        },
        source: {
          channel: 'web_form'
        }
      };

      const result = DataValidator.validateLeadData(leadDataWithInvalidEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('email'))).toBe(true);
      expect(result.errors.some(error => error.includes('phone'))).toBe(true);
    });
  });

  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = DataValidator.sanitizeString(input);
      expect(result).toBe('scriptalert(xss)/scriptHello World');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
      expect(result).not.toContain("'");
    });

    it('should normalize whitespace', () => {
      const input = '  Hello    World  ';
      const result = DataValidator.sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should handle empty input', () => {
      const result = DataValidator.sanitizeString('');
      expect(result).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize email format', () => {
      const input = '  Test@Example.COM  ';
      const result = DataValidator.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    it('should remove dangerous characters', () => {
      const input = 'test<script>@example.com';
      const result = DataValidator.sanitizeEmail(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('sanitizePhone', () => {
    it('should keep valid phone characters', () => {
      const input = '  +66 (081) 234-5678  ';
      const result = DataValidator.sanitizePhone(input);
      expect(result).toBe('+66 (081) 234-5678');
    });

    it('should remove invalid characters', () => {
      const input = '+66abc081def234ghi5678';
      const result = DataValidator.sanitizePhone(input);
      expect(result).toBe('+660812345678');
    });
  });
});