import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { errorResponse } from '../utils/api-response.js';
import logger from '../utils/logger.js';
import { Prisma } from '@prisma/client';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    errorResponse(res, err.statusCode, err.message, err.errors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        errorResponse(res, 409, '数据已存在');
        return;
      case 'P2025':
        errorResponse(res, 404, '资源不存在');
        return;
      default:
        logger.error('Prisma error', { code: err.code, meta: err.meta });
        errorResponse(res, 500, '服务器内部错误');
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error', { message: err.message });
    errorResponse(res, 400, '请求参数错误');
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  errorResponse(res, 500, '服务器内部错误');
}
