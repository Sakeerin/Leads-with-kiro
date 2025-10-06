import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import leadRoutes from './leads';
import duplicateRoutes from './duplicates';
import blacklistRoutes from './blacklist';
import dataQualityRoutes from './dataQuality';
import scoringRoutes from './scoring';
import routingRoutes from './routing';

const router = Router();

// API info endpoint
router.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Lead Management System API v1',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/leads', leadRoutes);
router.use('/duplicates', duplicateRoutes);
router.use('/blacklist', blacklistRoutes);
router.use('/data-quality', dataQualityRoutes);
router.use('/scoring', scoringRoutes);
router.use('/routing', routingRoutes);

// Health check for API
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'lead-management-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;