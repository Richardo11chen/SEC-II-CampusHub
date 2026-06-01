import { Request, Response, NextFunction } from 'express';
import { messageService } from '../service/message-service.js';
import { paginatedResponse, createdResponse, BadRequestError } from '@campushub/shared';

export const messageController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.query.orderId);
      if (isNaN(orderId)) {
        throw new BadRequestError('orderId 参数缺失或无效');
      }
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 50;
      const { items, total } = await messageService.getMessages(req.user!.userId, orderId, page, pageSize);
      paginatedResponse(res, items, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  },

  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await messageService.sendMessage(req.user!.userId, req.body);
      createdResponse(res, message, '消息发送成功');
    } catch (error) {
      next(error);
    }
  },
};
