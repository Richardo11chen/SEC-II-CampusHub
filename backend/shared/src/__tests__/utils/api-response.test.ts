import { describe, it, expect, vi } from 'vitest';
import { successResponse, createdResponse, paginatedResponse, errorResponse } from '../../utils/api-response.js';
import type { Response } from 'express';

function mockRes(): Response & { body: any; statusCode: number } {
  const res = {
    statusCode: 200,
    body: null as any,
    json(data: any) {
      this.body = data;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
  };
  return res as any;
}

describe('successResponse', () => {
  it('should return { code: 200, message, data }', () => {
    const res = mockRes();
    successResponse(res, { id: 1 }, '操作成功');
    expect(res.body).toEqual({ code: 200, message: '操作成功', data: { id: 1 } });
  });

  it('should use default message when not provided', () => {
    const res = mockRes();
    successResponse(res, { id: 1 });
    expect(res.body.message).toBe('操作成功');
  });

  it('should handle data=null', () => {
    const res = mockRes();
    successResponse(res, null);
    expect(res.body.data).toBeNull();
  });

  it('should handle data=undefined', () => {
    const res = mockRes();
    successResponse(res, undefined);
    expect(res.body.data).toBeUndefined();
  });
});

describe('createdResponse', () => {
  it('should return { code: 201, message, data } with status 201', () => {
    const res = mockRes();
    createdResponse(res, { id: 2 }, '创建成功');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ code: 201, message: '创建成功', data: { id: 2 } });
  });

  it('should use default message', () => {
    const res = mockRes();
    createdResponse(res, { id: 3 });
    expect(res.body.message).toBe('创建成功');
  });
});

describe('paginatedResponse', () => {
  it('should return paginated structure', () => {
    const res = mockRes();
    const items = [{ id: 1 }, { id: 2 }];
    paginatedResponse(res, items, 10, 1, 2);
    expect(res.body.code).toBe(200);
    expect(res.body.data.items).toEqual(items);
    expect(res.body.data.pagination).toEqual({
      page: 1,
      pageSize: 2,
      total: 10,
      totalPages: 5,
    });
  });

  it('should handle empty list', () => {
    const res = mockRes();
    paginatedResponse(res, [], 0, 1, 10);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.pagination.total).toBe(0);
    expect(res.body.data.pagination.totalPages).toBe(0);
  });

  it('should calculate totalPages correctly', () => {
    const res = mockRes();
    paginatedResponse(res, [], 7, 1, 3);
    expect(res.body.data.pagination.totalPages).toBe(3);
  });
});

describe('errorResponse', () => {
  it('should set status code and return error body', () => {
    const res = mockRes();
    errorResponse(res, 500, '服务器内部错误');
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
    expect(res.body.timestamp).toBeDefined();
  });

  it('should handle 400 error', () => {
    const res = mockRes();
    errorResponse(res, 400, '请求参数错误');
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('should include errors array for ValidationError', () => {
    const res = mockRes();
    const errors = [{ field: 'email', message: '无效' }];
    errorResponse(res, 400, '请求参数错误', errors);
    expect(res.body.errors).toEqual(errors);
  });

  it('should not include errors when not provided', () => {
    const res = mockRes();
    errorResponse(res, 500, '错误');
    expect(res.body.errors).toBeUndefined();
  });
});
