import { Router } from 'express';
import { ReportingController } from '../controllers/reportingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/reporting/funnel-metrics:
 *   get:
 *     summary: Get funnel metrics showing conversion rates at each stage
 *     tags: [Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO format)
 *     responses:
 *       200:
 *         description: Funnel metrics retrieved successfully
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
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           stage:
 *                             type: string
 *                           count:
 *                             type: number
 *                           conversionRate:
 *                             type: number
 *                           averageTimeInStage:
 *                             type: number
 *                     dateRange:
 *                       type: object
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 */
router.get('/funnel-metrics', ReportingController.getFunnelMetrics);

/**
 * @swagger
 * /api/reporting/time-to-first-touch:
 *   get:
 *     summary: Get time-to-first-touch report
 *     tags: [Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO format)
 *     responses:
 *       200:
 *         description: Time-to-first-touch report retrieved successfully
 */
router.get('/time-to-first-touch', ReportingController.getTimeToFirstTouchReport);

/**
 * @swagger
 * /api/reporting/sla-compliance:
 *   get:
 *     summary: Get SLA compliance report
 *     tags: [Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO format)
 *       - in: query
 *         name: slaHours
 *         schema:
 *           type: number
 *           default: 24
 *         description: SLA threshold in hours
 *     responses:
 *       200:
 *         description: SLA compliance report retrieved successfully
 */
router.get('/sla-compliance', ReportingController.getSLAComplianceReport);

/**
 * @swagger
 * /api/reporting/source-effectiveness:
 *   get:
 *     summary: Get source effectiveness report with cost-per-lead and conversion rates
 *     tags: [Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO format)
 *     responses:
 *       200:
 *         description: Source effectiveness report retrieved successfully
 */
router.get('/source-effectiveness', ReportingController.getSourceEffectivenessReport);

/**
 * @swagger
 * /api/reporting/sales-performance:
 *   get:
 *     summary: Get sales representative performance dashboards
 *     tags: [Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO format)
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *         description: Filter by specific sales representative ID
 *     responses:
 *       200:
 *         description: Sales performance report retrieved successfully
 */
router.get('/sales-performance', ReportingController.getSalesRepPerformanceReport);

/**
 * @swagger
 * /api/reporting/data-quality:
 *   get:
 *     summary: Get data quality report showing duplicates and missing field statistics
 *     tags: [Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO format)
 *     responses:
 *       200:
 *         description: Data quality report retrieved successfully
 */
router.get('/data-quality', ReportingController.getDataQualityReport);

/**
 * @swagger
 * /api/reporting/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard data with all reports
 *     tags: [Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO format)
 *       - in: query
 *         name: slaHours
 *         schema:
 *           type: number
 *           default: 24
 *         description: SLA threshold in hours
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', ReportingController.getDashboardData);

/**
 * @swagger
 * /api/reporting/export:
 *   get:
 *     summary: Export report data in CSV or JSON format
 *     tags: [Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reportType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [funnel, time-to-first-touch, sla-compliance, source-effectiveness, sales-performance, data-quality]
 *         description: Type of report to export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO format)
 *       - in: query
 *         name: slaHours
 *         schema:
 *           type: number
 *           default: 24
 *         description: SLA threshold in hours (for SLA compliance report)
 *     responses:
 *       200:
 *         description: Report exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export', ReportingController.exportReport);

export default router;