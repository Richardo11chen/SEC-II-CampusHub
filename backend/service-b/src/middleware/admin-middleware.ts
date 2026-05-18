import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '@campushub/shared';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('需要管理员权限');
  }
  next();
}
