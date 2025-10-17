import { Router } from 'express';
import multer from 'multer';
import { ImportExportController } from '../controllers/importExportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV and XLSX files
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and XLSX files are allowed'));
    }
  }
});

// Import routes
router.post('/import/validate', 
  authenticateToken, 
  upload.single('file'), 
  ImportExportController.validateImportFile
);

router.post('/import/leads', 
  authenticateToken, 
  upload.single('file'), 
  ImportExportController.importLeads
);

router.get('/import/:importId/progress', 
  authenticateToken, 
  ImportExportController.getImportProgress
);

router.get('/import/history', 
  authenticateToken, 
  ImportExportController.getImportHistory
);

router.get('/import/:importId/details', 
  authenticateToken, 
  ImportExportController.getImportDetails
);

router.post('/import/:importId/rollback', 
  authenticateToken, 
  ImportExportController.rollbackImport
);

// Export routes
router.post('/export/leads', 
  authenticateToken, 
  ImportExportController.exportLeads
);

router.post('/export/reports', 
  authenticateToken, 
  ImportExportController.exportReports
);

router.post('/export/analytics', 
  authenticateToken, 
  ImportExportController.exportAnalytics
);

router.get('/export/:exportId/download', 
  authenticateToken, 
  ImportExportController.downloadExport
);

router.get('/export/history', 
  authenticateToken, 
  ImportExportController.getExportHistory
);

// Scheduled reports routes
router.post('/scheduled-reports', 
  authenticateToken, 
  ImportExportController.createScheduledReport
);

router.get('/scheduled-reports', 
  authenticateToken, 
  ImportExportController.getScheduledReports
);

router.get('/scheduled-reports/:reportId', 
  authenticateToken, 
  ImportExportController.getScheduledReport
);

router.put('/scheduled-reports/:reportId', 
  authenticateToken, 
  ImportExportController.updateScheduledReport
);

router.delete('/scheduled-reports/:reportId', 
  authenticateToken, 
  ImportExportController.deleteScheduledReport
);

router.post('/scheduled-reports/:reportId/execute', 
  authenticateToken, 
  ImportExportController.executeScheduledReport
);

export default router;