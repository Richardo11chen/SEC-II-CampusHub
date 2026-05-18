import {
  prisma,
  reviewRepository,
  notifyReviewReceived,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  NotFoundError,
} from '@campushub/shared';

const CREDIT_DELTA: Record<number, number> = { 5: 3, 4: 1, 3: 0, 2: -5, 1: -5 };

export const reviewService = {
  async createReview(userId: number, data: { orderId: number; rating: number; content?: string }) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { id: true, status: true, publisherId: true, providerId: true, demand: { select: { title: true } } },
    });

    if (!order) throw new NotFoundError('订单不存在');
    if (order.status !== '已完成') throw new BadRequestError('订单未完成，不可评价');

    const isPublisher = order.publisherId === userId;
    const isProvider = order.providerId === userId;
    if (!isPublisher && !isProvider) throw new ForbiddenError('你不是该订单的参与者');

    const existing = await reviewRepository.findByOrderAndUser(data.orderId, userId);
    if (existing) throw new ConflictError('你已评价过该订单');

    const toUserId = isPublisher ? order.providerId : order.publisherId;

    const review = await reviewRepository.create({
      orderId: data.orderId,
      fromUserId: userId,
      toUserId,
      rating: data.rating,
      content: data.content,
    });

    const delta = CREDIT_DELTA[data.rating] ?? 0;
    if (delta !== 0) {
      const user = await prisma.user.findUnique({ where: { id: toUserId }, select: { creditScore: true } });
      if (user) {
        const newScore = Math.max(0, Math.min(100, user.creditScore + delta));
        await prisma.user.update({ where: { id: toUserId }, data: { creditScore: newScore } });
      }
    }

    const fromUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    await notifyReviewReceived(data.orderId, toUserId, fromUser?.nickname ?? '用户', data.rating);

    return review;
  },
};
