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

// ── Build mockPrisma (must be hoisted since it's used in vi.mock factory) ──
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
    checkMinCredit: (minScore: number = 40) => async (req: any, _res: any, next: any) => {
      const user = await mockPrisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { creditScore: true },
      });
      if (!user) throw new actual.NotFoundError('用户不存在');
      if (user.creditScore < minScore) throw new actual.ForbiddenError('信用分不足，无法发布需求');
      next();
    },
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
    demandRepository: mockDemandRepository,
    demandImageRepository: mockDemandImageRepository,
    orderRepository: mockOrderRepository,
    disputeRepository: mockDisputeRepository,
    noShowRecordRepository: mockNoShowRecordRepository,
    reviewRepository: mockReviewRepository,
    notificationRepository: mockNotificationRepository,
    messageRepository: mockMessageRepository,
    // Mocked helpers
    notifyOrderTaken: mockNotifyOrderTaken,
    notifyOrderCompleted: mockNotifyOrderCompleted,
    notifyOrderConfirmed: mockNotifyOrderConfirmed,
    notifyOrderCancelled: mockNotifyOrderCancelled,
    notifyReviewReceived: mockNotifyReviewReceived,
    notifyNewMessage: mockNotifyNewMessage,
    resolvePublisher: mockResolvePublisher,
    // Mocked prisma
    prisma: mockPrisma,
  };
});

// Must be imported after the mock
import express from 'express';
import request from 'supertest';
import authRoutes from '../../service-b/src/routes/auth-routes.js';
import userRoutes from '../../service-b/src/routes/user-routes.js';
import reviewRoutes from '../../service-b/src/routes/review-routes.js';
import demandRoutes from '../../service-a/src/routes/demand-routes.js';
import orderRoutes from '../../service-a/src/routes/order-routes.js';
import { errorHandler } from '@campushub/shared';

// ── Build test app ──
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/demands', demandRoutes);
app.use('/api/orders', orderRoutes);
app.use(errorHandler);

// ── Test constants ──
const ACCESS_TOKEN_A = 'token-user-a';
const ACCESS_TOKEN_B = 'token-user-b';
const REFRESH_TOKEN_A = 'refresh-a';
const REFRESH_TOKEN_B = 'refresh-b';

const userA = {
  id: 1,
  studentId: '2218800001',
  nickname: '发布者',
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

const userB = {
  id: 2,
  studentId: '2218800002',
  nickname: '服务者',
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

const demandResponse = {
  id: 1,
  publisherId: 1,
  title: '测试需求',
  description: '需要帮忙',
  category: '学习辅导',
  status: '开放',
  reward: 50,
  isUrgent: false,
  isAnonymous: false,
  images: [],
};

const orderResponse = {
  id: 1,
  demandId: 1,
  publisherId: 1,
  providerId: 2,
  status: '进行中',
  reward: 50,
  createdAt: new Date(),
};

describe('Order Integration Flow — Happy Path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default $transaction: execute callback with mockPrisma as tx
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
  });

  // ── Step 1: Register user A (publisher) ──
  async function registerA() {
    mockUserRepository.findByStudentId.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue('hashed_a');
    mockPrisma.user.create.mockResolvedValue(userA);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ studentId: '2218800001', password: 'Test1234', nickname: '发布者' });

    return res;
  }

  // ── Step 2: Login user A ──
  async function loginA() {
    mockUserRepository.findByStudentIdWithPassword.mockResolvedValue({ ...userA, passwordHash: 'hashed_a' });
    mockComparePassword.mockResolvedValue(true);
    mockGenerateAccessToken.mockReturnValue(ACCESS_TOKEN_A);
    mockGenerateRefreshToken.mockReturnValue({ rawToken: REFRESH_TOKEN_A, tokenHash: 'hash-a', expiresAt: new Date() });
    mockUserRepository.updateLastLogin.mockResolvedValue(undefined);
    mockRefreshTokenRepository.create.mockResolvedValue(undefined);

    return request(app)
      .post('/api/auth/login')
      .send({ studentId: '2218800001', password: 'Test1234' });
  }

  // ── Step 3: Create demand as user A ──
  async function createDemand() {
    mockVerifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });
    // checkMinCredit calls prisma.user.findUnique
    mockPrisma.user.findUnique.mockResolvedValue({ creditScore: 70 });
    mockDemandRepository.create.mockResolvedValue(demandResponse);
    mockDemandRepository.findById.mockResolvedValue(demandResponse);
    mockDemandImageRepository.createMany.mockResolvedValue(undefined);

    return request(app)
      .post('/api/demands')
      .set('Authorization', `Bearer ${ACCESS_TOKEN_A}`)
      .send({ title: '测试需求', description: '需要帮忙', category: '学习辅导', reward: 50 });
  }

  // ── Step 4: Register user B (provider) ──
  async function registerB() {
    mockUserRepository.findByStudentId.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue('hashed_b');
    mockPrisma.user.create.mockResolvedValue(userB);

    return request(app)
      .post('/api/auth/register')
      .send({ studentId: '2218800002', password: 'Test5678', nickname: '服务者' });
  }

  // ── Step 5: Login user B ──
  async function loginB() {
    mockUserRepository.findByStudentIdWithPassword.mockResolvedValue({ ...userB, passwordHash: 'hashed_b' });
    mockComparePassword.mockResolvedValue(true);
    mockGenerateAccessToken.mockReturnValue(ACCESS_TOKEN_B);
    mockGenerateRefreshToken.mockReturnValue({ rawToken: REFRESH_TOKEN_B, tokenHash: 'hash-b', expiresAt: new Date() });
    mockUserRepository.updateLastLogin.mockResolvedValue(undefined);
    mockRefreshTokenRepository.create.mockResolvedValue(undefined);

    return request(app)
      .post('/api/auth/login')
      .send({ studentId: '2218800002', password: 'Test5678' });
  }

  // ── Step 6: User B takes the order ──
  async function takeOrder() {
    mockVerifyAccessToken.mockReturnValue({ userId: 2, role: 'student' });
    // takeOrder service checks: demand exists, not own, status=开放, no existing order, user credit >= 40, not restricted
    mockDemandRepository.findById.mockResolvedValue({
      ...demandResponse,
      publisherId: 1,
      status: '开放',
    });
    mockOrderRepository.findByDemandId.mockResolvedValue(null);
    mockUserRepository.findById.mockResolvedValue({ ...userB, creditScore: 70, restrictedUntil: null });

    // Transaction: verify demand status + update demand + create order
    mockPrisma.demand.findUnique.mockResolvedValue({ id: 1, status: '开放', version: 1 });
    mockPrisma.demand.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.create.mockResolvedValue(orderResponse);

    return request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${ACCESS_TOKEN_B}`)
      .send({ demandId: 1 });
  }

  // ── Step 7: User B submits complete ──
  async function submitComplete() {
    mockVerifyAccessToken.mockReturnValue({ userId: 2, role: 'student' });
    mockOrderRepository.findById.mockResolvedValue({
      ...orderResponse,
      status: '进行中',
      version: 1,
      providerId: 2,
    });
    mockOrderRepository.updateWithVersion.mockResolvedValue(1);

    return request(app)
      .put('/api/orders/1/complete')
      .set('Authorization', `Bearer ${ACCESS_TOKEN_B}`);
  }

  // ── Step 8: User A confirms complete ──
  async function confirmComplete() {
    mockVerifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });
    mockOrderRepository.findById.mockResolvedValue({
      ...orderResponse,
      status: '待确认',
      version: 2,
      publisherId: 1,
    });
    // Transaction: update order + update demand
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.demand.update.mockResolvedValue({});
    mockPrisma.order.findUnique.mockResolvedValue({
      ...orderResponse,
      status: '已完成',
      isPaid: false,
      completedAt: new Date(),
      demand: { id: 1, title: '测试需求', category: '学习辅导', status: '已完成' },
    });

    return request(app)
      .put('/api/orders/1/confirm')
      .set('Authorization', `Bearer ${ACCESS_TOKEN_A}`);
  }

  // ── Step 9: User A reviews user B (4★ → credit +1) ──
  async function reviewB() {
    mockVerifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 1,
      status: '已完成',
      publisherId: 1,
      providerId: 2,
      demand: { title: '测试需求' },
    });
    mockReviewRepository.findByOrderAndUser.mockResolvedValue(null);
    mockReviewRepository.create.mockResolvedValue({
      id: 1,
      orderId: 1,
      fromUserId: 1,
      toUserId: 2,
      rating: 4,
      content: '还不错',
    });
    mockPrisma.user.findUnique.mockResolvedValue({ creditScore: 70, nickname: '发布者' });
    mockPrisma.user.update.mockResolvedValue({});

    return request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${ACCESS_TOKEN_A}`)
      .send({ orderId: 1, rating: 4, content: '还不错' });
  }

  // ── Step 10: User B reviews user A (5★ → credit +3) ──
  async function reviewA() {
    mockVerifyAccessToken.mockReturnValue({ userId: 2, role: 'student' });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 1,
      status: '已完成',
      publisherId: 1,
      providerId: 2,
      demand: { title: '测试需求' },
    });
    mockReviewRepository.findByOrderAndUser.mockResolvedValue(null);
    mockReviewRepository.create.mockResolvedValue({
      id: 2,
      orderId: 1,
      fromUserId: 2,
      toUserId: 1,
      rating: 5,
      content: '非常好',
    });
    mockPrisma.user.findUnique.mockResolvedValue({ creditScore: 71, nickname: '服务者' });
    mockPrisma.user.update.mockResolvedValue({});

    return request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${ACCESS_TOKEN_B}`)
      .send({ orderId: 1, rating: 5, content: '非常好' });
  }

  it('should complete the full order lifecycle', async () => {
    // Step 1: Register A
    const r1 = await registerA();
    expect(r1.status).toBe(201);
    expect(r1.body.data.studentId).toBe('2218*****001');

    // Step 2: Login A
    const r2 = await loginA();
    expect(r2.status).toBe(200);
    expect(r2.body.data.token).toBe(ACCESS_TOKEN_A);
    expect(r2.body.data.user.nickname).toBe('发布者');

    // Step 3: Create demand
    const r3 = await createDemand();
    expect(r3.status).toBe(201);
    expect(r3.body.data.title).toBe('测试需求');
    expect(r3.body.data.status).toBe('开放');

    // Step 4: Register B
    const r4 = await registerB();
    expect(r4.status).toBe(201);

    // Step 5: Login B
    const r5 = await loginB();
    expect(r5.status).toBe(200);
    expect(r5.body.data.token).toBe(ACCESS_TOKEN_B);

    // Step 6: Take order
    const r6 = await takeOrder();
    expect(r6.status).toBe(201);
    expect(r6.body.data.status).toBe('进行中');
    expect(r6.body.message).toBe('接单成功');

    // Step 7: Submit complete
    const r7 = await submitComplete();
    expect(r7.status).toBe(200);
    expect(r7.body.message).toBe('已提交完成');

    // Step 8: Confirm complete
    const r8 = await confirmComplete();
    expect(r8.status).toBe(200);
    expect(r8.body.message).toBe('已确认完成');
    expect(r8.body.data.status).toBe('已完成');

    // Step 9: A reviews B (4★)
    const r9 = await reviewB();
    expect(r9.status).toBe(201);
    expect(r9.body.data.rating).toBe(4);

    // Step 10: B reviews A (5★)
    const r10 = await reviewA();
    expect(r10.status).toBe(201);
    expect(r10.body.data.rating).toBe(5);
  });

  it('should reject duplicate review', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 1,
      status: '已完成',
      publisherId: 1,
      providerId: 2,
      demand: { title: '测试需求' },
    });
    // Already reviewed
    mockReviewRepository.findByOrderAndUser.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${ACCESS_TOKEN_A}`)
      .send({ orderId: 1, rating: 5, content: 'again' });

    expect(res.status).toBe(409);
  });

  it('should reject taking own demand', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 1, role: 'student' });
    mockDemandRepository.findById.mockResolvedValue({
      ...demandResponse,
      publisherId: 1, // same as requester
      status: '开放',
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${ACCESS_TOKEN_A}`)
      .send({ demandId: 1 });

    expect(res.status).toBe(400);
  });
});
