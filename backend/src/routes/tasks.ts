import { Router } from 'express';
import { TaskController } from '../controllers/taskController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Task CRUD operations
router.post('/', TaskController.createTask);
router.get('/my-tasks', TaskController.getMyTasks);
router.get('/overdue', TaskController.getOverdueTasks);
router.get('/upcoming', TaskController.getUpcomingTasks);
router.get('/priority/:priority', TaskController.getTasksByPriority);
router.get('/statistics', TaskController.getTaskStatistics);
router.get('/assignee/:assigneeId', TaskController.getTasksByAssignee);
router.get('/lead/:leadId', TaskController.getTasksByLead);
router.get('/:taskId', TaskController.getTask);
router.put('/:taskId', TaskController.updateTask);
router.post('/:taskId/complete', TaskController.completeTask);
router.post('/:taskId/reassign', TaskController.reassignTask);
router.delete('/:taskId', TaskController.deleteTask);

export default router;