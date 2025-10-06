import { Router } from 'express';
import { ScoringController } from '../controllers/scoringController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/scoring/leads/{leadId}/calculate:
 *   post:
 *     summary: Calculate score for a specific lead
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *       - in: query
 *         name: modelId
 *         schema:
 *           type: string
 *         description: Scoring model ID (optional, defaults to default model)
 *     responses:
 *       200:
 *         description: Lead score calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LeadScore'
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
router.post('/leads/:leadId/calculate', ScoringController.calculateLeadScore);

/**
 * @swagger
 * /api/scoring/recalculate/all:
 *   post:
 *     summary: Recalculate scores for all active leads
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: modelId
 *         schema:
 *           type: string
 *         description: Scoring model ID (optional, defaults to default model)
 *     responses:
 *       200:
 *         description: Batch recalculation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BatchResult'
 *       500:
 *         description: Internal server error
 */
router.post('/recalculate/all', ScoringController.recalculateAllScores);

/**
 * @swagger
 * /api/scoring/recalculate/leads:
 *   post:
 *     summary: Recalculate scores for specific leads
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: modelId
 *         schema:
 *           type: string
 *         description: Scoring model ID (optional, defaults to default model)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of lead IDs to recalculate
 *             required:
 *               - leadIds
 *     responses:
 *       200:
 *         description: Batch recalculation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BatchResult'
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/recalculate/leads', ScoringController.recalculateLeadScores);

/**
 * @swagger
 * /api/scoring/bands:
 *   get:
 *     summary: Get score bands configuration
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Score bands retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScoreBandConfig'
 *       500:
 *         description: Internal server error
 */
router.get('/bands', ScoringController.getScoreBands);

/**
 * @swagger
 * /api/scoring/bands:
 *   put:
 *     summary: Update score bands configuration
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scoreBands:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ScoreBandConfig'
 *             required:
 *               - scoreBands
 *     responses:
 *       200:
 *         description: Score bands updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScoreBandConfig'
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.put('/bands', ScoringController.updateScoreBands);

/**
 * @swagger
 * /api/scoring/models/{modelId}:
 *   get:
 *     summary: Get scoring model
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Scoring model ID
 *     responses:
 *       200:
 *         description: Scoring model retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ScoringModel'
 *       404:
 *         description: Scoring model not found
 *       500:
 *         description: Internal server error
 */
router.get('/models/:modelId', ScoringController.getScoringModel);

/**
 * @swagger
 * /api/scoring/models:
 *   post:
 *     summary: Create new scoring model
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Model name
 *               description:
 *                 type: string
 *                 description: Model description
 *               criteria:
 *                 $ref: '#/components/schemas/ScoringCriteria'
 *               scoreBands:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ScoreBandConfig'
 *               isActive:
 *                 type: boolean
 *                 description: Whether the model is active
 *               isDefault:
 *                 type: boolean
 *                 description: Whether this is the default model
 *             required:
 *               - name
 *               - criteria
 *               - scoreBands
 *     responses:
 *       201:
 *         description: Scoring model created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ScoringModel'
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/models', ScoringController.createScoringModel);

/**
 * @swagger
 * /api/scoring/models/{modelId}:
 *   put:
 *     summary: Update scoring model
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Scoring model ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               criteria:
 *                 $ref: '#/components/schemas/ScoringCriteria'
 *               scoreBands:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ScoreBandConfig'
 *               isActive:
 *                 type: boolean
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Scoring model updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ScoringModel'
 *       404:
 *         description: Scoring model not found
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.put('/models/:modelId', ScoringController.updateScoringModel);

/**
 * @swagger
 * /api/scoring/scores:
 *   get:
 *     summary: Get lead scores with filtering and pagination
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: scoreBand
 *         schema:
 *           type: string
 *           enum: [hot, warm, cold]
 *         description: Filter by score band
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *         description: Minimum score filter
 *       - in: query
 *         name: maxScore
 *         schema:
 *           type: number
 *         description: Maximum score filter
 *       - in: query
 *         name: calculatedAfter
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter scores calculated after this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *           maximum: 100
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Lead scores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     scores:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LeadScore'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Internal server error
 */
router.get('/scores', ScoringController.getLeadScores);

/**
 * @swagger
 * /api/scoring/statistics:
 *   get:
 *     summary: Get scoring statistics
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scoring statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalScored:
 *                       type: number
 *                     scoreBandDistribution:
 *                       type: object
 *                       properties:
 *                         hot:
 *                           type: number
 *                         warm:
 *                           type: number
 *                         cold:
 *                           type: number
 *                     averageScore:
 *                       type: number
 *                     scoreRanges:
 *                       type: object
 *                       properties:
 *                         '0-25':
 *                           type: number
 *                         '26-50':
 *                           type: number
 *                         '51-75':
 *                           type: number
 *                         '76-100':
 *                           type: number
 *       500:
 *         description: Internal server error
 */
router.get('/statistics', ScoringController.getScoringStatistics);

export default router;