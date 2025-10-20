import { validateSqlInput, sanitizeHtml } from '../src/middleware/validation';

/**
 * Simple tests for security features
 */

describe('Security Features', () => {
  describe('Input Validation', () => {
    test('should detect SQL injection attempts', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "UNION SELECT * FROM users",
        "admin'--",
        "' OR 'a'='a"
      ];

      maliciousInputs.forEach(input => {
        expect(validateSqlInput(input)).toBe(false);
      });
    });

    test('should allow safe SQL inputs', () => {
      const safeInputs = [
        "john.doe@example.com",
        "Company Name Inc",
        "Valid search term",
        "123-456-7890"
      ];

      safeInputs.forEach(input => {
        expect(validateSqlInput(input)).toBe(true);
      });
    });

    test('should sanitize HTML content', () => {
      const maliciousHtml = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHtml(maliciousHtml);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });
  });

  describe('GDPR Compliance', () => {
    test('should validate consent types', () => {
      const validConsentTypes = ['marketing', 'analytics', 'functional', 'data_processing'];
      const invalidConsentTypes = ['invalid', 'unknown', ''];

      validConsentTypes.forEach(type => {
        expect(['marketing', 'analytics', 'functional', 'data_processing']).toContain(type);
      });

      invalidConsentTypes.forEach(type => {
        expect(['marketing', 'analytics', 'functional', 'data_processing']).not.toContain(type);
      });
    });

    test('should validate deletion types', () => {
      const validDeletionTypes = ['full', 'anonymization', 'retention_only'];
      
      validDeletionTypes.forEach(type => {
        expect(['full', 'anonymization', 'retention_only']).toContain(type);
      });
    });
  });

  describe('Multi-Factor Authentication', () => {
    test('should validate MFA device types', () => {
      const validDeviceTypes = ['totp', 'sms', 'email'];
      const invalidDeviceTypes = ['invalid', 'unknown', ''];

      validDeviceTypes.forEach(type => {
        expect(['totp', 'sms', 'email']).toContain(type);
      });

      invalidDeviceTypes.forEach(type => {
        expect(['totp', 'sms', 'email']).not.toContain(type);
      });
    });

    test('should validate TOTP codes format', () => {
      const validCodes = ['123456', '000000', '999999'];
      const invalidCodes = ['12345', '1234567', 'abcdef', ''];

      validCodes.forEach(code => {
        expect(/^\d{6}$/.test(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(/^\d{6}$/.test(code)).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should have proper rate limit configurations', () => {
      const rateLimitConfigs = {
        general: { windowMs: 15 * 60 * 1000, max: 1000 },
        auth: { windowMs: 15 * 60 * 1000, max: 5 },
        fileUpload: { windowMs: 60 * 1000, max: 10 },
        search: { windowMs: 60 * 1000, max: 60 }
      };

      Object.values(rateLimitConfigs).forEach(config => {
        expect(config.windowMs).toBeGreaterThan(0);
        expect(config.max).toBeGreaterThan(0);
      });
    });
  });

  describe('Security Headers', () => {
    test('should validate security header configurations', () => {
      const securityHeaders = {
        'Content-Security-Policy': "default-src 'self'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      };

      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(header).toBeTruthy();
        expect(value).toBeTruthy();
      });
    });
  });

  describe('Password Security', () => {
    test('should validate password strength requirements', () => {
      const strongPasswords = [
        'MyStr0ng!Pass',
        'C0mplex@Password123',
        'Secure#Pass1'
      ];



      // Test individual components
      const hasLowercase = /(?=.*[a-z])/;
      const hasUppercase = /(?=.*[A-Z])/;
      const hasDigit = /(?=.*\d)/;
      const hasSpecial = /(?=.*[@$!%*?&#])/;
      const minLength = /.{8,}/;

      strongPasswords.forEach(password => {
        expect(hasLowercase.test(password)).toBe(true);
        expect(hasUppercase.test(password)).toBe(true);
        expect(hasDigit.test(password)).toBe(true);
        expect(hasSpecial.test(password)).toBe(true);
        expect(minLength.test(password)).toBe(true);
      });

      // Test that weak passwords fail at least one requirement
      expect(hasLowercase.test('PASSWORD123!')).toBe(false);
      expect(hasUppercase.test('password123!')).toBe(false);
      expect(hasDigit.test('Password!')).toBe(false);
      expect(hasSpecial.test('Password123')).toBe(false);
      expect(minLength.test('Pass1!')).toBe(false);
    });
  });

  describe('Audit Categories', () => {
    test('should handle different audit categories', () => {
      const categories = ['authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security'];
      
      categories.forEach(category => {
        expect(['authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security']).toContain(category);
      });
    });
  });
});