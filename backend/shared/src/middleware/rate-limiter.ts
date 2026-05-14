import rateLimit from 'express-rate-limit';

export function createRateLimiter(windowMs: number, max: number, message?: string) {
  return rateLimit({
    windowMs,
    max,
    message: {
      code: 429,
      message: message || '请求过于频繁，请稍后再试',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export const loginLimiter = createRateLimiter(60 * 1000, 20, '登录请求过于频繁，请稍后再试');

export const registerLimiter = createRateLimiter(60 * 1000, 10, '注册请求过于频繁，请稍后再试');

export const refreshLimiter = createRateLimiter(60 * 1000, 30, 'Token 刷新过于频繁，请稍后再试');

export const orderLimiter = createRateLimiter(60 * 1000, 60, '接单请求过于频繁，请稍后再试');

export const generalLimiter = createRateLimiter(60 * 1000, 100);
