import prisma from '../utils/prisma.js';

export const reviewRepository = {
  async create(data: { orderId: number; fromUserId: number; toUserId: number; rating: number; content?: string }) {
    return prisma.review.create({ data });
  },

  async findByOrderAndUser(orderId: number, fromUserId: number) {
    return prisma.review.findUnique({
      where: { uk_order_from_user: { orderId, fromUserId } },
    });
  },

  async findByToUser(toUserId: number, page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where: { toUserId },
        include: {
          fromUser: { select: { id: true, nickname: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.review.count({ where: { toUserId } }),
    ]);
    return { items, total };
  },

  async getStats(toUserId: number) {
    const [aggregate, count] = await Promise.all([
      prisma.review.aggregate({
        where: { toUserId },
        _avg: { rating: true },
        _count: true,
      }),
      prisma.review.count({ where: { toUserId } }),
    ]);
    return {
      averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
      totalReviews: count,
    };
  },
};
