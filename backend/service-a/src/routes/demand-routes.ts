import { Router } from 'express';
import { demandController } from '../controller/demand-controller.js';
import { authenticate, orderLimiter, checkMinCredit } from '@campushub/shared';

const router = Router();

router.post('/', authenticate, checkMinCredit(40), orderLimiter, demandController.create);
router.get('/', demandController.list);
router.get('/:id', demandController.getById);
router.put('/:id', authenticate, demandController.update);
router.delete('/:id', authenticate, demandController.remove);

export default router;
