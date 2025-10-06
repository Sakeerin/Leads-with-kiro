import { DuplicateDetectionEngine } from '../src/utils/duplicateDetection';

describe('DuplicateDetectionEngine', () => {
  let engine: DuplicateDetectionEngine;

  beforeEach(() => {
    engine = new DuplicateDetectionEngine();
  });

  describe('normalizePhone', () => {
    it('should normalize Thai phone numbers correctly', () => {
      expect(engine.normalizePhone('081-234-5678')).toBe('+66812345678');
      expect(engine.normalizePhone('0812345678')).toBe('+66812345678');
      expect(engine.normalizePhone('+66812345678')).toBe('+66812345678');
      expect(engine.normalizePhone('66812345678')).toBe('+66812345678');
    });

    it('should handle international phone numbers', () => {
      expect(engine.normalizePhone('+1234567890')).toBe('+1234567890');
      expect(engine.normalizePhone('1234567890')).toBe('+661234567890');
    });

    it('should remove formatting characters', () => {
      expect(engine.normalizePhone('(081) 234-5678')).toBe('+66812345678');
      expect(engine.normalizePhone('081 234 5678')).toBe('+66812345678');
    });
  });

  describe('normalizeCompanyName', () => {
    it('should remove common business suffixes', () => {
      expect(engine.normalizeCompanyName('Example Corp Ltd.')).toBe('example corp');
      expect(engine.normalizeCompanyName('Test Company Inc')).toBe('test company');
      expect(engine.normalizeCompanyName('ABC Corporation')).toBe('abc');
    });

    it('should normalize case and spaces', () => {
      expect(engine.normalizeCompanyName('  EXAMPLE   CORP  ')).toBe('example');
      expect(engine.normalizeCompanyName('Test-Company')).toBe('test company');
    });

    it('should handle special characters', () => {
      expect(engine.normalizeCompanyName('Example & Co.')).toBe('example');
      expect(engine.normalizeCompanyName('Test@Company')).toBe('test company');
    });
  });

  describe('normalizeContactName', () => {
    it('should remove titles', () => {
      expect(engine.normalizeContactName('Mr. John Doe')).toBe('john doe');
      expect(engine.normalizeContactName('Dr John Smith')).toBe('john smith');
      expect(engine.normalizeContactName('Mrs. Jane Wilson')).toBe('jane wilson');
    });

    it('should normalize case and spaces', () => {
      expect(engine.normalizeContactName('  JOHN   DOE  ')).toBe('john doe');
      expect(engine.normalizeContactName('john-doe')).toBe('john doe');
    });
  });

  describe('checkEmailMatch', () => {
    it('should match identical emails', () => {
      const result = engine.checkEmailMatch('test@example.com', 'test@example.com');
      expect(result).toBeTruthy();
      expect(result?.confidence).toBe(1.0);
      expect(result?.matchType).toBe('exact');
    });

    it('should match emails with different cases', () => {
      const result = engine.checkEmailMatch('Test@Example.Com', 'test@example.com');
      expect(result).toBeTruthy();
      expect(result?.confidence).toBe(1.0);
    });

    it('should not match different emails', () => {
      const result = engine.checkEmailMatch('test1@example.com', 'test2@example.com');
      expect(result).toBeNull();
    });
  });

  describe('checkPhoneMatch', () => {
    it('should match normalized phone numbers', () => {
      const result = engine.checkPhoneMatch('081-234-5678', '+66812345678');
      expect(result).toBeTruthy();
      expect(result?.confidence).toBe(0.95);
      expect(result?.matchType).toBe('normalized');
    });

    it('should match partial phone numbers', () => {
      const result = engine.checkPhoneMatch('+66812345678', '+1812345678');
      expect(result).toBeTruthy();
      expect(result?.confidence).toBe(0.8);
      expect(result?.matchType).toBe('fuzzy');
    });

    it('should not match completely different numbers', () => {
      const result = engine.checkPhoneMatch('081-234-5678', '089-876-5432');
      expect(result).toBeNull();
    });
  });

  describe('checkCompanyMatch', () => {
    it('should match identical company names after normalization', () => {
      const result = engine.checkCompanyMatch('Example Corp Ltd', 'Example Corp Limited');
      expect(result).toBeTruthy();
      expect(result?.confidence).toBe(0.95);
      expect(result?.matchType).toBe('normalized');
    });

    it('should match similar company names with fuzzy matching', () => {
      const result = engine.checkCompanyMatch('Example Corporation', 'Example Corp');
      expect(result).toBeTruthy();
      expect(result?.confidence).toBeGreaterThan(0.7);
    });

    it('should not match completely different company names', () => {
      const result = engine.checkCompanyMatch('Example Corp', 'Different Company');
      expect(result).toBeNull();
    });
  });

  describe('analyzeDuplicate', () => {
    it('should detect email duplicates with high confidence', () => {
      const lead1 = {
        id: '1',
        email: 'test@example.com',
        phone: '081-234-5678',
        mobile: '089-876-5432',
        companyName: 'Example Corp',
        contactName: 'John Doe'
      };

      const lead2 = {
        id: '2',
        email: 'test@example.com',
        phone: '081-999-8888',
        mobile: '089-777-6666',
        companyName: 'Different Corp',
        contactName: 'Jane Smith'
      };

      const result = engine.analyzeDuplicate(lead1, lead2);
      expect(result).toBeTruthy();
      expect(result?.primaryMatchType).toBe('email');
      expect(result?.overallConfidence).toBe(0.95);
    });

    it('should detect phone duplicates', () => {
      const lead1 = {
        id: '1',
        email: 'test1@example.com',
        phone: '081-234-5678',
        mobile: '',
        companyName: 'Example Corp',
        contactName: 'John Doe'
      };

      const lead2 = {
        id: '2',
        email: 'test2@example.com',
        phone: '+66812345678',
        mobile: '',
        companyName: 'Different Corp',
        contactName: 'Jane Smith'
      };

      const result = engine.analyzeDuplicate(lead1, lead2);
      expect(result).toBeTruthy();
      expect(result?.primaryMatchType).toBe('phone');
      expect(result?.overallConfidence).toBeGreaterThan(0.8);
    });

    it('should detect company + contact name combinations', () => {
      const lead1 = {
        id: '1',
        email: 'john@example.com',
        phone: '081-234-5678',
        mobile: '',
        companyName: 'Example Corp',
        contactName: 'John Doe'
      };

      const lead2 = {
        id: '2',
        email: 'j.doe@example.com',
        phone: '089-876-5432',
        mobile: '',
        companyName: 'Example Corporation',
        contactName: 'John Doe'
      };

      const result = engine.analyzeDuplicate(lead1, lead2);
      expect(result).toBeTruthy();
      expect(result?.overallConfidence).toBeGreaterThan(0.6);
    });

    it('should not detect duplicates for completely different leads', () => {
      const lead1 = {
        id: '1',
        email: 'john@example.com',
        phone: '081-234-5678',
        mobile: '',
        companyName: 'Example Corp',
        contactName: 'John Doe'
      };

      const lead2 = {
        id: '2',
        email: 'jane@different.com',
        phone: '089-876-5432',
        mobile: '',
        companyName: 'Different Company',
        contactName: 'Jane Smith'
      };

      const result = engine.analyzeDuplicate(lead1, lead2);
      expect(result).toBeNull();
    });
  });
});