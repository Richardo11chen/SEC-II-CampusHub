import prisma from '../utils/prisma.js';

export const noShowRecordRepository = {
  async create(data: { userId: number; orderId: number }) {
    return prisma.noShowRecord.create({ data });
  },

  async countByUserIdSince(userId: number, since: Date) {
    return prisma.noShowRecord.count({
      where: {
        userId,
        createdAt: { gte: since },
      },
    });
  },
};
