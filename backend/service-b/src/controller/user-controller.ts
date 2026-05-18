import { Request, Response, NextFunction } from 'express';
import { userService } from '../service/user-service.js';
import { successResponse, paginatedResponse, NotFoundError } from '@campushub/shared';

export const userController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await userService.getProfile(req.user!.userId);
      if (!profile) {
        throw new NotFoundError('用户不存在');
      }
      successResponse(res, profile);
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await userService.updateProfile(req.user!.userId, req.body);
      if (!profile) {
        throw new NotFoundError('用户不存在');
      }
      successResponse(res, profile, '个人信息更新成功');
    } catch (error) {
      next(error);
    }
  },

  async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);
      const profile = await userService.getPublicProfile(userId);
      if (!profile) {
        throw new NotFoundError('用户不存在');
      }
      successResponse(res, profile);
    } catch (error) {
      next(error);
    }
  },

  async getUserReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const result = await userService.getUserReviews(userId, page, pageSize);
      paginatedResponse(res, result.items, result.total, page, pageSize);
    } catch (error) {
      next(error);
    }
  },
};
