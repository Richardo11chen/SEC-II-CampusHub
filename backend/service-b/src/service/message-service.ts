import {
  prisma,
  messageRepository,
  NotFoundError,
  ForbiddenError,
  notifyNewMessage,
} from '@campushub/shared';

export const messageService = {
  async getMessages(userId: number, orderId: number, page: number, pageSize: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { publisherId: true, providerId: true },
    });

    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    if (order.publisherId !== userId && order.providerId !== userId) {
      throw new ForbiddenError('无权查看该订单的消息');
    }

    const { items, total } = await messageRepository.findByOrderId(orderId, page, pageSize);
    return { items, total };
  },

  async sendMessage(userId: number, data: { orderId: number; contentType?: string; content: string }) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { publisherId: true, providerId: true },
    });

    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    if (order.publisherId !== userId && order.providerId !== userId) {
      throw new ForbiddenError('无权向该订单发送消息');
    }

    const message = await messageRepository.create({
      orderId: data.orderId,
      senderId: userId,
      contentType: data.contentType || 'text',
      content: data.content,
    });

    // 给接收方创建消息通知
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });
    const recipientId = order.publisherId === userId ? order.providerId : order.publisherId;
    await notifyNewMessage(data.orderId, recipientId, sender?.nickname || '未知用户');

    return message;
  },
};
