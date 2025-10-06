import { Router } from 'express';
import { DuplicateController } from '../controllers/duplicateController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/duplicates/detect:
 *   post:
 *     summary: Detect duplicate leads
 *     tags: [Duplicates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               mobile:
 *                 type: string
 *               companyName:
 *                 type: string
 *               contactName:
 *                 type: string
 *             example:
 *               email: "john.doe@example.com"
 *               phone: "+66812345678"
 *               companyName: "Example Corp"
 *               contactName: "John Doe"
 *     responses:
 *       200:
 *         description: Duplicate detection results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 duplicates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DuplicateMatch'
 *                 count:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/detect', DuplicateController.detectDuplicates);

/**
 * @swagger
 * /api/duplicates/bulk-detect:
 *   post:
 *     summary: Bulk duplicate detection for multiple leads
 *     tags: [Duplicates]
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
 *                     email:
 *                       type: string
 *                       format: email
 *                     phone:
 *                       type: string
 *                     mobile:
 *                       type: string
 *                     companyName:
 *                       type: string
 *                     contactName:
 *                       type: string
 *     responses:
 *       200:
 *         description: Bulk duplicate detection results
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/bulk-detect', DuplicateController.bulkDuplicateDetection);

/**
 * @swagger
 * /api/duplicates/merge/preview/{sourceId}/{targetId}:
 *   get:
 *     summary: Generate merge preview for two leads
 *     tags: [Duplicates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Source lead ID
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Target lead ID
 *     responses:
 *       200:
 *         description: Merge preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MergePreview'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
router.get('/merge/preview/:sourceId/:targetId', DuplicateController.generateMergePreview);

/**
 * @swagger
 * /api/duplicates/merge/{sourceId}/{targetId}:
 *   post:
 *     summary: Merge two leads
 *     tags: [Duplicates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Source lead ID
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Target lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fieldDecisions:
 *                 type: object
 *                 description: Field-level merge decisions
 *               preserveSourceData:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to preserve source data for rollback
 *             required:
 *               - fieldDecisions
 *     responses:
 *       200:
 *         description: Leads merged successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MergeResult'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
router.post('/merge/:sourceId/:targetId', DuplicateController.mergeLeads);

/**
 * @swagger
 * /api/duplicates/merge/undo/{mergedLeadId}:
 *   post:
 *     summary: Undo a lead merge
 *     tags: [Duplicates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mergedLeadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merged lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               originalSourceData:
 *                 type: object
 *                 description: Original source lead data for restoration
 *             required:
 *               - originalSourceData
 *     responses:
 *       200:
 *         description: Merge undone successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
router.post('/merge/undo/:mergedLeadId', DuplicateController.undoMerge);

export default router;