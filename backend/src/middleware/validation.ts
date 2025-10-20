import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
// import DOMPurify from 'isomorphic-dompurify';
import { AppError } from '../utils/errors';

/**
 * Input validation and sanitization middleware
 */

// Common validation rules
export const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  phone: body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Valid phone number is required'),
  
  name: body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  company: body('company')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Company name must be between 1 and 200 characters'),
  
  id: param('id')
    .isUUID()
    .withMessage('Valid UUID is required'),
  
  status: body('status')
    .isIn(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
    .withMessage('Valid status is required'),
  
  score: body('score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Score must be between 0 and 100')
};

// Lead validation rules
export const leadValidationRules = [
  commonValidations.email,
  commonValidations.phone,
  commonValidations.name,
  commonValidations.company,
  body('source')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Source is required'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters')
];

// User validation rules
export const userValidationRules = [
  commonValidations.email,
  commonValidations.name,
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
  body('role')
    .isIn(['admin', 'manager', 'sales', 'marketing', 'readonly', 'guest'])
    .withMessage('Valid role is required')
];

// Task validation rules
export const taskValidationRules = [
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject is required and cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('dueDate')
    .isISO8601()
    .withMessage('Valid due date is required'),
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Valid priority is required')
];

// Search validation rules
export const searchValidationRules = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query cannot exceed 200 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (content: string): string => {
  // Simple HTML sanitization - remove script tags and dangerous attributes
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
};

/**
 * Sanitize input data recursively
 */
export const sanitizeInput = (data: any): any => {
  if (typeof data === 'string') {
    return sanitizeHtml(data.trim());
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Validation result handler middleware
 */
export const handleValidationErrors = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }
  
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  
  next();
};

/**
 * SQL injection prevention for raw queries
 */
export const validateSqlInput = (input: string): boolean => {
  const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(-{2})|(\*\/)|(\*)|(\bOR\b.*=.*)|(\bAND\b.*=.*)/i;
  return !sqlInjectionPattern.test(input);
};

/**
 * File upload validation
 */
export const fileValidationRules = [
  body('filename')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Invalid filename format'),
  body('contentType')
    .isIn(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
    .withMessage('File type not allowed')
];