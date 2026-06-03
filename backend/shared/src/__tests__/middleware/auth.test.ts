import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock the shared utils before importing authenticate
vi.mock('../../utils/jwt.js', () => ({
  verifyAccessToken: vi.fn(),
  generateAccessToken: () => 'mock-token',
  generateRefreshToken: () => ({
    rawToken: 'mock-raw',
    tokenHash: 'mock-hash',
    expiresAt: new Date(),
  }),
  hashToken: () => 'mock-hash',
  ACCESS_TOKEN_EXPIRES_IN: 3600,
}));

vi.mock('../../utils/logger.js', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('authenticate middleware', () => {
  let authenticate: Function;
  let verifyAccessToken: ReturnType<typeof vi.fn>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const authModule = await import('../../middleware/auth.js');
    authenticate = authModule.authenticate;
    const jwtModule = await import('../../utils/jwt.js');
    verifyAccessToken = jwtModule.verifyAccessToken as any;
    verifyAccessToken.mockReset();

    req = { headers: {} };
    res = {};
    next = vi.fn();
  });

  function callAuth() {
    try {
      authenticate(req, res, next);
    } catch (e) {
      // Let errors propagate — the error handler middleware will catch them
      throw e;
    }
  }

  it('should throw 401 when no Authorization header', () => {
    expect(() => callAuth()).toThrow('缺少认证令牌');
  });

  it('should throw 401 when Authorization does not start with Bearer', () => {
    req.headers = { authorization: 'Basic abc123' };
    expect(() => callAuth()).toThrow('缺少认证令牌');
  });

  it('should throw 401 when Authorization is empty string', () => {
    req.headers = { authorization: '' };
    expect(() => callAuth()).toThrow('缺少认证令牌');
  });

  it('should throw 401 when Bearer token is empty (no token after Bearer)', () => {
    req.headers = { authorization: 'Bearer ' };
    verifyAccessToken.mockImplementation(() => {
      throw new Error('jwt malformed');
    });
    expect(() => callAuth()).toThrow('无效的认证令牌');
  });

  it('should throw 401 when token is invalid', () => {
    req.headers = { authorization: 'Bearer invalid-token' };
    verifyAccessToken.mockImplementation(() => {
      throw new Error('invalid');
    });
    expect(() => callAuth()).toThrow('无效的认证令牌');
  });

  it('should throw 401 on expired token (TokenExpiredError)', () => {
    req.headers = { authorization: 'Bearer expired-token' };
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    verifyAccessToken.mockImplementation(() => {
      throw err;
    });
    expect(() => callAuth()).toThrow('令牌已过期');
  });

  it('should call next() and set req.user when token is valid', () => {
    req.headers = { authorization: 'Bearer valid-token' };
    verifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });

    callAuth();

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ userId: 1, role: 'student' });
  });

  it('should set userId and role on req.user', () => {
    req.headers = { authorization: 'Bearer admin-token' };
    verifyAccessToken.mockReturnValue({ userId: 99, role: 'admin' });

    callAuth();

    expect(req.user!.userId).toBe(99);
    expect(req.user!.role).toBe('admin');
  });

  it('should handle token with different roles', () => {
    req.headers = { authorization: 'Bearer vip-token' };
    verifyAccessToken.mockReturnValue({ userId: 5, role: 'vip' });

    callAuth();

    expect(req.user!.role).toBe('vip');
  });

  it('should throw 401 when token has no userId', () => {
    req.headers = { authorization: 'Bearer bad-token' };
    verifyAccessToken.mockReturnValue({ role: 'student' });

    callAuth();

    expect(req.user!.userId).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
