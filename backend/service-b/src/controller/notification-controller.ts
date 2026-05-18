import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../service/notification-service.js';
import { successResponse, paginatedResponse } from '@campushub/shared';

export const notificationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const result = await notificationService.getNotifications(req.user!.userId, page, pageSize);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await notificationService.markAsRead(id, req.user!.userId);
      successResponse(res, null, '已标记为已读');
    } catch (error) {
      next(error);
    }
  },
};
