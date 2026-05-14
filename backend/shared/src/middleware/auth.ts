import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import logger from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('缺少认证令牌');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    logger.warn('Token verification failed', { error });
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('令牌已过期');
    }
    throw new UnauthorizedError('无效的认证令牌');
  }
}
