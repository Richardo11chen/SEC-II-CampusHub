import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@campushub/shared', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  messageRepository: {
    findByOrderId: vi.fn(),
    create: vi.fn(),
  },
  notifyNewMessage: vi.fn(),
  NotFoundError: class extends Error {
    statusCode = 404;
    constructor(message = '资源不存在') { super(message); }
  },
  ForbiddenError: class extends Error {
    statusCode = 403;
    constructor(message = '权限不足') { super(message); }
  },
}));

import { messageService } from '../service/message-service.js';

const shared = await import('@campushub/shared');

describe('messageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMessages', () => {
    it('should return messages for publisher', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue({
        publisherId: 1,
        providerId: 2,
      });
      (shared.messageRepository.findByOrderId as any).mockResolvedValue({
        items: [{ id: 1, content: 'hello' }],
        total: 1,
      });

      const result = await messageService.getMessages(1, 100, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return messages for provider', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue({
        publisherId: 1,
        providerId: 2,
      });
      (shared.messageRepository.findByOrderId as any).mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await messageService.getMessages(2, 100, 1, 20);

      expect(result.total).toBe(0);
    });

    it('should throw ForbiddenError for non-participant', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue({
        publisherId: 1,
        providerId: 2,
      });

      await expect(
        messageService.getMessages(99, 100, 1, 20),
      ).rejects.toThrow('无权查看该订单的消息');
    });

    it('should throw NotFoundError if order not found', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(null);

      await expect(
        messageService.getMessages(1, 999, 1, 20),
      ).rejects.toThrow('订单不存在');
    });
  });

  describe('sendMessage', () => {
    it('should send message as publisher', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue({
        publisherId: 1,
        providerId: 2,
      });
      (shared.messageRepository.create as any).mockResolvedValue({
        id: 1,
        orderId: 100,
        senderId: 1,
        contentType: 'text',
        content: '你好',
      });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ nickname: '小明' });
      (shared.notifyNewMessage as any).mockResolvedValue(undefined);

      const result = await messageService.sendMessage(1, {
        orderId: 100,
        content: '你好',
      });

      expect(result.content).toBe('你好');
      expect(shared.messageRepository.create).toHaveBeenCalledWith({
        orderId: 100,
        senderId: 1,
        contentType: 'text',
        content: '你好',
      });
    });

    it('should send message as provider and notify publisher', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue({
        publisherId: 1,
        providerId: 2,
      });
      (shared.messageRepository.create as any).mockResolvedValue({
        id: 2,
        orderId: 100,
        senderId: 2,
        contentType: 'text',
        content: '收到',
      });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ nickname: '服务者' });
      (shared.notifyNewMessage as any).mockResolvedValue(undefined);

      await messageService.sendMessage(2, {
        orderId: 100,
        content: '收到',
      });

      expect(shared.notifyNewMessage).toHaveBeenCalledWith(100, 1, '服务者');
    });

    it('should throw ForbiddenError for non-participant', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue({
        publisherId: 1,
        providerId: 2,
      });

      await expect(
        messageService.sendMessage(99, { orderId: 100, content: 'spam' }),
      ).rejects.toThrow('无权向该订单发送消息');
    });

    it('should throw NotFoundError if order not found', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue(null);

      await expect(
        messageService.sendMessage(1, { orderId: 999, content: 'test' }),
      ).rejects.toThrow('订单不存在');
    });

    it('should default contentType to text', async () => {
      (shared.prisma.order.findUnique as any).mockResolvedValue({
        publisherId: 1,
        providerId: 2,
      });
      (shared.messageRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.prisma.user.findUnique as any).mockResolvedValue({ nickname: 'test' });
      (shared.notifyNewMessage as any).mockResolvedValue(undefined);

      await messageService.sendMessage(1, {
        orderId: 100,
        content: 'test',
      });

      expect(shared.messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'text' }),
      );
    });
  });
});
