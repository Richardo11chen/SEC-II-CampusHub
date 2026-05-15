import { Request, Response, NextFunction } from 'express';
import { authService } from '../service/auth-service.js';
import { createdResponse, successResponse } from '@campushub/shared';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      createdResponse(res, user, '注册成功');
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, password } = req.body;
      const result = await authService.login(studentId, password);
      successResponse(res, result, '登录成功');
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      successResponse(res, result, 'Token 刷新成功');
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body || {};
      await authService.logout(req.user!.userId, refreshToken);
      successResponse(res, null, '登出成功');
    } catch (error) {
      next(error);
    }
  },
};
