import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

// We need to test the error handler — it uses errorResponse and logger
vi.mock('../../utils/logger.js', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('errorHandler middleware', () => {
  let errorHandler: Function;
  let req: Partial<Request>;
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const mod = await import('../../middleware/error-handler.js');
    errorHandler = mod.errorHandler;
    req = {};
    res = {
      statusCode: 200,
      body: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
    };
    next = vi.fn();
  });

  describe('AppError handling', () => {
    it('should handle BadRequestError (400)', async () => {
      const { BadRequestError } = await import('../../utils/errors.js');
      errorHandler(new BadRequestError('请求参数错误'), req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('请求参数错误');
      expect(res.body.code).toBe(400);
    });

    it('should handle NotFoundError (404)', async () => {
      const { NotFoundError } = await import('../../utils/errors.js');
      errorHandler(new NotFoundError('需求不存在'), req, res, next);
      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe(404);
    });

    it('should handle ForbiddenError (403)', async () => {
      const { ForbiddenError } = await import('../../utils/errors.js');
      errorHandler(new ForbiddenError(), req, res, next);
      expect(res.statusCode).toBe(403);
    });

    it('should handle ValidationError with errors array', async () => {
      const { ValidationError } = await import('../../utils/errors.js');
      const errors = [{ field: 'email', message: '无效' }];
      errorHandler(new ValidationError(errors), req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toEqual(errors);
    });
  });

  describe('Prisma error handling', () => {
    it('should handle P2002 unique constraint violation', () => {
      const err = new Prisma.PrismaClientKnownRequestError('unique constraint', {
        code: 'P2002',
        clientVersion: '6.5.0',
      });
      errorHandler(err, req, res, next);
      expect(res.statusCode).toBe(409);
      expect(res.body.message).toBe('数据已存在');
    });

    it('should handle P2025 record not found', () => {
      const err = new Prisma.PrismaClientKnownRequestError('record not found', {
        code: 'P2025',
        clientVersion: '6.5.0',
      });
      errorHandler(err, req, res, next);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('资源不存在');
    });

    it('should handle unknown Prisma error code as 500', () => {
      const err = new Prisma.PrismaClientKnownRequestError('unknown', {
        code: 'P9999',
        clientVersion: '6.5.0',
      });
      errorHandler(err, req, res, next);
      expect(res.statusCode).toBe(500);
    });

    it('should handle Prisma validation error as 400', () => {
      const err = new Prisma.PrismaClientValidationError('validation error', {
        clientVersion: '6.5.0',
      });
      errorHandler(err, req, res, next);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Unknown error handling', () => {
    it('should handle generic Error as 500', () => {
      errorHandler(new Error('unexpected error'), req, res, next);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('服务器内部错误');
    });
  });
});
