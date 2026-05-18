import { notificationRepository, NotFoundError } from '@campushub/shared';

export const notificationService = {
  async getNotifications(userId: number, page: number, pageSize: number) {
    const { items, total, unreadCount } = await notificationRepository.findByUser(userId, page, pageSize);
    return { items, total, unreadCount, page, pageSize };
  },

  async markAsRead(id: number, userId: number) {
    const result = await notificationRepository.markRead(id, userId);
    if (!result) throw new NotFoundError('通知不存在');
    return result;
  },
};
