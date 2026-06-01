import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../service/review-service.js';
import { createdResponse, successResponse, BadRequestError } from '@campushub/shared';

export const reviewController = {
  async getMyReview(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.query.orderId);
      if (isNaN(orderId)) throw new BadRequestError('orderId 参数缺失或无效');
      const review = await reviewService.getMyReview(req.user!.userId, orderId);
      successResponse(res, review);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await reviewService.createReview(req.user!.userId, req.body);
      createdResponse(res, review, '评价提交成功');
    } catch (error) {
      next(error);
    }
  },
};
