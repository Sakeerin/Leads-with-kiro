import { ImportService } from '../src/services/importService';
import { ImportFileType } from '../src/types';

// Mock file for testing
const createMockFile = (content: string, filename: string, mimetype: string): Express.Multer.File => ({
  fieldname: 'file',
  originalname: filename,
  encoding: '7bit',
  mimetype,
  size: Buffer.byteLength(content),
  buffer: Buffer.from(content),
  destination: '',
  filename: '',
  path: '',
  stream: null as any
});

describe('ImportService', () => {
  describe('parseFile', () => {
    it('should parse CSV file correctly', async () => {
      const csvContent = 'Company Name,Contact Name,Email\nTest Company,John Doe,john@test.com\nAnother Company,Jane Smith,jane@another.com';
      const mockFile = createMockFile(csvContent, 'test.csv', 'text/csv');

      const result = await ImportService.parseFile(mockFile);

      expect(result.fileType).toBe(ImportFileType.CSV);
      expect(result.totalRecords).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        'Company Name': 'Test Company',
        'Contact Name': 'John Doe',
        'Email': 'john@test.com'
      });
    });

    it('should generate field mapping correctly', () => {
      const columns = ['Company Name', 'Contact Name', 'Email', 'Phone Number'];
      const mapping = ImportService.generateFieldMapping(columns);

      expect(mapping['Company Name']).toBe('company.name');
      expect(mapping['Contact Name']).toBe('contact.name');
      expect(mapping['Email']).toBe('contact.email');
      expect(mapping['Phone Number']).toBe('contact.phone');
    });

    it('should handle case-insensitive column matching', () => {
      const columns = ['company', 'CONTACT NAME', 'email address'];
      const mapping = ImportService.generateFieldMapping(columns);

      expect(mapping['company']).toBe('company.name');
      expect(mapping['CONTACT NAME']).toBe('contact.name');
      expect(mapping['email address']).toBe('contact.email');
    });
  });

  describe('validateImportFile', () => {
    it('should validate CSV file and return validation result', async () => {
      const csvContent = 'Company,Name,Email\nTest Co,John,john@test.com';
      const mockFile = createMockFile(csvContent, 'test.csv', 'text/csv');

      const result = await ImportService.validateImportFile(mockFile);

      expect(result.totalRecords).toBe(1);
      expect(result.suggestedMapping).toBeDefined();
      expect(result.sampleData).toHaveLength(1);
    });

    it('should return validation errors for empty file', async () => {
      const csvContent = '';
      const mockFile = createMockFile(csvContent, 'empty.csv', 'text/csv');

      const result = await ImportService.validateImportFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.totalRecords).toBe(0);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0]?.code).toBe('EMPTY_FILE');
    });
  });

  describe('field mapping utilities', () => {
    it('should handle partial column matches', () => {
      const columns = ['comp_name', 'contact_email', 'phone_num'];
      const mapping = ImportService.generateFieldMapping(columns);

      expect(mapping['comp_name']).toBe('company.name');
      expect(mapping['contact_email']).toBe('contact.email');
      expect(mapping['phone_num']).toBe('contact.phone');
    });

    it('should map industry and size columns', () => {
      const columns = ['Industry', 'Company Size', 'Business Type'];
      const mapping = ImportService.generateFieldMapping(columns);

      expect(mapping['Industry']).toBe('company.industry');
      expect(mapping['Company Size']).toBe('company.size');
      expect(mapping['Business Type']).toBe('qualification.businessType');
    });
  });
});