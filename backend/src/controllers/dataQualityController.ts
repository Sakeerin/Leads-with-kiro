import { Request, Response } from 'express';
import { LeadService } from '../services/leadService';
import { DataValidator } from '../utils/dataValidation';
import { ValidationError } from '../utils/errors';

export class DataQualityController {
  /**
   * Perform data quality check on lead data
   */
  static async checkLeadQuality(req: Request, res: Response): Promise<void> {
    try {
      const leadData = req.body;

      if (!leadData || typeof leadData !== 'object') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Lead data is required'
          }
        });
        return;
      }

      // Sanitize the data first
      const sanitizedData = LeadService.sanitizeLeadData(leadData);

      // Perform quality check
      const qualityCheck = await LeadService.performDataQualityCheck(sanitizedData);

      res.json({
        originalData: leadData,
        sanitizedData,
        qualityCheck
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        });
        return;
      }

      console.error('Error checking lead quality:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check lead quality'
        }
      });
    }
  }

  /**
   * Bulk data quality check for multiple leads
   */
  static async bulkQualityCheck(req: Request, res: Response): Promise<void> {
    try {
      const { leads } = req.body;

      if (!Array.isArray(leads) || leads.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Array of leads is required'
          }
        });
        return;
      }

      if (leads.length > 100) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Maximum 100 leads allowed per request'
          }
        });
        return;
      }

      // Sanitize all leads first
      const sanitizedLeads = leads.map(lead => LeadService.sanitizeLeadData(lead));

      // Perform bulk quality check
      const result = await LeadService.bulkDataQualityCheck(sanitizedLeads);

      res.json(result);
    } catch (error) {
      console.error('Error in bulk quality check:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform bulk quality check'
        }
      });
    }
  }

  /**
   * Validate specific field
   */
  static async validateField(req: Request, res: Response): Promise<void> {
    try {
      const { fieldType, value } = req.body;

      if (!fieldType || value === undefined) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field type and value are required'
          }
        });
        return;
      }

      let validationResult;

      switch (fieldType) {
        case 'email':
          validationResult = DataValidator.validateEmail(value);
          break;
        case 'phone':
          validationResult = DataValidator.validatePhone(value, false);
          break;
        case 'url':
          validationResult = DataValidator.validateUrl(value, false);
          break;
        case 'date':
          validationResult = DataValidator.validateDate(value, 'date', false);
          break;
        case 'string':
          const { minLength = 1, maxLength = 255, fieldName = 'field' } = req.body;
          validationResult = DataValidator.validateRequiredString(value, fieldName, minLength, maxLength);
          break;
        default:
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Unsupported field type: ${fieldType}. Supported types: email, phone, url, date, string`
            }
          });
          return;
      }

      res.json({
        fieldType,
        value,
        validation: validationResult
      });
    } catch (error) {
      console.error('Error validating field:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate field'
        }
      });
    }
  }

  /**
   * Sanitize data
   */
  static async sanitizeData(req: Request, res: Response): Promise<void> {
    try {
      const { data, type } = req.body;

      if (!data || !type) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Data and type are required'
          }
        });
        return;
      }

      let sanitizedData;

      switch (type) {
        case 'string':
          sanitizedData = DataValidator.sanitizeString(data);
          break;
        case 'email':
          sanitizedData = DataValidator.sanitizeEmail(data);
          break;
        case 'phone':
          sanitizedData = DataValidator.sanitizePhone(data);
          break;
        case 'lead':
          if (typeof data !== 'object') {
            res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Lead data must be an object'
              }
            });
            return;
          }
          sanitizedData = LeadService.sanitizeLeadData(data);
          break;
        default:
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Unsupported sanitization type: ${type}. Supported types: string, email, phone, lead`
            }
          });
          return;
      }

      res.json({
        originalData: data,
        sanitizedData,
        type
      });
    } catch (error) {
      console.error('Error sanitizing data:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to sanitize data'
        }
      });
    }
  }

  /**
   * Get data quality suggestions
   */
  static async getQualitySuggestions(req: Request, res: Response): Promise<void> {
    try {
      const leadData = req.body;

      if (!leadData || typeof leadData !== 'object') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Lead data is required'
          }
        });
        return;
      }

      const suggestions: string[] = [];

      // Check for missing important fields
      if (!leadData.contact?.phone && !leadData.contact?.mobile) {
        suggestions.push('Consider adding a phone number to improve lead quality and contact success rate');
      }

      if (!leadData.company?.industry) {
        suggestions.push('Adding company industry helps with lead scoring and routing');
      }

      if (!leadData.company?.size) {
        suggestions.push('Company size information improves lead qualification');
      }

      if (!leadData.source?.campaign) {
        suggestions.push('Campaign information helps track marketing effectiveness');
      }

      // Check for data quality issues
      if (leadData.company?.name && leadData.company.name.length < 3) {
        suggestions.push('Company name seems too short - consider providing full company name');
      }

      if (leadData.contact?.name && leadData.contact.name.split(' ').length === 1) {
        suggestions.push('Consider providing both first and last name for better contact management');
      }

      // Check for potential duplicates in the same request
      if (leadData.contact?.phone && leadData.contact?.mobile && 
          leadData.contact.phone === leadData.contact.mobile) {
        suggestions.push('Phone and mobile numbers are identical - verify if both are correct');
      }

      // Email domain suggestions
      if (leadData.contact?.email) {
        const domain = leadData.contact.email.split('@')[1]?.toLowerCase();
        const commonPersonalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
        
        if (commonPersonalDomains.includes(domain)) {
          suggestions.push('Personal email domain detected - consider if business email is available');
        }
      }

      res.json({
        suggestions,
        count: suggestions.length
      });
    } catch (error) {
      console.error('Error getting quality suggestions:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get quality suggestions'
        }
      });
    }
  }

  /**
   * Validate lead data against custom rules
   */
  static async validateWithCustomRules(req: Request, res: Response): Promise<void> {
    try {
      const { leadData, rules } = req.body;

      if (!leadData || typeof leadData !== 'object') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Lead data is required'
          }
        });
        return;
      }

      if (!Array.isArray(rules)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation rules array is required'
          }
        });
        return;
      }

      // Flatten lead data for validation
      const flatData: Record<string, any> = {};
      
      if (leadData.company) {
        Object.keys(leadData.company).forEach(key => {
          flatData[`company.${key}`] = leadData.company[key];
        });
      }
      
      if (leadData.contact) {
        Object.keys(leadData.contact).forEach(key => {
          flatData[`contact.${key}`] = leadData.contact[key];
        });
      }
      
      if (leadData.source) {
        Object.keys(leadData.source).forEach(key => {
          flatData[`source.${key}`] = leadData.source[key];
        });
      }

      // Add other top-level fields
      Object.keys(leadData).forEach(key => {
        if (!['company', 'contact', 'source'].includes(key)) {
          flatData[key] = leadData[key];
        }
      });

      const validationResult = DataValidator.validateFields(flatData, rules);

      res.json({
        leadData,
        rules,
        validation: validationResult
      });
    } catch (error) {
      console.error('Error validating with custom rules:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate with custom rules'
        }
      });
    }
  }
}