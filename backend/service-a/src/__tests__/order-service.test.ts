import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a fresh mock tx for each test scenario
function mockTx(overrides: Record<string, any> = {}) {
  return {
    demand: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    order: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    noShowRecord: {
      create: vi.fn(),
      count: vi.fn(),
    },
    dispute: {
      create: vi.fn(),
    },
    ...overrides,
  };
}

vi.mock('@campushub/shared', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
  orderRepository: {
    findById: vi.fn(),
    findManyByUser: vi.fn(),
    updateWithVersion: vi.fn(),
    findByDemandId: vi.fn(),
  },
  demandRepository: {
    findById: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
  },
  disputeRepository: {
    findByOrderId: vi.fn(),
  },
  noShowRecordRepository: {
    create: vi.fn(),
    count: vi.fn(),
  },
  NotFoundError: class extends Error {
    statusCode = 404;
    constructor(message = '资源不存在') { super(message); }
  },
  ForbiddenError: class extends Error {
    statusCode = 403;
    constructor(message = '权限不足') { super(message); }
  },
  ConflictError: class extends Error {
    statusCode = 409;
    constructor(message = '资源冲突') { super(message); }
  },
  BadRequestError: class extends Error {
    statusCode = 400;
    constructor(message = '请求参数错误') { super(message); }
  },
  notifyOrderTaken: vi.fn(),
  notifyOrderCompleted: vi.fn(),
  notifyOrderCancelled: vi.fn(),
  notifyOrderConfirmed: vi.fn(),
}));

import { orderService } from '../service/order-service.js';

const shared = await import('@campushub/shared');

describe('orderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── takeOrder ──

  describe('takeOrder', () => {
    const openDemand = {
      id: 100,
      publisherId: 10,
      status: '开放',
      reward: 50,
    };

    it('should take order successfully', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue(null);
      (shared.userRepository.findById as any).mockResolvedValue({ creditScore: 70, restrictedUntil: null });

      const tx = mockTx();
      tx.demand.findUnique.mockResolvedValue({ id: 100, status: '开放', version: 1 });
      tx.demand.updateMany.mockResolvedValue({ count: 1 });
      tx.order.create.mockResolvedValue({
        id: 1, demandId: 100, publisherId: 10, providerId: 20,
        status: '进行中', reward: 50, createdAt: new Date(),
        demand: { id: 100, title: '测试', category: '学习辅导', status: '进行中' },
      });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      const result = await orderService.takeOrder(100, 20);

      expect(result.status).toBe('进行中');
      expect(result.providerId).toBe(20);
    });

    it('should throw NotFoundError if demand not found', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(null);

      await expect(
        orderService.takeOrder(999, 20),
      ).rejects.toThrow('需求不存在');
    });

    it('should throw BadRequestError if taking own demand', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);

      await expect(
        orderService.takeOrder(100, 10),
      ).rejects.toThrow('不能接自己的需求');
    });

    it('should throw BadRequestError if demand not open', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue({
        ...openDemand,
        status: '进行中',
      });

      await expect(
        orderService.takeOrder(100, 20),
      ).rejects.toThrow('该需求已不再开放');
    });

    it('should throw ConflictError if order already in progress', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue({
        status: '进行中',
        providerId: 30,
      });

      await expect(
        orderService.takeOrder(100, 20),
      ).rejects.toThrow('该需求已被接单');
    });

    it('should throw ConflictError if no-show provider tries to reactivate', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue({
        status: '已取消',
        providerId: 20,
        cancelledBy: 'provider',
      });

      await expect(
        orderService.takeOrder(100, 20),
      ).rejects.toThrow('你已取消过该订单，不能再次接单');
    });

    it('should reactivate cancelled order for different provider', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue({
        status: '已取消',
        providerId: 30,
        cancelledBy: 'provider',
        version: 2,
      });
      (shared.userRepository.findById as any).mockResolvedValue({ creditScore: 70, restrictedUntil: null });

      const tx = mockTx();
      tx.demand.findUnique.mockResolvedValue({ id: 100, status: '开放', version: 1 });
      tx.demand.updateMany.mockResolvedValue({ count: 1 });
      tx.order.updateMany.mockResolvedValue({ count: 1 });
      tx.order.findUniqueOrThrow.mockResolvedValue({
        id: 5, demandId: 100, publisherId: 10, providerId: 20,
        status: '进行中', reward: 50, createdAt: new Date(),
        demand: { id: 100, title: '测试', category: '学习辅导', status: '进行中' },
      });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      const result = await orderService.takeOrder(100, 20);

      expect(result.status).toBe('进行中');
      expect(tx.order.updateMany).toHaveBeenCalled();
    });

    it('should reactivate cancelled order when cancelled by publisher', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue({
        status: '已取消',
        providerId: 20,
        cancelledBy: 'publisher',
        version: 2,
      });
      (shared.userRepository.findById as any).mockResolvedValue({ creditScore: 70, restrictedUntil: null });

      const tx = mockTx();
      tx.demand.findUnique.mockResolvedValue({ id: 100, status: '开放', version: 1 });
      tx.demand.updateMany.mockResolvedValue({ count: 1 });
      tx.order.updateMany.mockResolvedValue({ count: 1 });
      tx.order.findUniqueOrThrow.mockResolvedValue({
        id: 5, demandId: 100, publisherId: 10, providerId: 20,
        status: '进行中', reward: 50, createdAt: new Date(),
        demand: { id: 100, title: '测试', category: '学习辅导', status: '进行中' },
      });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      const result = await orderService.takeOrder(100, 20);

      expect(result.status).toBe('进行中');
    });

    it('should throw ForbiddenError if credit score < 40', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue(null);
      (shared.userRepository.findById as any).mockResolvedValue({ creditScore: 35, restrictedUntil: null });

      await expect(
        orderService.takeOrder(100, 20),
      ).rejects.toThrow('信用分不足40');
    });

    it('should throw ForbiddenError if restrictedUntil not passed', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue(null);
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      (shared.userRepository.findById as any).mockResolvedValue({ creditScore: 70, restrictedUntil: futureDate });

      await expect(
        orderService.takeOrder(100, 20),
      ).rejects.toThrow('因频繁爽约，您已被限制接单');
    });

    it('should throw NotFoundError if user not found', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue(null);
      (shared.userRepository.findById as any).mockResolvedValue(null);

      await expect(
        orderService.takeOrder(100, 20),
      ).rejects.toThrow('用户不存在');
    });

    it('should throw ConflictError on optimistic lock (demand status changed)', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue(null);
      (shared.userRepository.findById as any).mockResolvedValue({ creditScore: 70, restrictedUntil: null });

      const tx = mockTx();
      tx.demand.findUnique.mockResolvedValue({ id: 100, status: '进行中', version: 1 });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      await expect(
        orderService.takeOrder(100, 20),
      ).rejects.toThrow('需求状态已变更');
    });

    it('should throw ConflictError on version conflict (demand.updateMany returns 0)', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue(null);
      (shared.userRepository.findById as any).mockResolvedValue({ creditScore: 70, restrictedUntil: null });

      const tx = mockTx();
      tx.demand.findUnique.mockResolvedValue({ id: 100, status: '开放', version: 1 });
      tx.demand.updateMany.mockResolvedValue({ count: 0 });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      await expect(
        orderService.takeOrder(100, 20),
      ).rejects.toThrow('需求已被修改，请刷新后重试');
    });

    it('should throw ConflictError on reactivate version conflict', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(openDemand);
      (shared.orderRepository.findByDemandId as any).mockResolvedValue({
        status: '已取消',
        providerId: 30,
        cancelledBy: 'provider',
        version: 2,
      });
      (shared.userRepository.findById as any).mockResolvedValue({ creditScore: 70, restrictedUntil: null });

      const tx = mockTx();
      tx.demand.findUnique.mockResolvedValue({ id: 100, status: '开放', version: 1 });
      tx.demand.updateMany.mockResolvedValue({ count: 1 });
      tx.order.updateMany.mockResolvedValue({ count: 0 });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      await expect(
        orderService.takeOrder(100, 20),
      ).rejects.toThrow('该需求已被其他人抢先接单');
    });
  });

  // ── getOrderList ──

  describe('getOrderList', () => {
    it('should return paginated orders', async () => {
      (shared.orderRepository.findManyByUser as any).mockResolvedValue({
        items: [{ id: 1, status: '进行中' }],
        total: 1,
      });

      const result = await orderService.getOrderList({ userId: 1, page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── getOrderDetail ──

  describe('getOrderDetail', () => {
    const baseOrder = {
      id: 1,
      publisherId: 10,
      providerId: 20,
      status: '进行中',
    };

    it('should return order for publisher', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(baseOrder);

      const result = await orderService.getOrderDetail(1, 10);

      expect(result.id).toBe(1);
    });

    it('should return order for provider', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(baseOrder);

      const result = await orderService.getOrderDetail(1, 20);

      expect(result.id).toBe(1);
    });

    it('should throw ForbiddenError for non-participant', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(baseOrder);

      await expect(
        orderService.getOrderDetail(1, 99),
      ).rejects.toThrow('无权查看该订单');
    });

    it('should throw NotFoundError if order not found', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(null);

      await expect(
        orderService.getOrderDetail(999, 10),
      ).rejects.toThrow('订单不存在');
    });
  });

  // ── submitComplete ──

  describe('submitComplete', () => {
    const inProgressOrder = {
      id: 1,
      providerId: 20,
      publisherId: 10,
      status: '进行中',
      version: 1,
    };

    it('should submit complete successfully', async () => {
      (shared.orderRepository.findById as any)
        .mockResolvedValueOnce(inProgressOrder)
        .mockResolvedValueOnce({ ...inProgressOrder, status: '待确认' });
      (shared.orderRepository.updateWithVersion as any).mockResolvedValue(1);

      const result = await orderService.submitComplete(1, 20);

      expect(result!.status).toBe('待确认');
    });

    it('should throw ForbiddenError if not provider', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);

      await expect(
        orderService.submitComplete(1, 10),
      ).rejects.toThrow('只有服务方可以提交完成');
    });

    it('should throw BadRequestError if not in progress', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue({
        ...inProgressOrder,
        status: '已取消',
      });

      await expect(
        orderService.submitComplete(1, 20),
      ).rejects.toThrow('当前订单状态不允许提交完成');
    });

    it('should throw NotFoundError if order not found', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(null);

      await expect(
        orderService.submitComplete(999, 20),
      ).rejects.toThrow('订单不存在');
    });

    it('should throw ConflictError on version conflict', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);
      (shared.orderRepository.updateWithVersion as any).mockResolvedValue(0);

      await expect(
        orderService.submitComplete(1, 20),
      ).rejects.toThrow('订单已被修改，请刷新后重试');
    });
  });

  // ── cancelOrder ──

  describe('cancelOrder', () => {
    const inProgressOrder = {
      id: 1,
      demandId: 100,
      publisherId: 10,
      providerId: 20,
      status: '进行中',
      version: 1,
    };

    it('should let publisher cancel and reopen demand', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);

      const tx = mockTx();
      tx.order.updateMany.mockResolvedValue({ count: 1 });
      tx.order.findUnique.mockResolvedValue({
        ...inProgressOrder,
        status: '已取消',
        cancelledAt: new Date(),
        cancelledBy: 'publisher',
        cancelReason: '不再需要',
        demand: { id: 100, title: '测试', category: '学习辅导', status: '开放' },
      });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      const result = await orderService.cancelOrder(1, 10, '不再需要');

      expect(result!.status).toBe('已取消');
      expect(result!.cancelledBy).toBe('publisher');
      expect(tx.demand.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { status: '开放' },
      });
    });

    it('should deduct 10 credit and record no-show on provider cancel', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);

      const tx = mockTx();
      tx.order.updateMany.mockResolvedValue({ count: 1 });
      tx.noShowRecord.count.mockResolvedValue(1); // < 3
      tx.order.findUnique.mockResolvedValue({
        ...inProgressOrder,
        status: '已取消',
        cancelledAt: new Date(),
        cancelledBy: 'provider',
        cancelReason: null,
        demand: { id: 100, title: '测试', category: '学习辅导', status: '开放' },
      });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      await orderService.cancelOrder(1, 20);

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 20, creditScore: { gte: 10 } },
        data: { creditScore: { decrement: 10 } },
      });
      expect(tx.noShowRecord.create).toHaveBeenCalledWith({
        data: { userId: 20, orderId: 1 },
      });
      // Not restricted (only 1 no-show)
      expect(tx.user.update).toHaveBeenCalledTimes(1);
    });

    it('should restrict provider on 3rd no-show within 30 days', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);

      const tx = mockTx();
      tx.order.updateMany.mockResolvedValue({ count: 1 });
      tx.noShowRecord.count.mockResolvedValue(3); // >= 3
      tx.order.findUnique.mockResolvedValue({
        ...inProgressOrder,
        status: '已取消',
        cancelledAt: new Date(),
        cancelledBy: 'provider',
        cancelReason: null,
        demand: { id: 100, title: '测试', category: '学习辅导', status: '开放' },
      });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      await orderService.cancelOrder(1, 20);

      // First call: deduct credit, Second call: set restrictedUntil
      expect(tx.user.update).toHaveBeenCalledTimes(2);
      // Second call should set restrictedUntil
      const secondCall = tx.user.update.mock.calls[1][0];
      expect(secondCall.data.restrictedUntil).toBeDefined();
    });

    it('should throw ForbiddenError for non-participant', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);

      await expect(
        orderService.cancelOrder(1, 99),
      ).rejects.toThrow('无权取消该订单');
    });

    it('should throw BadRequestError if not in progress', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue({
        ...inProgressOrder,
        status: '已完成',
      });

      await expect(
        orderService.cancelOrder(1, 20),
      ).rejects.toThrow('当前订单状态不允许取消');
    });

    it('should throw NotFoundError if order not found', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(null);

      await expect(
        orderService.cancelOrder(999, 20),
      ).rejects.toThrow('订单不存在');
    });

    it('should throw ConflictError on version conflict in transaction', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);

      const tx = mockTx();
      tx.order.updateMany.mockResolvedValue({ count: 0 });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      await expect(
        orderService.cancelOrder(1, 20),
      ).rejects.toThrow('订单已被修改，请刷新后重试');
    });
  });

  // ── createDispute ──

  describe('createDispute', () => {
    const inProgressOrder = {
      id: 1,
      publisherId: 10,
      providerId: 20,
      status: '进行中',
      version: 1,
    };

    it('should create dispute successfully', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);
      (shared.disputeRepository.findByOrderId as any).mockResolvedValue(null);

      const tx = mockTx();
      tx.order.updateMany.mockResolvedValue({ count: 1 });
      tx.order.findUnique.mockResolvedValue({
        id: 1, demandId: 100, publisherId: 10, providerId: 20,
        status: '纠纷中', reward: 50,
        disputes: [{ id: 1, reason: '测试申诉', status: '处理中', createdAt: new Date() }],
      });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      const result = await orderService.createDispute(1, 10, '测试申诉');

      expect(result!.status).toBe('纠纷中');
      expect(tx.dispute.create).toHaveBeenCalledWith({
        data: { orderId: 1, initiatorId: 10, reason: '测试申诉' },
      });
    });

    it('should allow dispute in 待确认 status', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue({
        ...inProgressOrder,
        status: '待确认',
      });
      (shared.disputeRepository.findByOrderId as any).mockResolvedValue(null);

      const tx = mockTx();
      tx.order.updateMany.mockResolvedValue({ count: 1 });
      tx.order.findUnique.mockResolvedValue({
        id: 1, demandId: 100, publisherId: 10, providerId: 20,
        status: '纠纷中', reward: 50,
        disputes: [{ id: 1, reason: '理由', status: '处理中', createdAt: new Date() }],
      });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      const result = await orderService.createDispute(1, 20, '理由');

      expect(result!.status).toBe('纠纷中');
    });

    it('should throw ConflictError if dispute already exists', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);
      (shared.disputeRepository.findByOrderId as any).mockResolvedValue({ id: 1 });

      await expect(
        orderService.createDispute(1, 10, '理由'),
      ).rejects.toThrow('该订单已有申诉在处理中');
    });

    it('should throw ForbiddenError for non-participant', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);

      await expect(
        orderService.createDispute(1, 99, '理由'),
      ).rejects.toThrow('无权对该订单发起申诉');
    });

    it('should throw BadRequestError if order status is 已完成', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue({
        ...inProgressOrder,
        status: '已完成',
      });

      await expect(
        orderService.createDispute(1, 10, '理由'),
      ).rejects.toThrow('当前订单状态不允许发起申诉');
    });

    it('should throw NotFoundError if order not found', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(null);

      await expect(
        orderService.createDispute(999, 10, '理由'),
      ).rejects.toThrow('订单不存在');
    });

    it('should throw ConflictError on version conflict', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(inProgressOrder);
      (shared.disputeRepository.findByOrderId as any).mockResolvedValue(null);

      const tx = mockTx();
      tx.order.updateMany.mockResolvedValue({ count: 0 });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      await expect(
        orderService.createDispute(1, 10, '理由'),
      ).rejects.toThrow('订单已被修改，请刷新后重试');
    });
  });

  // ── confirmComplete ──

  describe('confirmComplete', () => {
    const pendingOrder = {
      id: 1,
      demandId: 100,
      publisherId: 10,
      providerId: 20,
      status: '待确认',
      version: 1,
    };

    it('should confirm complete successfully', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(pendingOrder);

      const tx = mockTx();
      tx.order.updateMany.mockResolvedValue({ count: 1 });
      tx.order.findUnique.mockResolvedValue({
        id: 1, demandId: 100, publisherId: 10, providerId: 20,
        status: '已完成', reward: 50, isPaid: false, completedAt: new Date(),
        demand: { id: 100, title: '测试', category: '学习辅导', status: '已完成' },
      });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      const result = await orderService.confirmComplete(1, 10);

      expect(result!.status).toBe('已完成');
      expect(tx.demand.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { status: '已完成' },
      });
    });

    it('should throw ForbiddenError if not publisher', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(pendingOrder);

      await expect(
        orderService.confirmComplete(1, 20),
      ).rejects.toThrow('只有需求方可以确认完成');
    });

    it('should throw BadRequestError if not 待确认', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue({
        ...pendingOrder,
        status: '进行中',
      });

      await expect(
        orderService.confirmComplete(1, 10),
      ).rejects.toThrow('当前订单状态不允许确认完成');
    });

    it('should throw NotFoundError if order not found', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(null);

      await expect(
        orderService.confirmComplete(999, 10),
      ).rejects.toThrow('订单不存在');
    });

    it('should throw ConflictError on version conflict', async () => {
      (shared.orderRepository.findById as any).mockResolvedValue(pendingOrder);

      const tx = mockTx();
      tx.order.updateMany.mockResolvedValue({ count: 0 });
      (shared.prisma.$transaction as any).mockImplementation((cb: Function) => cb(tx));

      await expect(
        orderService.confirmComplete(1, 10),
      ).rejects.toThrow('订单已被修改，请刷新后重试');
    });
  });
});
