import prisma from '../utils/prisma.js';

export const messageRepository = {
  async findByOrderId(orderId: number, page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where: { orderId },
        include: {
          sender: { select: { id: true, nickname: true, avatar: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.message.count({ where: { orderId } }),
    ]);
    return { items, total };
  },

  async create(data: { orderId: number; senderId: number; contentType: string; content: string }) {
    return prisma.message.create({
      data,
      include: {
        sender: { select: { id: true, nickname: true, avatar: true } },
      },
    });
  },
};
