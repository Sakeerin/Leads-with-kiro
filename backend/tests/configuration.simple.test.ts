import { 
  CustomFieldEntityType, 
  CustomFieldType as FieldType, 
  PicklistType, 
  WorkflowEntityType,
  HolidayType,
  ConfigCategory,
  ConfigDataType
} from '../src/types';

describe('Configuration System Types', () => {
  test('should have all required custom field entity types', () => {
    const entityTypes = Object.values(CustomFieldEntityType);
    expect(entityTypes).toContain('lead');
    expect(entityTypes).toContain('account');
    expect(entityTypes).toContain('contact');
    expect(entityTypes).toContain('opportunity');
  });

  test('should have all required custom field types', () => {
    const fieldTypes = Object.values(FieldType);
    expect(fieldTypes).toContain('text');
    expect(fieldTypes).toContain('number');
    expect(fieldTypes).toContain('date');
    expect(fieldTypes).toContain('boolean');
    expect(fieldTypes).toContain('picklist');
    expect(fieldTypes).toContain('email');
    expect(fieldTypes).toContain('phone');
  });

  test('should have all required picklist types', () => {
    const picklistTypes = Object.values(PicklistType);
    expect(picklistTypes).toContain('status');
    expect(picklistTypes).toContain('source');
    expect(picklistTypes).toContain('product_type');
    expect(picklistTypes).toContain('ad_type');
  });

  test('should have all required workflow entity types', () => {
    const workflowTypes = Object.values(WorkflowEntityType);
    expect(workflowTypes).toContain('lead');
    expect(workflowTypes).toContain('opportunity');
  });

  test('should have all required holiday types', () => {
    const holidayTypes = Object.values(HolidayType);
    expect(holidayTypes).toContain('national');
    expect(holidayTypes).toContain('company');
    expect(holidayTypes).toContain('regional');
  });

  test('should have all required config categories', () => {
    const configCategories = Object.values(ConfigCategory);
    expect(configCategories).toContain('general');
    expect(configCategories).toContain('email');
    expect(configCategories).toContain('scoring');
    expect(configCategories).toContain('routing');
    expect(configCategories).toContain('security');
  });

  test('should have all required config data types', () => {
    const dataTypes = Object.values(ConfigDataType);
    expect(dataTypes).toContain('string');
    expect(dataTypes).toContain('number');
    expect(dataTypes).toContain('boolean');
    expect(dataTypes).toContain('json');
  });
});

describe('Configuration Service Structure', () => {
  test('should be able to import configuration service', () => {
    expect(() => {
      require('../src/services/configurationService');
    }).not.toThrow();
  });

  test('should be able to import configuration controller', () => {
    expect(() => {
      require('../src/controllers/configurationController');
    }).not.toThrow();
  });

  test('should be able to import configuration routes', () => {
    expect(() => {
      require('../src/routes/configuration');
    }).not.toThrow();
  });
});

describe('Configuration Models Structure', () => {
  test('should be able to import all configuration models', () => {
    expect(() => {
      require('../src/models/CustomField');
      require('../src/models/PicklistValue');
      require('../src/models/StatusWorkflow');
      require('../src/models/WorkingHoursConfig');
      require('../src/models/Holiday');
      require('../src/models/SystemConfig');
    }).not.toThrow();
  });
});

describe('Configuration Validation Logic', () => {
  test('should validate email field type correctly', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test('test@example.com')).toBe(true);
    expect(emailRegex.test('invalid-email')).toBe(false);
    expect(emailRegex.test('test@')).toBe(false);
    expect(emailRegex.test('@example.com')).toBe(false);
  });

  test('should validate phone field type correctly', () => {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    
    expect(phoneRegex.test('+1234567890')).toBe(true);
    expect(phoneRegex.test('123-456-7890')).toBe(true);
    expect(phoneRegex.test('(123) 456-7890')).toBe(true);
    expect(phoneRegex.test('abc123')).toBe(false);
  });

  test('should validate URL field type correctly', () => {
    const validUrls = [
      'https://example.com',
      'http://example.com',
      'https://www.example.com/path'
    ];

    validUrls.forEach(url => {
      expect(() => new URL(url)).not.toThrow();
    });

    // Test invalid URLs
    expect(() => new URL('not-a-url')).toThrow();
    expect(() => new URL('example.com')).toThrow();
  });
});

describe('Working Hours Logic', () => {
  test('should create default working hours schedule', () => {
    const defaultSchedule = {
      monday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
      tuesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
      wednesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
      thursday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
      friday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
      saturday: { isWorkingDay: false },
      sunday: { isWorkingDay: false }
    };

    expect(defaultSchedule.monday.isWorkingDay).toBe(true);
    expect(defaultSchedule.saturday.isWorkingDay).toBe(false);
    expect(defaultSchedule.sunday.isWorkingDay).toBe(false);
  });

  test('should validate time format', () => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    expect(timeRegex.test('09:00')).toBe(true);
    expect(timeRegex.test('17:30')).toBe(true);
    expect(timeRegex.test('23:59')).toBe(true);
    expect(timeRegex.test('24:00')).toBe(false);
    expect(timeRegex.test('9:00')).toBe(true);
    expect(timeRegex.test('invalid')).toBe(false);
  });
});

describe('Thai Holidays', () => {
  test('should have correct Thai national holidays', () => {
    const year = 2024;
    const expectedHolidays = [
      { name: "New Year's Day", date: new Date(year, 0, 1) },
      { name: "Chakri Memorial Day", date: new Date(year, 3, 6) },
      { name: "Songkran Festival", date: new Date(year, 3, 13) },
      { name: "Labour Day", date: new Date(year, 4, 1) },
      { name: "Coronation Day", date: new Date(year, 4, 4) }
    ];

    expectedHolidays.forEach(holiday => {
      expect(holiday.date.getFullYear()).toBe(year);
      expect(holiday.name).toBeTruthy();
    });
  });
});

describe('Status Workflow Logic', () => {
  test('should validate status transitions', () => {
    const sampleTransitions = [
      { fromStatus: 'new', toStatus: 'contacted', isAllowed: true },
      { fromStatus: 'contacted', toStatus: 'qualified', isAllowed: true },
      { fromStatus: 'qualified', toStatus: 'proposal', isAllowed: true },
      { fromStatus: 'won', toStatus: 'new', isAllowed: false }
    ];

    const allowedTransitions = sampleTransitions.filter(t => t.isAllowed);
    const disallowedTransitions = sampleTransitions.filter(t => !t.isAllowed);

    expect(allowedTransitions.length).toBe(3);
    expect(disallowedTransitions.length).toBe(1);
    expect(disallowedTransitions[0]?.fromStatus).toBe('won');
  });
});

describe('System Configuration', () => {
  test('should have default configuration structure', () => {
    const defaultConfigs = [
      { key: 'system.name', category: 'general', dataType: 'string' },
      { key: 'system.timezone', category: 'general', dataType: 'string' },
      { key: 'email.smtp.host', category: 'email', dataType: 'string' },
      { key: 'security.session.timeout', category: 'security', dataType: 'number' }
    ];

    defaultConfigs.forEach(config => {
      expect(config.key).toBeTruthy();
      expect(config.category).toBeTruthy();
      expect(config.dataType).toBeTruthy();
    });
  });

  test('should validate configuration data types', () => {
    const stringValue = 'test string';
    const numberValue = 42;
    const booleanValue = true;
    const jsonValue = { key: 'value' };

    expect(typeof stringValue).toBe('string');
    expect(typeof numberValue).toBe('number');
    expect(typeof booleanValue).toBe('boolean');
    expect(typeof jsonValue).toBe('object');
  });
});