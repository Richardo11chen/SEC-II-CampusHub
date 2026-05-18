import { Router } from 'express';
import { userController } from '../controller/user-controller.js';
import { validate, authenticate } from '@campushub/shared';
import { updateUserSchema } from '../validators/user-validators.js';

const router = Router();

router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, validate(updateUserSchema), userController.updateProfile);
router.get('/:userId/profile', authenticate, userController.getPublicProfile);
router.get('/:userId/reviews', authenticate, userController.getUserReviews);

export default router;
