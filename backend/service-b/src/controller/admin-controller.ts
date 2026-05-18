import { Request, Response, NextFunction } from 'express';
import { adminService } from '../service/admin-service.js';
import { successResponse, paginatedResponse } from '@campushub/shared';

export const adminController = {
  // ── 用户管理 ──
  async getUserList(req: Request, res: Response, next: NextFunction) {
    try {
      const { keyword, status, page = '1', pageSize = '20' } = req.query;
      const result = await adminService.getUserList({
        keyword: keyword as string,
        status: status as string,
        page: Number(page),
        pageSize: Number(pageSize),
      });
      paginatedResponse(res, result.items, result.total, Number(page), Number(pageSize));
    } catch (e) { next(e); }
  },

  async setUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);
      const { action } = req.body;
      const result = await adminService.setUserStatus(userId, action);
      successResponse(res, null, result.message);
    } catch (e) { next(e); }
  },

  // ── 需求管理 ──
  async getDemandList(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page = '1', pageSize = '20' } = req.query;
      const result = await adminService.getDemandList({
        status: status as string,
        page: Number(page),
        pageSize: Number(pageSize),
      });
      paginatedResponse(res, result.items, result.total, Number(page), Number(pageSize));
    } catch (e) { next(e); }
  },

  async deleteDemand(req: Request, res: Response, next: NextFunction) {
    try {
      const demandId = Number(req.params.demandId);
      const { reason } = req.body || {};
      const result = await adminService.deleteDemand(demandId, reason);
      successResponse(res, null, result.message);
    } catch (e) { next(e); }
  },

  // ── 统计看板 ──
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getStatistics();
      successResponse(res, stats);
    } catch (e) { next(e); }
  },

  // ── 纠纷处理 ──
  async getDisputeList(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page = '1', pageSize = '20' } = req.query;
      const result = await adminService.getDisputeList({
        status: status as string,
        page: Number(page),
        pageSize: Number(pageSize),
      });
      paginatedResponse(res, result.items, result.total, Number(page), Number(pageSize));
    } catch (e) { next(e); }
  },

  async resolveDispute(req: Request, res: Response, next: NextFunction) {
    try {
      const disputeId = Number(req.params.disputeId);
      const { resolution, action } = req.body;
      const result = await adminService.resolveDispute(disputeId, { resolution, action });
      successResponse(res, null, result.message);
    } catch (e) { next(e); }
  },

  // ── 管理员申请 ──
  async getApplicationList(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page = '1', pageSize = '20' } = req.query;
      const result = await adminService.getApplicationList({
        status: status as string,
        page: Number(page),
        pageSize: Number(pageSize),
      });
      paginatedResponse(res, result.items, result.total, Number(page), Number(pageSize));
    } catch (e) { next(e); }
  },

  async reviewApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const applicationId = Number(req.params.applicationId);
      const { action, reason } = req.body;
      const result = await adminService.reviewApplication(applicationId, req.user!.userId, { action, reason });
      successResponse(res, null, result.message);
    } catch (e) { next(e); }
  },
};
