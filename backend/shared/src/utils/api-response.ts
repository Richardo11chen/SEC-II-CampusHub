import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
  timestamp?: string;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(res: Response, data: T, message = '操作成功'): void {
  res.json({ code: 200, message, data } satisfies ApiResponse<T>);
}

export function createdResponse<T>(res: Response, data: T, message = '创建成功'): void {
  res.status(201).json({ code: 201, message, data } satisfies ApiResponse<T>);
}

export function paginatedResponse<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): void {
  res.json({
    code: 200,
    message: '操作成功',
    data: {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  } satisfies ApiResponse<PaginatedData<T>>);
}

export function errorResponse(
  res: Response,
  code: number,
  message: string,
  errors?: { field: string; message: string }[],
): void {
  res.status(code).json({
    code,
    message,
    ...(errors ? { errors } : {}),
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse<never>);
}
