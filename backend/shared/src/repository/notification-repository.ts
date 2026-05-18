import prisma from '../utils/prisma.js';

export const notificationRepository = {
  async create(data: { userId: number; type: string; title: string; content: string; relatedId?: number }) {
    return prisma.notification.create({ data });
  },

  async findByUser(userId: number, page: number, pageSize: number) {
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unreadCount };
  },

  async markRead(id: number, userId: number) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) return null;
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  },
};
