export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: { field: string; message: string }[];

  constructor(statusCode: number, message: string, errors?: { field: string; message: string }[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = '请求参数错误', errors?: { field: string; message: string }[]) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '认证失败') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '权限不足') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(409, message);
  }
}

export class ValidationError extends AppError {
  constructor(errors: { field: string; message: string }[]) {
    super(400, '请求参数错误', errors);
  }
}
