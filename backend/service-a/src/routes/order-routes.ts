import { Router } from 'express';
import { orderController } from '../controller/order-controller.js';
import { authenticate, orderLimiter } from '@campushub/shared';

const router = Router();

router.post('/', authenticate, orderLimiter, orderController.takeOrder);
router.get('/', authenticate, orderController.list);
router.get('/:id', authenticate, orderController.getById);
router.put('/:id/complete', authenticate, orderController.submitComplete);
router.post('/:id/dispute', authenticate, orderController.dispute);
router.put('/:id/cancel', authenticate, orderController.cancel);
router.put('/:id/confirm', authenticate, orderController.confirmComplete);

export default router;
