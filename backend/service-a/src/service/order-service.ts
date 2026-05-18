import { OrderStatus, DemandStatus } from '@prisma/client';
import { orderRepository, demandRepository, userRepository, disputeRepository, noShowRecordRepository, prisma, NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '@campushub/shared';
import type { OrderFilter } from '@campushub/shared';

export const orderService = {
  async takeOrder(demandId: number, userId: number) {
    const demand = await demandRepository.findById(demandId);
    if (!demand) {
      throw new NotFoundError('需求不存在');
    }

    if (demand.publisherId === userId) {
      throw new BadRequestError('不能接自己的需求');
    }

    if (demand.status !== DemandStatus['开放']) {
      throw new BadRequestError('该需求已不再开放');
    }

    const existingOrder = await orderRepository.findByDemandId(demandId);
    if (existingOrder) {
      throw new ConflictError('该需求已被接单');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    if (user.creditScore < 40) {
      throw new ForbiddenError('信用分不足40，无法接单');
    }

    if (user.restrictedUntil && user.restrictedUntil > new Date()) {
      throw new ForbiddenError(`因频繁爽约，您已被限制接单，截止时间：${user.restrictedUntil.toLocaleString('zh-CN')}`);
    }

    const order = await prisma.$transaction(async (tx) => {
      const demandForUpdate = await tx.demand.findUnique({
        where: { id: demandId },
        select: { id: true, status: true, version: true },
      });

      if (!demandForUpdate || demandForUpdate.status !== DemandStatus['开放']) {
        throw new ConflictError('需求状态已变更');
      }

      const updated = await tx.demand.updateMany({
        where: { id: demandId, version: demandForUpdate.version },
        data: {
          status: DemandStatus['进行中'],
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictError('需求已被修改，请刷新后重试');
      }

      return tx.order.create({
        data: {
          demandId,
          publisherId: demand.publisherId,
          providerId: userId,
          status: OrderStatus['进行中'],
          reward: demand.reward,
        },
        select: {
          id: true,
          demandId: true,
          publisherId: true,
          providerId: true,
          status: true,
          reward: true,
          createdAt: true,
          demand: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
            },
          },
        },
      });
    });

    return order;
  },

  async getOrderList(filter: OrderFilter) {
    return orderRepository.findManyByUser(filter);
  },

  async getOrderDetail(orderId: number, userId: number) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    if (order.publisherId !== userId && order.providerId !== userId) {
      throw new ForbiddenError('无权查看该订单');
    }

    return order;
  },

  async submitComplete(orderId: number, userId: number) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    if (order.providerId !== userId) {
      throw new ForbiddenError('只有服务方可以提交完成');
    }

    if (order.status !== OrderStatus['进行中']) {
      throw new BadRequestError('当前订单状态不允许提交完成');
    }

    const count = await orderRepository.updateWithVersion(orderId, order.version, {
      status: OrderStatus['待确认'],
    });

    if (count === 0) {
      throw new ConflictError('订单已被修改，请刷新后重试');
    }

    return orderRepository.findById(orderId);
  },

  async cancelOrder(orderId: number, userId: number, cancelReason?: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    if (order.publisherId !== userId && order.providerId !== userId) {
      throw new ForbiddenError('无权取消该订单');
    }

    if (order.status !== OrderStatus['进行中']) {
      throw new BadRequestError('当前订单状态不允许取消');
    }

    const isProviderCancel = userId === order.providerId;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.order.updateMany({
        where: { id: orderId, version: order.version },
        data: {
          status: OrderStatus['已取消'],
          cancelledAt: now,
          cancelledBy: isProviderCancel ? 'provider' : 'publisher',
          cancelReason: cancelReason || null,
          version: { increment: 1 },
        },
      });

      if (count.count === 0) {
        throw new ConflictError('订单已被修改，请刷新后重试');
      }

      await tx.demand.update({
        where: { id: order.demandId },
        data: { status: DemandStatus['开放'] },
      });

      if (isProviderCancel) {
        // 服务方爽约：扣信用分10分
        await tx.user.update({
          where: { id: order.providerId, creditScore: { gte: 10 } },
          data: { creditScore: { decrement: 10 } },
        });

        // 记录爽约
        await tx.noShowRecord.create({
          data: { userId: order.providerId, orderId },
        });

        // 30天内累计>=3次 → 限制接单15天
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const noShowCount = await tx.noShowRecord.count({
          where: {
            userId: order.providerId,
            createdAt: { gte: thirtyDaysAgo },
          },
        });

        if (noShowCount >= 3) {
          const restrictedUntil = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
          await tx.user.update({
            where: { id: order.providerId },
            data: { restrictedUntil },
          });
        }
      }

      return tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          demandId: true,
          publisherId: true,
          providerId: true,
          status: true,
          reward: true,
          cancelledAt: true,
          cancelledBy: true,
          cancelReason: true,
          demand: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
            },
          },
        },
      });
    });

    return result;
  },

  async createDispute(orderId: number, userId: number, reason: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    if (order.publisherId !== userId && order.providerId !== userId) {
      throw new ForbiddenError('无权对该订单发起申诉');
    }

    if (order.status !== OrderStatus['进行中'] && order.status !== OrderStatus['待确认']) {
      throw new BadRequestError('当前订单状态不允许发起申诉');
    }

    const existing = await disputeRepository.findByOrderId(orderId);
    if (existing) {
      throw new ConflictError('该订单已有申诉在处理中');
    }

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.order.updateMany({
        where: { id: orderId, version: order.version },
        data: {
          status: OrderStatus['纠纷中'],
          version: { increment: 1 },
        },
      });

      if (count.count === 0) {
        throw new ConflictError('订单已被修改，请刷新后重试');
      }

      await tx.dispute.create({
        data: {
          orderId,
          initiatorId: userId,
          reason,
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          demandId: true,
          publisherId: true,
          providerId: true,
          status: true,
          reward: true,
          disputes: {
            select: {
              id: true,
              reason: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });
    });

    return result;
  },

  async confirmComplete(orderId: number, userId: number) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    if (order.publisherId !== userId) {
      throw new ForbiddenError('只有需求方可以确认完成');
    }

    if (order.status !== OrderStatus['待确认']) {
      throw new BadRequestError('当前订单状态不允许确认完成');
    }

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.order.updateMany({
        where: { id: orderId, version: order.version },
        data: {
          status: OrderStatus['已完成'],
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (count.count === 0) {
        throw new ConflictError('订单已被修改，请刷新后重试');
      }

      await tx.demand.update({
        where: { id: order.demandId },
        data: { status: DemandStatus['已完成'] },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          demandId: true,
          publisherId: true,
          providerId: true,
          status: true,
          reward: true,
          isPaid: true,
          completedAt: true,
          demand: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
            },
          },
        },
      });
    });

    return result;
  },
};
