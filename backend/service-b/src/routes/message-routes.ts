import { Router } from 'express';
import { authenticate, validate } from '@campushub/shared';
import { sendMessageSchema } from '../validators/message-validators.js';
import { messageController } from '../controller/message-controller.js';

const router = Router();

router.get('/', authenticate, messageController.list);
router.post('/', authenticate, validate(sendMessageSchema), messageController.send);

export default router;
