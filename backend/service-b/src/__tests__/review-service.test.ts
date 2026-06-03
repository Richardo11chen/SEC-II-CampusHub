import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@campushub/shared', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  reviewRepository: {
    findByOrderAndUser: vi.fn(),
    create: vi.fn(),
  },
  notifyReviewReceived: vi.fn(),
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
  NotFoundError: class extends Error {
    statusCode = 404;
    constructor(message = '资源不存在') { super(message); }
  },
}));

import { reviewService } from '../service/review-service.js';

const shared = await import('@campushub/shared');

describe('reviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReview', () => {
    const baseOrder = {
      id: 1,
      status: '已完成',
      publisherId: 10,
      providerId: 20,
      demand: { title: '测试需求' },
    };

    it('should create 5-star review and add +3 credit', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);
      (shared.reviewRepository.findByOrderAndUser as any).mockResolvedValue(null);
      (shared.reviewRepository.create as any).mockResolvedValue({
        id: 1,
        orderId: 1,
        fromUserId: 10,
        toUserId: 20,
        rating: 5,
        content: null,
      });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ creditScore: 70 });
      (shared.notifyReviewReceived as any).mockResolvedValue(undefined);

      await reviewService.createReview(10, { orderId: 1, rating: 5 });

      expect(shared.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { creditScore: 73 },
      });
    });

    it('should create 4-star review and add +1 credit', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);
      (shared.reviewRepository.findByOrderAndUser as any).mockResolvedValue(null);
      (shared.reviewRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ creditScore: 70 });
      (shared.notifyReviewReceived as any).mockResolvedValue(undefined);

      await reviewService.createReview(10, { orderId: 1, rating: 4 });

      expect(shared.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { creditScore: 71 },
      });
    });

    it('should create 3-star review and not change credit (delta=0)', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);
      (shared.reviewRepository.findByOrderAndUser as any).mockResolvedValue(null);
      (shared.reviewRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.notifyReviewReceived as any).mockResolvedValue(undefined);

      await reviewService.createReview(10, { orderId: 1, rating: 3 });

      // delta=0: user.update NOT called, but findUnique IS called for nickname lookup in notification
      expect(shared.prisma.user.update).not.toHaveBeenCalled();
    });

    it('should create 2-star review and deduct -5 credit', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);
      (shared.reviewRepository.findByOrderAndUser as any).mockResolvedValue(null);
      (shared.reviewRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ creditScore: 50 });
      (shared.notifyReviewReceived as any).mockResolvedValue(undefined);

      await reviewService.createReview(10, { orderId: 1, rating: 2 });

      expect(shared.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { creditScore: 45 },
      });
    });

    it('should create 1-star review and deduct -5 credit', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);
      (shared.reviewRepository.findByOrderAndUser as any).mockResolvedValue(null);
      (shared.reviewRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ creditScore: 10 });
      (shared.notifyReviewReceived as any).mockResolvedValue(undefined);

      await reviewService.createReview(10, { orderId: 1, rating: 1 });

      expect(shared.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { creditScore: 5 },
      });
    });

    it('should clamp credit to 0 (not negative)', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);
      (shared.reviewRepository.findByOrderAndUser as any).mockResolvedValue(null);
      (shared.reviewRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ creditScore: 3 });
      (shared.notifyReviewReceived as any).mockResolvedValue(undefined);

      await reviewService.createReview(10, { orderId: 1, rating: 2 });

      expect(shared.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { creditScore: 0 },
      });
    });

    it('should clamp credit to 100 (max)', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);
      (shared.reviewRepository.findByOrderAndUser as any).mockResolvedValue(null);
      (shared.reviewRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ creditScore: 99 });
      (shared.notifyReviewReceived as any).mockResolvedValue(undefined);

      await reviewService.createReview(10, { orderId: 1, rating: 5 });

      expect(shared.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { creditScore: 100 },
      });
    });

    it('should throw BadRequestError if order not completed', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue({
        ...baseOrder,
        status: '进行中',
      });

      await expect(
        reviewService.createReview(10, { orderId: 1, rating: 5 }),
      ).rejects.toThrow('订单未完成');
    });

    it('should throw ForbiddenError if not a participant', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);

      await expect(
        reviewService.createReview(99, { orderId: 1, rating: 5 }),
      ).rejects.toThrow('你不是该订单的参与者');
    });

    it('should throw ConflictError on duplicate review', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);
      (shared.reviewRepository.findByOrderAndUser as any).mockResolvedValue({ id: 99 });

      await expect(
        reviewService.createReview(10, { orderId: 1, rating: 5 }),
      ).rejects.toThrow('你已评价过该订单');
    });

    it('should throw NotFoundError if order not found', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(null);

      await expect(
        reviewService.createReview(10, { orderId: 999, rating: 5 }),
      ).rejects.toThrow('订单不存在');
    });

    it('should let provider review publisher', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(baseOrder);
      (shared.reviewRepository.findByOrderAndUser as any).mockResolvedValue(null);
      (shared.reviewRepository.create as any).mockResolvedValue({
        id: 2,
        orderId: 1,
        fromUserId: 20,
        toUserId: 10,
        rating: 5,
        content: null,
      });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ creditScore: 70 });
      (shared.notifyReviewReceived as any).mockResolvedValue(undefined);

      const result = await reviewService.createReview(20, { orderId: 1, rating: 5 });

      expect(result.fromUserId).toBe(20);
      expect(result.toUserId).toBe(10);
    });
  });
});
