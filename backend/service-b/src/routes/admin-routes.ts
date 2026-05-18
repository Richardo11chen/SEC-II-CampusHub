import { Router } from 'express';
import { authenticate, validate } from '@campushub/shared';
import { requireAdmin } from '../middleware/admin-middleware.js';
import { adminController } from '../controller/admin-controller.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate, requireAdmin);

// Users
router.get('/users', adminController.getUserList);
router.put('/users/:userId/status', adminController.setUserStatus);

// Demands
router.get('/demands', adminController.getDemandList);
router.delete('/demands/:demandId', adminController.deleteDemand);

// Statistics
router.get('/statistics', adminController.getStatistics);

// Disputes
router.get('/disputes', adminController.getDisputeList);
router.put('/disputes/:disputeId/resolve', adminController.resolveDispute);

// Applications
router.get('/applications', adminController.getApplicationList);
router.put('/applications/:applicationId/review', adminController.reviewApplication);

export default router;
