import { Router } from 'express';
import { ActivityController } from '../controllers/activityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Activity operations
router.post('/', ActivityController.createActivity);
router.get('/recent', ActivityController.getRecentActivities);
router.get('/search', ActivityController.searchActivities);
router.get('/date-range', ActivityController.getActivitiesByDateRange);
router.get('/statistics', ActivityController.getActivityStatistics);
router.get('/lead/:leadId/timeline', ActivityController.getLeadTimeline);
router.get('/', ActivityController.getActivities);
router.get('/:activityId', ActivityController.getActivity);

// Specific activity logging endpoints
router.post('/lead/:leadId/note', ActivityController.addNote);
router.post('/lead/:leadId/email', ActivityController.logEmail);
router.post('/lead/:leadId/call', ActivityController.logCall);
router.post('/lead/:leadId/meeting', ActivityController.logMeeting);

export default router;