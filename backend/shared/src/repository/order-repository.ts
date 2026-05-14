import prisma from '../utils/prisma.js';
import { Prisma, OrderStatus } from '@prisma/client';

const orderListSelect = {
  id: true,
  demandId: true,
  publisherId: true,
  providerId: true,
  status: true,
  reward: true,
  isPaid: true,
  version: true,
  message: true,
  createdAt: true,
  completedAt: true,
  demand: {
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
    },
  },
} as const;

const orderDetailSelect = {
  id: true,
  demandId: true,
  publisherId: true,
  providerId: true,
  status: true,
  reward: true,
  isPaid: true,
  version: true,
  message: true,
  createdAt: true,
  completedAt: true,
  cancelledAt: true,
  cancelReason: true,
  demand: {
    select: {
      id: true,
      title: true,
      category: true,
      location: true,
      status: true,
    },
  },
  publisher: {
    select: {
      id: true,
      nickname: true,
      avatar: true,
      creditScore: true,
    },
  },
  provider: {
    select: {
      id: true,
      nickname: true,
      avatar: true,
      creditScore: true,
    },
  },
} as const;

export interface OrderFilter {
  role?: 'publisher' | 'provider';
  status?: OrderStatus;
  userId: number;
  page: number;
  pageSize: number;
}

export const orderRepository = {
  async create(data: Prisma.OrderCreateInput) {
    return prisma.order.create({ data });
  },

  async findById(id: number) {
    return prisma.order.findUnique({
      select: orderDetailSelect,
      where: { id },
    });
  },

  async findManyByUser(filter: OrderFilter) {
    const { role, status, userId, page, pageSize } = filter;
    const where: Prisma.OrderWhereInput = {};

    if (role === 'publisher') {
      where.publisherId = userId;
    } else if (role === 'provider') {
      where.providerId = userId;
    } else {
      where.OR = [{ publisherId: userId }, { providerId: userId }];
    }

    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        select: orderListSelect,
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return { items, total };
  },

  async update(id: number, data: Prisma.OrderUpdateInput) {
    return prisma.order.update({
      where: { id },
      data,
      select: orderDetailSelect,
    });
  },

  async updateWithVersion(id: number, version: number, data: Prisma.OrderUpdateInput) {
    const result = await prisma.order.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    return result.count;
  },

  async findByDemandId(demandId: number) {
    return prisma.order.findUnique({
      where: { demandId },
    });
  },
};
