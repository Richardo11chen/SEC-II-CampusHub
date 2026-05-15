import { Router } from 'express';
import { authenticate } from '@campushub/shared';
import { uploadMiddleware } from '../middleware/upload-middleware.js';
import { uploadController } from '../controller/upload-controller.js';

const router = Router();

router.post('/', authenticate, uploadMiddleware, uploadController.upload);

export default router;
