import { Router } from 'express';
import { authenticate, validate } from '@campushub/shared';
import { createReviewSchema } from '../validators/review-validators.js';
import { reviewController } from '../controller/review-controller.js';

const router = Router();

router.get('/my', authenticate, reviewController.getMyReview);
router.post('/', authenticate, validate(createReviewSchema), reviewController.create);

export default router;
