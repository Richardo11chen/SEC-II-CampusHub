import { Request, Response, NextFunction } from 'express';
import { demandService } from '../service/demand-service.js';
import { createdResponse, successResponse, paginatedResponse } from '@campushub/shared';

export const demandController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const demand = await demandService.createDemand(req.user!.userId, {
        ...data,
        expectedTime: data.expectedTime ? new Date(data.expectedTime) : undefined,
      });
      createdResponse(res, demand, '需求发布成功');
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as any;
      const result = await demandService.getDemandList({
        category: query.category,
        status: query.status,
        keyword: query.keyword,
        sortBy: query.sortBy,
        isUrgent: query.isUrgent === 'true' ? true : query.isUrgent === 'false' ? false : undefined,
        page: query.page ? Number(query.page) : 1,
        pageSize: query.pageSize ? Number(query.pageSize) : 10,
      });
      paginatedResponse(res, result.items, result.total, query.page, query.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const demand = await demandService.getDemandDetail(id, req.user?.userId);
      successResponse(res, demand);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = req.body;
      const { version, images, ...rest } = data;
      const demand = await demandService.updateDemand(id, req.user!.userId, version, {
        ...rest,
        expectedTime: rest.expectedTime ? new Date(rest.expectedTime) : undefined,
        images,
      });
      successResponse(res, demand, '需求更新成功');
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await demandService.deleteDemand(id, req.user!.userId);
      successResponse(res, null, '需求删除成功');
    } catch (error) {
      next(error);
    }
  },
};