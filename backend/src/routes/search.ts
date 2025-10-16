import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Search routes
router.get('/search', authenticateToken, SearchController.search);
router.get('/suggestions', authenticateToken, SearchController.getSuggestions);
router.post('/reindex', authenticateToken, SearchController.reindex);
router.get('/health', authenticateToken, SearchController.health);

// Saved search routes
router.post('/saved-searches', authenticateToken, SearchController.createSavedSearch);
router.get('/saved-searches', authenticateToken, SearchController.getSavedSearches);
router.get('/saved-searches/public', SearchController.getPublicSavedSearches);
router.get('/saved-searches/:id', authenticateToken, SearchController.getSavedSearch);
router.put('/saved-searches/:id', authenticateToken, SearchController.updateSavedSearch);
router.delete('/saved-searches/:id', authenticateToken, SearchController.deleteSavedSearch);
router.get('/saved-searches/:id/share', authenticateToken, SearchController.generateShareableUrl);

export default router;