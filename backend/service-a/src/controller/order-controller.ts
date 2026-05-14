import { Request, Response, NextFunction } from 'express';
import { orderService } from '../service/order-service.js';
import { createdResponse, successResponse, paginatedResponse } from '@campushub/shared';
import { z } from 'zod';

const takeOrderSchema = z.object({
  demandId: z.number().int('需求ID格式不正确'),
});

const listOrderSchema = z.object({
  role: z.enum(['publisher', 'provider']).optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
});

export const orderController = {
  async takeOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { demandId } = takeOrderSchema.parse(req.body);
      const order = await orderService.takeOrder(demandId, req.user!.userId);
      createdResponse(res, order, '接单成功');
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listOrderSchema.parse(req.query);
      const result = await orderService.getOrderList({
        role: query.role,
        status: query.status as any,
        userId: req.user!.userId,
        page: query.page,
        pageSize: query.pageSize,
      });
      paginatedResponse(res, result.items, result.total, query.page, query.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const order = await orderService.getOrderDetail(id, req.user!.userId);
      successResponse(res, order);
    } catch (error) {
      next(error);
    }
  },

  async submitComplete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const order = await orderService.submitComplete(id, req.user!.userId);
      successResponse(res, order, '已提交完成');
    } catch (error) {
      next(error);
    }
  },

  async confirmComplete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const order = await orderService.confirmComplete(id, req.user!.userId);
      successResponse(res, order, '已确认完成');
    } catch (error) {
      next(error);
    }
  },
};
