import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @campushub/shared ──
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
const mockDemandRepository = vi.hoisted(() => ({ create: vi.fn(), findById: vi.fn(), findMany: vi.fn(), updateWithVersion: vi.fn(), delete: vi.fn() }));
const mockDemandImageRepository = vi.hoisted(() => ({ createMany: vi.fn(), deleteByDemandId: vi.fn() }));
const mockOrderRepository = vi.hoisted(() => ({ create: vi.fn(), findById: vi.fn(), findManyByUser: vi.fn(), update: vi.fn(), updateWithVersion: vi.fn(), findByDemandId: vi.fn() }));
const mockDisputeRepository = vi.hoisted(() => ({ findActiveByOrderId: vi.fn(), create: vi.fn(), findByOrderId: vi.fn() }));
const mockNoShowRecordRepository = vi.hoisted(() => ({ create: vi.fn(), count: vi.fn(), findMany: vi.fn() }));
const mockReviewRepository = vi.hoisted(() => ({ findByOrderAndUser: vi.fn(), create: vi.fn(), findByUserId: vi.fn() }));
const mockNotificationRepository = vi.hoisted(() => ({ findByUserId: vi.fn(), create: vi.fn(), updateMany: vi.fn(), countUnreadByUserId: vi.fn() }));
const mockMessageRepository = vi.hoisted(() => ({ findByOrderId: vi.fn(), create: vi.fn() }));
const mockNotifyReviewReceived = vi.hoisted(() => vi.fn());
const mockNotifyNewMessage = vi.hoisted(() => vi.fn());
const mockNotifyOrderTaken = vi.hoisted(() => vi.fn());
const mockNotifyOrderCompleted = vi.hoisted(() => vi.fn());
const mockNotifyOrderConfirmed = vi.hoisted(() => vi.fn());
const mockNotifyOrderCancelled = vi.hoisted(() => vi.fn());
const mockResolvePublisher = vi.hoisted(() => vi.fn());

const noopMiddleware = vi.hoisted(() => (_req: any, _res: any, next: any) => next());

// ── Mock prisma ──
const mockPrisma = vi.hoisted(() => ({
  user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), delete: vi.fn(), count: vi.fn() },
  order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), findUniqueOrThrow: vi.fn() },
  demand: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  noShowRecord: { create: vi.fn(), count: vi.fn() },
  dispute: { create: vi.fn() },
  refreshToken: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@campushub/shared', async () => {
  const actual = await vi.importActual<typeof import('@campushub/shared')>('@campushub/shared');
  return {
    AppError: actual.AppError,
    BadRequestError: actual.BadRequestError,
    UnauthorizedError: actual.UnauthorizedError,
    ForbiddenError: actual.ForbiddenError,
    NotFoundError: actual.NotFoundError,
    ConflictError: actual.ConflictError,
    ValidationError: actual.ValidationError,
    successResponse: actual.successResponse,
    createdResponse: actual.createdResponse,
    paginatedResponse: actual.paginatedResponse,
    errorResponse: actual.errorResponse,
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
    checkMinCredit: (minScore: number = 40) => async (req: any, _res: any, next: any) => {
      const user = await mockPrisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { creditScore: true },
      });
      if (!user) throw new actual.NotFoundError('用户不存在');
      if (user.creditScore < minScore) throw new actual.ForbiddenError('信用分不足，无法发布需求');
      next();
    },
    createRateLimiter: () => noopMiddleware,
    loginLimiter: noopMiddleware,
    registerLimiter: noopMiddleware,
    refreshLimiter: noopMiddleware,
    orderLimiter: noopMiddleware,
    generalLimiter: noopMiddleware,
    validatePasswordFormat: actual.validatePasswordFormat,
    encryptPhone: actual.encryptPhone,
    decryptPhone: actual.decryptPhone,
    maskPhone: actual.maskPhone,
    ACCESS_TOKEN_EXPIRES_IN: 3600,
    logger: actual.logger,
    hashPassword: mockHashPassword,
    comparePassword: mockComparePassword,
    generateAccessToken: mockGenerateAccessToken,
    generateRefreshToken: mockGenerateRefreshToken,
    hashToken: mockHashToken,
    verifyAccessToken: mockVerifyAccessToken,
    userRepository: mockUserRepository,
    refreshTokenRepository: mockRefreshTokenRepository,
    demandRepository: mockDemandRepository,
    demandImageRepository: mockDemandImageRepository,
    orderRepository: mockOrderRepository,
    disputeRepository: mockDisputeRepository,
    noShowRecordRepository: mockNoShowRecordRepository,
    reviewRepository: mockReviewRepository,
    notificationRepository: mockNotificationRepository,
    messageRepository: mockMessageRepository,
    notifyOrderTaken: mockNotifyOrderTaken,
    notifyOrderCompleted: mockNotifyOrderCompleted,
    notifyOrderConfirmed: mockNotifyOrderConfirmed,
    notifyOrderCancelled: mockNotifyOrderCancelled,
    notifyReviewReceived: mockNotifyReviewReceived,
    notifyNewMessage: mockNotifyNewMessage,
    resolvePublisher: mockResolvePublisher,
    prisma: mockPrisma,
  };
});

import express from 'express';
import request from 'supertest';
import authRoutes from '../../service-b/src/routes/auth-routes.js';
import userRoutes from '../../service-b/src/routes/user-routes.js';
import demandRoutes from '../../service-a/src/routes/demand-routes.js';
import orderRoutes from '../../service-a/src/routes/order-routes.js';
import { errorHandler } from '@campushub/shared';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/demands', demandRoutes);
app.use('/api/orders', orderRoutes);
app.use(errorHandler);

const ACCESS_TOKEN = 'access-token';
const PROVIDER_TOKEN = 'provider-token';

const mockUser = {
  id: 1,
  studentId: '2218800001',
  nickname: '发布者',
  creditScore: 70,
  role: 'student',
  status: '正常',
  createdAt: new Date(),
};

const mockProvider = {
  id: 2,
  studentId: '2218800002',
  nickname: '接单者',
  creditScore: 70,
  role: 'student',
  status: '正常',
  restrictedUntil: null,
  createdAt: new Date(),
};

const demandTemplate = {
  id: 1,
  publisherId: 1,
  title: '测试需求',
  status: '开放',
  version: 1,
};

const orderTemplate = {
  id: 1,
  demandId: 1,
  publisherId: 1,
  providerId: 2,
  status: '进行中',
  reward: 50,
  version: 1,
};

describe('Error Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
  });

  describe('Flow 1: No-show restriction (provider cancels 3 times)', () => {
    it('should restrict provider after 3 no-shows in 30 days', async () => {
      // Setup authenticate as provider
      mockVerifyAccessToken.mockReturnValue({ userId: 2, role: 'student' });

      const now = new Date();

      // ── No-show #1 ──
      // demand exists, status=进行中, provider is the one cancelling
      mockDemandRepository.findById.mockResolvedValue({ ...demandTemplate, id: 10, status: '开放' });
      mockOrderRepository.findById.mockResolvedValue({
        ...orderTemplate,
        id: 10,
        demandId: 10,
        status: '进行中',
        version: 1,
        publisherId: 1,
        providerId: 2,
      });

      // Transaction: update order, update demand, update user credit, create noShowRecord, count
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.demand.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.noShowRecord.create.mockResolvedValue({});
      mockPrisma.noShowRecord.count.mockResolvedValue(1); // 1st no-show
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 10,
        demandId: 10,
        publisherId: 1,
        providerId: 2,
        status: '已取消',
        reward: 50,
        cancelledAt: now,
        cancelledBy: 'provider',
        cancelReason: null,
        demand: { id: 10, title: '测试', category: '学习辅导', status: '开放' },
      });

      let res = await request(app)
        .put('/api/orders/10/cancel')
        .set('Authorization', `Bearer ${PROVIDER_TOKEN}`)
        .send({ reason: '临时有事' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('订单已取消');
      // Credit deduction: 70 - 10 = 60, but not restricted yet (1 < 3)
      expect(res.body.data.status).toBe('已取消');

      // ── No-show #2 (different demand) ──
      mockDemandRepository.findById.mockResolvedValue({ ...demandTemplate, id: 11, status: '开放' });
      mockOrderRepository.findById.mockResolvedValue({
        ...orderTemplate,
        id: 11,
        demandId: 11,
        status: '进行中',
        version: 1,
      });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.noShowRecord.count.mockResolvedValue(2); // 2nd no-show
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 11,
        demandId: 11,
        publisherId: 1,
        providerId: 2,
        status: '已取消',
        reward: 50,
        cancelledAt: now,
        cancelledBy: 'provider',
        cancelReason: null,
        demand: { id: 11, title: '测试2', category: '学习辅导', status: '开放' },
      });

      res = await request(app)
        .put('/api/orders/11/cancel')
        .set('Authorization', `Bearer ${PROVIDER_TOKEN}`)
        .send({ reason: '又临时有事' });

      expect(res.status).toBe(200);

      // ── No-show #3 (different demand) → triggers restriction ──
      mockDemandRepository.findById.mockResolvedValue({ ...demandTemplate, id: 12, status: '开放' });
      mockOrderRepository.findById.mockResolvedValue({
        ...orderTemplate,
        id: 12,
        demandId: 12,
        status: '进行中',
        version: 1,
      });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.noShowRecord.count.mockResolvedValue(3); // 3rd → restricted!
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 12,
        demandId: 12,
        publisherId: 1,
        providerId: 2,
        status: '已取消',
        reward: 50,
        cancelledAt: now,
        cancelledBy: 'provider',
        cancelReason: null,
        demand: { id: 12, title: '测试3', category: '学习辅导', status: '开放' },
      });

      res = await request(app)
        .put('/api/orders/12/cancel')
        .set('Authorization', `Bearer ${PROVIDER_TOKEN}`)
        .send({ reason: '再三有事' });

      expect(res.status).toBe(200);

      // ── Verify restriction: user.update called with restrictedUntil ──
      // After 3rd no-show, tx.user.update should be called with restrictedUntil
      const userUpdateCalls = mockPrisma.user.update.mock.calls;
      const restrictionCall = userUpdateCalls.find(
        (call: any[]) => call[0]?.data?.restrictedUntil !== undefined,
      );
      expect(restrictionCall).toBeTruthy();

      // ── Attempt to take new order while restricted ──
      mockVerifyAccessToken.mockReturnValue({ userId: 2, role: 'student' });
      mockDemandRepository.findById.mockResolvedValue({ ...demandTemplate, id: 13, status: '开放' });
      mockOrderRepository.findByDemandId.mockResolvedValue(null);
      // User is now restricted
      mockUserRepository.findById.mockResolvedValue({
        ...mockProvider,
        creditScore: 40, // 70 - 3*10
        restrictedUntil: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days
      });

      res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${PROVIDER_TOKEN}`)
        .send({ demandId: 13 });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('限制接单');
    });
  });

  describe('Flow 2: Unauthenticated access', () => {
    it('should reject requests without token', async () => {
      let res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);

      res = await request(app)
        .post('/api/demands')
        .send({ title: 'test', description: 'desc', category: '学习辅导', reward: 50 });
      expect(res.status).toBe(401);

      res = await request(app)
        .post('/api/orders')
        .send({ demandId: 1 });
      expect(res.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });

    it('should reject requests with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'NoBearer token');

      expect(res.status).toBe(401);
    });

    it('should reject accessing another user order', async () => {
      // User 3 tries to access order for users 1 and 2
      mockVerifyAccessToken.mockReturnValue({ userId: 3, role: 'student' });
      mockOrderRepository.findById.mockResolvedValue({
        ...orderTemplate,
        publisherId: 1,
        providerId: 2,
      });

      const res = await request(app)
        .get('/api/orders/1')
        .set('Authorization', `Bearer ${ACCESS_TOKEN}`);

      expect(res.status).toBe(403);
    });

    it('should reject cancelling order as non-participant', async () => {
      mockVerifyAccessToken.mockReturnValue({ userId: 99, role: 'student' });
      mockOrderRepository.findById.mockResolvedValue({
        ...orderTemplate,
        status: '进行中',
        publisherId: 1,
        providerId: 2,
      });

      const res = await request(app)
        .put('/api/orders/1/cancel')
        .set('Authorization', `Bearer ${ACCESS_TOKEN}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Flow 3: Insufficient credit score', () => {
    it('should reject take order when credit < 40', async () => {
      mockVerifyAccessToken.mockReturnValue({ userId: 2, role: 'student' });
      mockDemandRepository.findById.mockResolvedValue({
        ...demandTemplate,
        publisherId: 1,
        status: '开放',
      });
      mockOrderRepository.findByDemandId.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue({
        ...mockProvider,
        creditScore: 30, // < 40
        restrictedUntil: null,
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${PROVIDER_TOKEN}`)
        .send({ demandId: 1 });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('信用分不足');
    });

    it('should reject create demand when credit < 40', async () => {
      mockVerifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });
      // checkMinCredit calls prisma.user.findUnique
      mockPrisma.user.findUnique.mockResolvedValue({ creditScore: 30 }); // < 40

      const res = await request(app)
        .post('/api/demands')
        .set('Authorization', `Bearer ${ACCESS_TOKEN}`)
        .send({ title: 'test', description: 'desc', category: '学习辅导', reward: 50 });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('信用分不足');
    });
  });
});
