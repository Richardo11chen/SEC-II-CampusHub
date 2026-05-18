import { Router } from 'express';
import { authenticate } from '@campushub/shared';
import { notificationController } from '../controller/notification-controller.js';

const router = Router();

router.get('/', authenticate, notificationController.list);
router.patch('/:id', authenticate, notificationController.markRead);

export default router;
