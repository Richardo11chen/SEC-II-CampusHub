import { describe, it, expect, vi, beforeAll } from 'vitest';

// ── Mock @campushub/shared before any imports ──
const mockUserRepository = vi.hoisted(() => ({
  findById: vi.fn(),
  findByStudentId: vi.fn(),
  findByStudentIdWithPassword: vi.fn(),
  updateLastLogin: vi.fn(),
}));

const mockRefreshTokenRepository = vi.hoisted(() => ({
  create: vi.fn(),
  findValidToken: vi.fn(),
  revoke: vi.fn(),
  revokeAllForUser: vi.fn(),
}));

const mockHashPassword = vi.hoisted(() => vi.fn());
const mockComparePassword = vi.hoisted(() => vi.fn());
const mockGenerateAccessToken = vi.hoisted(() => vi.fn());
const mockGenerateRefreshToken = vi.hoisted(() => vi.fn());
const mockHashToken = vi.hoisted(() => vi.fn());
const mockVerifyAccessToken = vi.hoisted(() => vi.fn());
const mockNotifyReviewReceived = vi.hoisted(() => vi.fn());
const mockNotifyNewMessage = vi.hoisted(() => vi.fn());
const mockNotifyOrderTaken = vi.hoisted(() => vi.fn());
const mockNotifyOrderCompleted = vi.hoisted(() => vi.fn());
const mockNotifyOrderConfirmed = vi.hoisted(() => vi.fn());
const mockNotifyOrderCancelled = vi.hoisted(() => vi.fn());
const mockResolvePublisher = vi.hoisted(() => vi.fn());

const noopMiddleware = vi.hoisted(() => (_req: any, _res: any, next: any) => next());

vi.mock('@campushub/shared', async () => {
  const actual = await vi.importActual<typeof import('@campushub/shared')>('@campushub/shared');
  return {
    // Real Error classes
    AppError: actual.AppError,
    BadRequestError: actual.BadRequestError,
    UnauthorizedError: actual.UnauthorizedError,
    ForbiddenError: actual.ForbiddenError,
    NotFoundError: actual.NotFoundError,
    ConflictError: actual.ConflictError,
    ValidationError: actual.ValidationError,
    // Real api-response
    successResponse: actual.successResponse,
    createdResponse: actual.createdResponse,
    paginatedResponse: actual.paginatedResponse,
    errorResponse: actual.errorResponse,
    // Real middleware
    authenticate: (req: any, _res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new actual.UnauthorizedError('缺少认证令牌');
      }
      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new actual.UnauthorizedError('缺少认证令牌');
      }
      try {
        const payload = mockVerifyAccessToken(token);
        req.user = payload;
        next();
      } catch {
        throw new actual.UnauthorizedError('无效的认证令牌');
      }
    },
    errorHandler: actual.errorHandler,
    validate: actual.validate,
    checkMinCredit: actual.checkMinCredit,
    // Rate limiters as no-ops for tests
    createRateLimiter: () => noopMiddleware,
    loginLimiter: noopMiddleware,
    registerLimiter: noopMiddleware,
    refreshLimiter: noopMiddleware,
    orderLimiter: noopMiddleware,
    generalLimiter: noopMiddleware,
    // Real utils
    validatePasswordFormat: actual.validatePasswordFormat,
    encryptPhone: actual.encryptPhone,
    decryptPhone: actual.decryptPhone,
    maskPhone: actual.maskPhone,
    ACCESS_TOKEN_EXPIRES_IN: 3600,
    logger: actual.logger,
    // Mocked auth utils
    hashPassword: mockHashPassword,
    comparePassword: mockComparePassword,
    generateAccessToken: mockGenerateAccessToken,
    generateRefreshToken: mockGenerateRefreshToken,
    hashToken: mockHashToken,
    verifyAccessToken: mockVerifyAccessToken,
    // Mocked repositories
    userRepository: mockUserRepository,
    refreshTokenRepository: mockRefreshTokenRepository,
    demandRepository: { create: vi.fn(), findById: vi.fn(), findMany: vi.fn(), updateWithVersion: vi.fn(), delete: vi.fn() },
    demandImageRepository: { createMany: vi.fn(), deleteByDemandId: vi.fn() },
    orderRepository: { create: vi.fn(), findById: vi.fn(), findManyByUser: vi.fn(), update: vi.fn(), updateWithVersion: vi.fn(), findByDemandId: vi.fn() },
    disputeRepository: { findActiveByOrderId: vi.fn(), create: vi.fn() },
    noShowRecordRepository: { create: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    reviewRepository: { findByOrderAndUser: vi.fn(), create: vi.fn(), findByUserId: vi.fn() },
    notificationRepository: { findByUserId: vi.fn(), create: vi.fn(), updateMany: vi.fn(), countUnreadByUserId: vi.fn() },
    messageRepository: { findByOrderId: vi.fn(), create: vi.fn() },
    // Mocked helpers
    notifyOrderTaken: mockNotifyOrderTaken,
    notifyOrderCompleted: mockNotifyOrderCompleted,
    notifyOrderConfirmed: mockNotifyOrderConfirmed,
    notifyOrderCancelled: mockNotifyOrderCancelled,
    notifyReviewReceived: mockNotifyReviewReceived,
    notifyNewMessage: mockNotifyNewMessage,
    resolvePublisher: mockResolvePublisher,
    // Mocked prisma
    prisma: {
      user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), delete: vi.fn(), count: vi.fn() },
      order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn() },
      demand: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      noShowRecord: { create: vi.fn(), count: vi.fn() },
      dispute: { create: vi.fn() },
      refreshToken: { create: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

import express from 'express';
import request from 'supertest';
import authRoutes from '../../service-b/src/routes/auth-routes.js';
import userRoutes from '../../service-b/src/routes/user-routes.js';
import { errorHandler } from '@campushub/shared';

// ── Build minimal test app (no app.listen side effect) ──
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use(errorHandler);

const shared = await import('@campushub/shared');

// ── Test constants ──
const ACCESS_TOKEN = 'access-token-jwt';
const REFRESH_TOKEN = 'raw-refresh-token';
const NEW_ACCESS_TOKEN = 'new-access-token';
const NEW_REFRESH_TOKEN = 'new-raw-refresh';

const mockUser = {
  id: 1,
  studentId: '2218800001',
  nickname: '测试用户',
  name: null,
  college: null,
  email: null,
  avatar: null,
  creditScore: 70,
  role: 'student',
  showRealName: false,
  status: '正常',
  createdAt: new Date('2025-01-01'),
};

const mockUserWithPassword = {
  ...mockUser,
  passwordHash: 'hashed_password',
};

describe('Auth Integration Flow', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      mockUserRepository.findByStudentId.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed_password');
      (shared.prisma.user.create as any).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          studentId: '2218800001',
          password: 'Test1234',
          nickname: '测试用户',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(201);
      expect(res.body.data.studentId).toBe('2218*****001');
    });

    it('should reject duplicate studentId', async () => {
      mockUserRepository.findByStudentId.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          studentId: '2218800001',
          password: 'Test1234',
          nickname: '测试用户',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('该学号已注册');
    });

    it('should reject invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          studentId: '123',
          password: 'short',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login and return tokens', async () => {
      mockUserRepository.findByStudentIdWithPassword.mockResolvedValue(mockUserWithPassword);
      mockComparePassword.mockResolvedValue(true);
      mockGenerateAccessToken.mockReturnValue(ACCESS_TOKEN);
      mockGenerateRefreshToken.mockReturnValue({
        rawToken: REFRESH_TOKEN,
        tokenHash: 'hash-refresh',
        expiresAt: new Date(),
      });
      mockUserRepository.updateLastLogin.mockResolvedValue(undefined);
      mockRefreshTokenRepository.create.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: '2218800001',
          password: 'Test1234',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBe(ACCESS_TOKEN);
      expect(res.body.data.refreshToken).toBe(REFRESH_TOKEN);
      expect(res.body.data.expiresIn).toBe(3600);
      expect(res.body.data.user.studentId).toBe('2218*****001');
    });

    it('should reject wrong password', async () => {
      mockUserRepository.findByStudentIdWithPassword.mockResolvedValue(mockUserWithPassword);
      mockComparePassword.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: '2218800001',
          password: 'wrong_password',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('学号或密码错误');
    });

    it('should reject disabled account', async () => {
      mockUserRepository.findByStudentIdWithPassword.mockResolvedValue({
        ...mockUserWithPassword,
        status: '已禁用',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: '2218800001',
          password: 'Test1234',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile with valid token', async () => {
      mockVerifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });
      (shared.prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${ACCESS_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.nickname).toBe('测试用户');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/users/me');

      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return new token pair for valid refresh token', async () => {
      mockHashToken.mockReturnValue('hashed-refresh');
      mockRefreshTokenRepository.findValidToken.mockResolvedValue({
        id: 1,
        userId: 1,
        tokenHash: 'hashed-refresh',
      });
      mockGenerateAccessToken.mockReturnValue(NEW_ACCESS_TOKEN);
      mockGenerateRefreshToken.mockReturnValue({
        rawToken: NEW_REFRESH_TOKEN,
        tokenHash: 'new-hash',
        expiresAt: new Date(),
      });
      mockUserRepository.findById.mockResolvedValue({ id: 1, role: 'student' });
      mockRefreshTokenRepository.revoke.mockResolvedValue(undefined);
      mockRefreshTokenRepository.create.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: REFRESH_TOKEN });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBe(NEW_ACCESS_TOKEN);
      expect(res.body.data.refreshToken).toBe(NEW_REFRESH_TOKEN);
    });

    it('should reject invalid refresh token', async () => {
      mockHashToken.mockReturnValue('hashed-invalid');
      mockRefreshTokenRepository.findValidToken.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke specific token', async () => {
      mockVerifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });
      mockHashToken.mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findValidToken.mockResolvedValue({
        id: 5,
        userId: 1,
        tokenHash: 'hashed-token',
      });
      mockRefreshTokenRepository.revoke.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${ACCESS_TOKEN}`)
        .send({ refreshToken: REFRESH_TOKEN });

      expect(res.status).toBe(200);
      expect(mockRefreshTokenRepository.revoke).toHaveBeenCalledWith(5);
    });

    it('should revoke all tokens when no refreshToken provided', async () => {
      mockVerifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${ACCESS_TOKEN}`)
        .send({});

      expect(res.status).toBe(200);
      expect(mockRefreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(1);
    });
  });
});
