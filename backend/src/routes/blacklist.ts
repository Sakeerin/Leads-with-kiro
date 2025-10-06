import { Router } from 'express';
import { BlacklistController } from '../controllers/blacklistController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/blacklist:
 *   post:
 *     summary: Add item to blacklist
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, phone, domain, company]
 *               value:
 *                 type: string
 *               reason:
 *                 type: string
 *                 enum: [spam, unsubscribed, bounced, complained, invalid, competitor, do_not_contact, gdpr_request, manual]
 *               notes:
 *                 type: string
 *             required:
 *               - type
 *               - value
 *               - reason
 *             example:
 *               type: "email"
 *               value: "spam@example.com"
 *               reason: "spam"
 *               notes: "Reported as spam by multiple users"
 *     responses:
 *       201:
 *         description: Item added to blacklist successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', BlacklistController.addToBlacklist);

/**
 * @swagger
 * /api/blacklist/{id}:
 *   delete:
 *     summary: Remove item from blacklist
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blacklist item ID
 *     responses:
 *       200:
 *         description: Item removed from blacklist successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', BlacklistController.removeFromBlacklist);

/**
 * @swagger
 * /api/blacklist/search:
 *   get:
 *     summary: Search blacklist items
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [email, phone, domain, company]
 *         description: Filter by blacklist type
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [spam, unsubscribed, bounced, complained, invalid, competitor, do_not_contact, gdpr_request, manual]
 *         description: Filter by reason
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search in value and notes
 *       - in: query
 *         name: addedBy
 *         schema:
 *           type: string
 *         description: Filter by user who added the item
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Blacklist search results
 *       500:
 *         description: Internal server error
 */
router.get('/search', BlacklistController.searchBlacklist);

/**
 * @swagger
 * /api/blacklist/check:
 *   get:
 *     summary: Check if value is blacklisted
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [email, phone, domain, company]
 *         description: Type of value to check
 *       - in: query
 *         name: value
 *         required: true
 *         schema:
 *           type: string
 *         description: Value to check
 *     responses:
 *       200:
 *         description: Blacklist check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isBlacklisted:
 *                   type: boolean
 *                 match:
 *                   type: object
 *                   nullable: true
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.get('/check', BlacklistController.checkBlacklist);

/**
 * @swagger
 * /api/blacklist/bulk-check:
 *   post:
 *     summary: Bulk check multiple values against blacklist
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [email, phone, domain, company]
 *                     value:
 *                       type: string
 *                   required:
 *                     - type
 *                     - value
 *             required:
 *               - items
 *     responses:
 *       200:
 *         description: Bulk check results
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/bulk-check', BlacklistController.bulkCheck);

/**
 * @swagger
 * /api/blacklist/statistics:
 *   get:
 *     summary: Get blacklist statistics
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blacklist statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 byType:
 *                   type: object
 *                 byReason:
 *                   type: object
 *                 recentCount:
 *                   type: integer
 *                 topDomains:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       domain:
 *                         type: string
 *                       count:
 *                         type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/statistics', BlacklistController.getStatistics);

/**
 * @swagger
 * /api/blacklist/export:
 *   get:
 *     summary: Export blacklist items
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [email, phone, domain, company]
 *         description: Filter by type for export
 *     responses:
 *       200:
 *         description: Blacklist export file
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BlacklistItem'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.get('/export', BlacklistController.exportBlacklist);

/**
 * @swagger
 * /api/blacklist/import:
 *   post:
 *     summary: Import blacklist items
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 maxItems: 1000
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [email, phone, domain, company]
 *                     value:
 *                       type: string
 *                     reason:
 *                       type: string
 *                       enum: [spam, unsubscribed, bounced, complained, invalid, competitor, do_not_contact, gdpr_request, manual]
 *                     notes:
 *                       type: string
 *                   required:
 *                     - type
 *                     - value
 *                     - reason
 *             required:
 *               - items
 *     responses:
 *       200:
 *         description: Import results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imported:
 *                   type: integer
 *                 skipped:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/import', BlacklistController.importBlacklist);

/**
 * @swagger
 * /api/blacklist/suggestions:
 *   get:
 *     summary: Get blacklist suggestions
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [email, phone, domain, company]
 *         description: Type of suggestions
 *       - in: query
 *         name: partialValue
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial value to get suggestions for
 *     responses:
 *       200:
 *         description: Suggestions list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.get('/suggestions', BlacklistController.getSuggestions);

/**
 * @swagger
 * /api/blacklist/cleanup:
 *   post:
 *     summary: Clean up invalid blacklist entries
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 removed:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/cleanup', BlacklistController.cleanupBlacklist);

export default router;