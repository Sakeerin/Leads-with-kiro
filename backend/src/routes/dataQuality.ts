import { Router } from 'express';
import { DataQualityController } from '../controllers/dataQualityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/data-quality/check-lead:
 *   post:
 *     summary: Perform data quality check on lead data
 *     tags: [Data Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   industry:
 *                     type: string
 *                   size:
 *                     type: string
 *               contact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   phone:
 *                     type: string
 *                   mobile:
 *                     type: string
 *               source:
 *                 type: object
 *                 properties:
 *                   channel:
 *                     type: string
 *                   campaign:
 *                     type: string
 *             example:
 *               company:
 *                 name: "Example Corp"
 *                 industry: "Technology"
 *               contact:
 *                 name: "John Doe"
 *                 email: "john.doe@example.com"
 *                 phone: "+66812345678"
 *               source:
 *                 channel: "web_form"
 *     responses:
 *       200:
 *         description: Data quality check results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 originalData:
 *                   type: object
 *                 sanitizedData:
 *                   type: object
 *                 qualityCheck:
 *                   $ref: '#/components/schemas/DataQualityCheck'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/check-lead', DataQualityController.checkLeadQuality);

/**
 * @swagger
 * /api/data-quality/bulk-check:
 *   post:
 *     summary: Bulk data quality check for multiple leads
 *     tags: [Data Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leads:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   properties:
 *                     company:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                     contact:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                           format: email
 *                     source:
 *                       type: object
 *                       properties:
 *                         channel:
 *                           type: string
 *             required:
 *               - leads
 *     responses:
 *       200:
 *         description: Bulk quality check results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: integer
 *                       result:
 *                         $ref: '#/components/schemas/DataQualityCheck'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     valid:
 *                       type: integer
 *                     invalid:
 *                       type: integer
 *                     blacklisted:
 *                       type: integer
 *                     duplicates:
 *                       type: integer
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/bulk-check', DataQualityController.bulkQualityCheck);

/**
 * @swagger
 * /api/data-quality/validate-field:
 *   post:
 *     summary: Validate specific field
 *     tags: [Data Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fieldType:
 *                 type: string
 *                 enum: [email, phone, url, date, string]
 *               value:
 *                 type: string
 *               minLength:
 *                 type: integer
 *                 description: For string type validation
 *               maxLength:
 *                 type: integer
 *                 description: For string type validation
 *               fieldName:
 *                 type: string
 *                 description: For string type validation
 *             required:
 *               - fieldType
 *               - value
 *             example:
 *               fieldType: "email"
 *               value: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Field validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fieldType:
 *                   type: string
 *                 value:
 *                   type: string
 *                 validation:
 *                   $ref: '#/components/schemas/ValidationResult'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/validate-field', DataQualityController.validateField);

/**
 * @swagger
 * /api/data-quality/sanitize:
 *   post:
 *     summary: Sanitize data
 *     tags: [Data Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 oneOf:
 *                   - type: string
 *                   - type: object
 *               type:
 *                 type: string
 *                 enum: [string, email, phone, lead]
 *             required:
 *               - data
 *               - type
 *             example:
 *               data: "  John Doe  <script>alert('xss')</script>  "
 *               type: "string"
 *     responses:
 *       200:
 *         description: Sanitized data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 originalData:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                 sanitizedData:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                 type:
 *                   type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/sanitize', DataQualityController.sanitizeData);

/**
 * @swagger
 * /api/data-quality/suggestions:
 *   post:
 *     summary: Get data quality suggestions for lead data
 *     tags: [Data Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   industry:
 *                     type: string
 *                   size:
 *                     type: string
 *               contact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   mobile:
 *                     type: string
 *               source:
 *                 type: object
 *                 properties:
 *                   channel:
 *                     type: string
 *                   campaign:
 *                     type: string
 *     responses:
 *       200:
 *         description: Quality suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 count:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/suggestions', DataQualityController.getQualitySuggestions);

/**
 * @swagger
 * /api/data-quality/validate-custom:
 *   post:
 *     summary: Validate lead data against custom rules
 *     tags: [Data Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadData:
 *                 type: object
 *                 description: Lead data to validate
 *               rules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                     required:
 *                       type: boolean
 *                     type:
 *                       type: string
 *                       enum: [string, email, phone, url, date, number]
 *                     minLength:
 *                       type: integer
 *                     maxLength:
 *                       type: integer
 *                     pattern:
 *                       type: string
 *                       description: Regular expression pattern
 *             required:
 *               - leadData
 *               - rules
 *     responses:
 *       200:
 *         description: Custom validation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leadData:
 *                   type: object
 *                 rules:
 *                   type: array
 *                 validation:
 *                   $ref: '#/components/schemas/ValidationResult'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/validate-custom', DataQualityController.validateWithCustomRules);

export default router;