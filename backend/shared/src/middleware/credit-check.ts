import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';

export function checkMinCredit(minScore: number = 40) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditScore: true },
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    if (user.creditScore < minScore) {
      throw new ForbiddenError('信用分不足，无法发布需求');
    }

    next();
  };
}
