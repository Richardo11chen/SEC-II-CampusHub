import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../service/review-service.js';
import { createdResponse } from '@campushub/shared';

export const reviewController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await reviewService.createReview(req.user!.userId, req.body);
      createdResponse(res, review, '评价提交成功');
    } catch (error) {
      next(error);
    }
  },
};
