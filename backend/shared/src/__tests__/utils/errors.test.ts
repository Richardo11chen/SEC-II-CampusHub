import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../utils/errors.js';

describe('AppError', () => {
  it('should set statusCode and message', () => {
    const err = new AppError(418, "I'm a teapot");
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("I'm a teapot");
    expect(err.name).toBe('AppError');
  });

  it('should be instance of Error', () => {
    const err = new AppError(500, 'test');
    expect(err).toBeInstanceOf(Error);
  });

  it('should be instance of AppError', () => {
    const err = new AppError(500, 'test');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('BadRequestError', () => {
  it('should have statusCode 400 and default message', () => {
    const err = new BadRequestError();
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('请求参数错误');
  });

  it('should accept custom message', () => {
    const err = new BadRequestError('自定义错误');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('自定义错误');
  });

  it('should be instanceof AppError and Error', () => {
    const err = new BadRequestError();
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('UnauthorizedError', () => {
  it('should have statusCode 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('认证失败');
  });
});

describe('ForbiddenError', () => {
  it('should have statusCode 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('权限不足');
  });
});

describe('NotFoundError', () => {
  it('should have statusCode 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('资源不存在');
  });
});

describe('ConflictError', () => {
  it('should have statusCode 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('资源冲突');
  });
});

describe('ValidationError', () => {
  it('should have statusCode 400 with errors array', () => {
    const errors = [{ field: 'email', message: '邮箱格式不正确' }];
    const err = new ValidationError(errors);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('请求参数错误');
    expect(err.errors).toEqual(errors);
  });

  it('should have errors accessible', () => {
    const errors = [{ field: 'name', message: '必填' }];
    const err = new ValidationError(errors);
    expect(err.errors).toHaveLength(1);
    expect(err.errors![0].field).toBe('name');
  });

  it('should be instanceof AppError', () => {
    const err = new ValidationError([]);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('Error inheritance chain', () => {
  it('BadRequestError -> AppError -> Error', () => {
    const err = new BadRequestError();
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});
