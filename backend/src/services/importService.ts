import * as XLSX from 'xlsx';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import { ImportHistory } from '../models/ImportHistory';
import { ImportRecord } from '../models/ImportRecord';
import { LeadService, CreateLeadRequest } from './leadService';
import { 
  ImportRequest, 
  ImportResult, 
  ImportFileType, 
  ImportStatus, 
  ImportRecordStatus,
  FieldMapping,
  ValidationError,
  DuplicateReport,
  LeadChannel,
  LeadStatus,
  CompanySize,
  InterestLevel,
  BudgetStatus,
  PurchaseTimeline,
  BusinessType,
  ProductType,
  AdType
} from '../types';
import { ValidationError as AppValidationError, NotFoundError } from '../utils/errors';

export interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  validateOnly?: boolean;
  batchSize?: number;
}

export interface ImportProgress {
  importId: string;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  currentStatus: ImportStatus;
}

export class ImportService {
  private static readonly DEFAULT_FIELD_MAPPING: FieldMapping = {
    'Company Name': 'company.name',
    'Company': 'company.name',
    'Contact Name': 'contact.name',
    'Name': 'contact.name',
    'Email': 'contact.email',
    'Phone': 'contact.phone',
    'Mobile': 'contact.mobile',
    'Source': 'source.channel',
    'Channel': 'source.channel',
    'Campaign': 'source.campaign',
    'Status': 'status',
    'Industry': 'company.industry',
    'Company Size': 'company.size',
    'Interest Level': 'qualification.interest',
    'Budget': 'qualification.budget',
    'Timeline': 'qualification.timeline',
    'Business Type': 'qualification.businessType',
    'Product Type': 'product.type',
    'Ad Type': 'product.adType',
    'Follow Up Date': 'followUp.nextDate',
    'Notes': 'followUp.notes'
  };

  /**
   * Parse uploaded file and extract data
   */
  static async parseFile(file: Express.Multer.File): Promise<{
    data: Record<string, any>[];
    fileType: ImportFileType;
    totalRecords: number;
  }> {
    const fileType = this.detectFileType(file);
    let data: Record<string, any>[] = [];

    try {
      if (fileType === ImportFileType.CSV) {
        data = await this.parseCSV(file.buffer);
      } else if (fileType === ImportFileType.XLSX) {
        data = await this.parseXLSX(file.buffer);
      } else {
        throw new AppValidationError('Unsupported file type. Only CSV and XLSX files are supported.');
      }

      return {
        data,
        fileType,
        totalRecords: data.length
      };
    } catch (error) {
      throw new AppValidationError(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect file type from file extension and MIME type
   */
  private static detectFileType(file: Express.Multer.File): ImportFileType {
    const extension = file.originalname.toLowerCase().split('.').pop();
    
    if (extension === 'csv' || file.mimetype === 'text/csv') {
      return ImportFileType.CSV;
    } else if (extension === 'xlsx' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return ImportFileType.XLSX;
    } else {
      throw new AppValidationError('Unsupported file type. Only CSV and XLSX files are supported.');
    }
  }

  /**
   * Parse CSV file
   */
  private static async parseCSV(buffer: Buffer): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const results: Record<string, any>[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * Parse XLSX file
   */
  private static async parseXLSX(buffer: Buffer): Promise<Record<string, any>[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      throw new AppValidationError('No worksheets found in the Excel file');
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      throw new AppValidationError('The worksheet is empty');
    }

    // Convert array of arrays to array of objects using first row as headers
    const headers = data[0] as string[];
    const rows = data.slice(1) as any[][];

    return rows.map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }

  /**
   * Generate suggested field mapping based on column headers
   */
  static generateFieldMapping(columns: string[]): FieldMapping {
    const mapping: FieldMapping = {};

    columns.forEach(column => {
      const normalizedColumn = column.trim();
      
      // Try exact match first
      if (this.DEFAULT_FIELD_MAPPING[normalizedColumn]) {
        mapping[normalizedColumn] = this.DEFAULT_FIELD_MAPPING[normalizedColumn];
        return;
      }

      // Try case-insensitive match
      const lowerColumn = normalizedColumn.toLowerCase();
      const matchedKey = Object.keys(this.DEFAULT_FIELD_MAPPING).find(
        key => key.toLowerCase() === lowerColumn
      );

      if (matchedKey) {
        mapping[normalizedColumn] = this.DEFAULT_FIELD_MAPPING[matchedKey];
        return;
      }

      // Try partial matches
      if (lowerColumn.includes('company') || lowerColumn.includes('organization')) {
        mapping[normalizedColumn] = 'company.name';
      } else if (lowerColumn.includes('contact') || lowerColumn.includes('name')) {
        mapping[normalizedColumn] = 'contact.name';
      } else if (lowerColumn.includes('email') || lowerColumn.includes('mail')) {
        mapping[normalizedColumn] = 'contact.email';
      } else if (lowerColumn.includes('phone') || lowerColumn.includes('tel')) {
        mapping[normalizedColumn] = 'contact.phone';
      } else if (lowerColumn.includes('mobile') || lowerColumn.includes('cell')) {
        mapping[normalizedColumn] = 'contact.mobile';
      } else if (lowerColumn.includes('source') || lowerColumn.includes('channel')) {
        mapping[normalizedColumn] = 'source.channel';
      } else if (lowerColumn.includes('campaign')) {
        mapping[normalizedColumn] = 'source.campaign';
      } else if (lowerColumn.includes('status')) {
        mapping[normalizedColumn] = 'status';
      } else if (lowerColumn.includes('industry')) {
        mapping[normalizedColumn] = 'company.industry';
      } else if (lowerColumn.includes('size')) {
        mapping[normalizedColumn] = 'company.size';
      } else if (lowerColumn.includes('interest')) {
        mapping[normalizedColumn] = 'qualification.interest';
      } else if (lowerColumn.includes('budget')) {
        mapping[normalizedColumn] = 'qualification.budget';
      } else if (lowerColumn.includes('timeline')) {
        mapping[normalizedColumn] = 'qualification.timeline';
      } else if (lowerColumn.includes('business') && lowerColumn.includes('type')) {
        mapping[normalizedColumn] = 'qualification.businessType';
      } else if (lowerColumn.includes('product')) {
        mapping[normalizedColumn] = 'product.type';
      } else if (lowerColumn.includes('ad') && lowerColumn.includes('type')) {
        mapping[normalizedColumn] = 'product.adType';
      } else if (lowerColumn.includes('follow') || lowerColumn.includes('next')) {
        mapping[normalizedColumn] = 'followUp.nextDate';
      } else if (lowerColumn.includes('note') || lowerColumn.includes('comment')) {
        mapping[normalizedColumn] = 'followUp.notes';
      }
    });

    return mapping;
  }

  /**
   * Transform raw data row to CreateLeadRequest using field mapping
   */
  private static transformRowToLead(
    row: Record<string, any>,
    fieldMapping: FieldMapping,
    rowNumber: number,
    importedBy: string
  ): { lead: CreateLeadRequest; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const lead: Partial<CreateLeadRequest> = {
      company: {},
      contact: {},
      source: {},
      assignment: {},
      qualification: {},
      followUp: {},
      product: {},
      customFields: {},
      createdBy: importedBy
    };

    // Process each mapped field
    Object.entries(fieldMapping).forEach(([csvColumn, leadField]) => {
      const value = row[csvColumn];
      
      if (value === undefined || value === null || value === '') {
        return; // Skip empty values
      }

      try {
        this.setNestedValue(lead, leadField, value, rowNumber, csvColumn, errors);
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: csvColumn,
          value,
          message: error instanceof Error ? error.message : 'Invalid value',
          code: 'TRANSFORMATION_ERROR'
        });
      }
    });

    // Validate required fields
    if (!lead.company?.name) {
      errors.push({
        row: rowNumber,
        field: 'company.name',
        value: null,
        message: 'Company name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!lead.contact?.name) {
      errors.push({
        row: rowNumber,
        field: 'contact.name',
        value: null,
        message: 'Contact name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!lead.contact?.email) {
      errors.push({
        row: rowNumber,
        field: 'contact.email',
        value: null,
        message: 'Contact email is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Set defaults
    if (!lead.source?.channel) {
      lead.source!.channel = LeadChannel.VENDOR_LIST;
    }

    if (!lead.status) {
      lead.status = LeadStatus.NEW;
    }

    return { lead: lead as CreateLeadRequest, errors };
  }

  /**
   * Set nested object value using dot notation
   */
  private static setNestedValue(
    obj: any,
    path: string,
    value: any,
    rowNumber: number,
    csvColumn: string,
    errors: ValidationError[]
  ): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    const finalKey = keys[keys.length - 1];
    const transformedValue = this.transformValue(path, value, rowNumber, csvColumn, errors);
    
    if (transformedValue !== undefined) {
      current[finalKey] = transformedValue;
    }
  }

  /**
   * Transform and validate field values
   */
  private static transformValue(
    fieldPath: string,
    value: any,
    rowNumber: number,
    csvColumn: string,
    errors: ValidationError[]
  ): any {
    const stringValue = String(value).trim();

    try {
      switch (fieldPath) {
        case 'source.channel':
          return this.parseEnum(stringValue, LeadChannel, 'source channel');
        
        case 'status':
          return this.parseEnum(stringValue, LeadStatus, 'status');
        
        case 'company.size':
          return this.parseEnum(stringValue, CompanySize, 'company size');
        
        case 'qualification.interest':
          return this.parseEnum(stringValue, InterestLevel, 'interest level');
        
        case 'qualification.budget':
          return this.parseEnum(stringValue, BudgetStatus, 'budget status');
        
        case 'qualification.timeline':
          return this.parseEnum(stringValue, PurchaseTimeline, 'purchase timeline');
        
        case 'qualification.businessType':
          return this.parseEnum(stringValue, BusinessType, 'business type');
        
        case 'product.type':
          return this.parseEnum(stringValue, ProductType, 'product type');
        
        case 'product.adType':
          return this.parseEnum(stringValue, AdType, 'ad type');
        
        case 'followUp.nextDate':
          return this.parseDate(stringValue);
        
        case 'contact.email':
          if (!this.isValidEmail(stringValue)) {
            throw new Error('Invalid email format');
          }
          return stringValue.toLowerCase();
        
        case 'contact.phone':
        case 'contact.mobile':
          return this.normalizePhone(stringValue);
        
        default:
          return stringValue;
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        field: csvColumn,
        value,
        message: error instanceof Error ? error.message : 'Invalid value',
        code: 'VALIDATION_ERROR'
      });
      return undefined;
    }
  }

  /**
   * Parse enum value with fuzzy matching
   */
  private static parseEnum(value: string, enumObj: any, fieldName: string): any {
    const lowerValue = value.toLowerCase();
    
    // Try exact match first
    const exactMatch = Object.values(enumObj).find(
      (enumValue: any) => enumValue.toLowerCase() === lowerValue
    );
    
    if (exactMatch) {
      return exactMatch;
    }

    // Try partial match
    const partialMatch = Object.values(enumObj).find(
      (enumValue: any) => enumValue.toLowerCase().includes(lowerValue) || lowerValue.includes(enumValue.toLowerCase())
    );
    
    if (partialMatch) {
      return partialMatch;
    }

    throw new Error(`Invalid ${fieldName}: ${value}. Valid values are: ${Object.values(enumObj).join(', ')}`);
  }

  /**
   * Parse date string
   */
  private static parseDate(value: string): Date {
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${value}`);
    }
    
    return date;
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Normalize phone number
   */
  private static normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * Import leads from file
   */
  static async importLeads(
    request: ImportRequest,
    importedBy: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { file, fieldMapping, skipDuplicates = false, updateExisting = false, validateOnly = false } = request;
    const { batchSize = 100 } = options;

    // Parse the file
    const { data, fileType, totalRecords } = await this.parseFile(file);

    if (totalRecords === 0) {
      throw new AppValidationError('The file is empty or contains no valid data');
    }

    // Generate field mapping if not provided
    const finalFieldMapping = fieldMapping || this.generateFieldMapping(Object.keys(data[0]));

    // Create import history record
    const importHistory = await ImportHistory.createImport({
      filename: `import_${Date.now()}_${file.originalname}`,
      originalFilename: file.originalname,
      fileType,
      totalRecords,
      fieldMapping: finalFieldMapping,
      importedBy
    });

    const result: ImportResult = {
      importId: importHistory.id,
      status: ImportStatus.PROCESSING,
      totalRecords,
      successfulRecords: 0,
      failedRecords: 0,
      duplicateRecords: 0,
      validationErrors: [],
      duplicateReport: {
        totalDuplicates: 0,
        duplicatesByType: {},
        duplicateDetails: []
      },
      processedRecords: []
    };

    try {
      // Process records in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await this.processBatch(batch, i, finalFieldMapping, importHistory.id, importedBy, result, {
          skipDuplicates,
          updateExisting,
          validateOnly
        });
      }

      // Update import history with final results
      await ImportHistory.updateImportStatus(importHistory.id, ImportStatus.COMPLETED, {
        successfulRecords: result.successfulRecords,
        failedRecords: result.failedRecords,
        duplicateRecords: result.duplicateRecords,
        validationErrors: result.validationErrors,
        duplicateReport: result.duplicateReport
      });

      result.status = ImportStatus.COMPLETED;

    } catch (error) {
      // Update import history with error
      await ImportHistory.updateImportStatus(importHistory.id, ImportStatus.FAILED, {
        successfulRecords: result.successfulRecords,
        failedRecords: result.failedRecords,
        duplicateRecords: result.duplicateRecords,
        validationErrors: result.validationErrors
      });

      result.status = ImportStatus.FAILED;
      throw error;
    }

    return result;
  }

  /**
   * Process a batch of records
   */
  private static async processBatch(
    batch: Record<string, any>[],
    startIndex: number,
    fieldMapping: FieldMapping,
    importId: string,
    importedBy: string,
    result: ImportResult,
    options: { skipDuplicates: boolean; updateExisting: boolean; validateOnly: boolean }
  ): Promise<void> {
    for (let i = 0; i < batch.length; i++) {
      const rowNumber = startIndex + i + 1; // 1-based row numbering
      const row = batch[i];

      try {
        // Transform row to lead data
        const { lead, errors } = this.transformRowToLead(row, fieldMapping, rowNumber, importedBy);

        if (errors.length > 0) {
          // Record failed due to validation errors
          const importRecord = await ImportRecord.createRecord({
            importId,
            rowNumber,
            status: ImportRecordStatus.FAILED,
            originalData: row,
            validationErrors: errors.map(e => e.message)
          });

          result.processedRecords.push(ImportRecord.transformToImportRecordType(importRecord));
          result.failedRecords++;
          result.validationErrors.push(...errors);
          continue;
        }

        // Check for duplicates
        const duplicates = await LeadService.detectDuplicatesAdvanced({
          email: lead.contact.email,
          phone: lead.contact.phone,
          mobile: lead.contact.mobile,
          companyName: lead.company.name,
          contactName: lead.contact.name
        });

        if (duplicates.length > 0) {
          if (options.skipDuplicates) {
            // Skip duplicate
            const importRecord = await ImportRecord.createRecord({
              importId,
              rowNumber,
              status: ImportRecordStatus.SKIPPED,
              originalData: row,
              duplicateMatches: duplicates
            });

            result.processedRecords.push(ImportRecord.transformToImportRecordType(importRecord));
            result.duplicateRecords++;
            
            // Update duplicate report
            result.duplicateReport.totalDuplicates++;
            result.duplicateReport.duplicateDetails.push({
              row: rowNumber,
              matches: duplicates
            });

            duplicates.forEach(duplicate => {
              const type = duplicate.matchType;
              result.duplicateReport.duplicatesByType[type] = (result.duplicateReport.duplicatesByType[type] || 0) + 1;
            });

            continue;
          } else if (options.updateExisting) {
            // Update existing lead (use first match)
            const existingLead = duplicates[0].lead;
            
            if (!options.validateOnly) {
              await LeadService.updateLead(existingLead.id, {
                company: lead.company,
                contact: lead.contact,
                source: lead.source,
                qualification: lead.qualification,
                followUp: lead.followUp,
                product: lead.product
              }, importedBy);
            }

            const importRecord = await ImportRecord.createRecord({
              importId,
              rowNumber,
              leadId: existingLead.id,
              status: ImportRecordStatus.SUCCESS,
              originalData: row,
              processedData: lead,
              duplicateMatches: duplicates
            });

            result.processedRecords.push(ImportRecord.transformToImportRecordType(importRecord));
            result.successfulRecords++;
            continue;
          } else {
            // Mark as duplicate but don't skip
            const importRecord = await ImportRecord.createRecord({
              importId,
              rowNumber,
              status: ImportRecordStatus.DUPLICATE,
              originalData: row,
              duplicateMatches: duplicates
            });

            result.processedRecords.push(ImportRecord.transformToImportRecordType(importRecord));
            result.duplicateRecords++;
            
            // Update duplicate report
            result.duplicateReport.totalDuplicates++;
            result.duplicateReport.duplicateDetails.push({
              row: rowNumber,
              matches: duplicates
            });

            duplicates.forEach(duplicate => {
              const type = duplicate.matchType;
              result.duplicateReport.duplicatesByType[type] = (result.duplicateReport.duplicatesByType[type] || 0) + 1;
            });

            continue;
          }
        }

        // Create new lead
        let leadId: string | undefined;
        
        if (!options.validateOnly) {
          const createdLead = await LeadService.createLead(lead, true); // Skip quality check for imports
          leadId = createdLead.id;
        }

        const importRecord = await ImportRecord.createRecord({
          importId,
          rowNumber,
          leadId,
          status: ImportRecordStatus.SUCCESS,
          originalData: row,
          processedData: lead
        });

        result.processedRecords.push(ImportRecord.transformToImportRecordType(importRecord));
        result.successfulRecords++;

      } catch (error) {
        // Record processing error
        const importRecord = await ImportRecord.createRecord({
          importId,
          rowNumber,
          status: ImportRecordStatus.FAILED,
          originalData: row,
          validationErrors: [error instanceof Error ? error.message : 'Unknown error']
        });

        result.processedRecords.push(ImportRecord.transformToImportRecordType(importRecord));
        result.failedRecords++;
        
        result.validationErrors.push({
          row: rowNumber,
          field: 'general',
          value: null,
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PROCESSING_ERROR'
        });
      }
    }
  }

  /**
   * Get import progress
   */
  static async getImportProgress(importId: string): Promise<ImportProgress> {
    const importHistory = await ImportHistory.findById(importId);
    
    if (!importHistory) {
      throw new NotFoundError(`Import with ID ${importId} not found`);
    }

    const summary = await ImportRecord.getImportSummary(importId);

    return {
      importId,
      totalRecords: importHistory.total_records,
      processedRecords: summary.total,
      successfulRecords: summary.byStatus[ImportRecordStatus.SUCCESS],
      failedRecords: summary.byStatus[ImportRecordStatus.FAILED],
      duplicateRecords: summary.byStatus[ImportRecordStatus.DUPLICATE] + summary.byStatus[ImportRecordStatus.SKIPPED],
      currentStatus: importHistory.status
    };
  }

  /**
   * Get import history
   */
  static async getImportHistory(importedBy?: string, limit: number = 20): Promise<ImportHistory[]> {
    const dbImports = importedBy 
      ? await ImportHistory.findByImportedBy(importedBy)
      : await ImportHistory.findRecent(limit);

    return dbImports.map(ImportHistory.transformToImportHistoryType);
  }

  /**
   * Get import details
   */
  static async getImportDetails(importId: string): Promise<{
    import: ImportHistory;
    summary: any;
    records: any;
  }> {
    const [importHistory, summary, recordsResult] = await Promise.all([
      ImportHistory.findById(importId),
      ImportRecord.getImportSummary(importId),
      ImportRecord.getRecordsByImportWithPagination(importId, 1, 50)
    ]);

    if (!importHistory) {
      throw new NotFoundError(`Import with ID ${importId} not found`);
    }

    return {
      import: ImportHistory.transformToImportHistoryType(importHistory),
      summary,
      records: {
        records: recordsResult.records.map(ImportRecord.transformToImportRecordType),
        pagination: recordsResult.pagination
      }
    };
  }

  /**
   * Rollback import
   */
  static async rollbackImport(importId: string, rolledBackBy: string): Promise<void> {
    const importHistory = await ImportHistory.findById(importId);
    
    if (!importHistory) {
      throw new NotFoundError(`Import with ID ${importId} not found`);
    }

    if (importHistory.status !== ImportStatus.COMPLETED) {
      throw new AppValidationError('Only completed imports can be rolled back');
    }

    // Get all successful records from this import
    const successfulRecords = await ImportRecord.findByStatus(importId, ImportRecordStatus.SUCCESS);

    // Soft delete all leads created by this import
    for (const record of successfulRecords) {
      if (record.lead_id) {
        try {
          await LeadService.deleteLead(record.lead_id, rolledBackBy);
        } catch (error) {
          console.warn(`Failed to delete lead ${record.lead_id} during rollback:`, error);
        }
      }
    }

    // Mark import as rolled back
    await ImportHistory.markAsRolledBack(importId, rolledBackBy);
  }

  /**
   * Validate import file without processing
   */
  static async validateImportFile(
    file: Express.Multer.File,
    fieldMapping?: FieldMapping
  ): Promise<{
    isValid: boolean;
    totalRecords: number;
    suggestedMapping: FieldMapping;
    validationErrors: ValidationError[];
    sampleData: Record<string, any>[];
  }> {
    const { data, totalRecords } = await this.parseFile(file);
    
    if (totalRecords === 0) {
      return {
        isValid: false,
        totalRecords: 0,
        suggestedMapping: {},
        validationErrors: [{
          row: 0,
          field: 'file',
          value: null,
          message: 'File is empty',
          code: 'EMPTY_FILE'
        }],
        sampleData: []
      };
    }

    const suggestedMapping = fieldMapping || this.generateFieldMapping(Object.keys(data[0]));
    const validationErrors: ValidationError[] = [];
    
    // Validate first 10 rows as sample
    const sampleSize = Math.min(10, data.length);
    const sampleData = data.slice(0, sampleSize);

    for (let i = 0; i < sampleSize; i++) {
      const { errors } = this.transformRowToLead(data[i], suggestedMapping, i + 1, 'validator');
      validationErrors.push(...errors);
    }

    return {
      isValid: validationErrors.length === 0,
      totalRecords,
      suggestedMapping,
      validationErrors,
      sampleData
    };
  }
}