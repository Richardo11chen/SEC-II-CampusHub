import { OrderStatus, DemandStatus } from '@prisma/client';
import { orderRepository, demandRepository, userRepository, prisma, NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '@campushub/shared';
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
