import prisma from '../utils/prisma.js';
import { Prisma, DemandCategory, DemandStatus } from '@prisma/client';

const demandListSelect = {
  id: true,
  title: true,
  category: true,
  location: true,
  reward: true,
  status: true,
  isUrgent: true,
  isAnonymous: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  publisher: {
    select: {
      id: true,
      nickname: true,
      avatar: true,
      creditScore: true,
    },
  },
} as const;

const demandDetailSelect = {
  id: true,
  publisherId: true,
  title: true,
  description: true,
  category: true,
  location: true,
  expectedTime: true,
  reward: true,
  status: true,
  isUrgent: true,
  isAnonymous: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  publisher: {
    select: {
      id: true,
      nickname: true,
      avatar: true,
      creditScore: true,
    },
  },
  images: {
    select: {
      id: true,
      url: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

export interface DemandFilter {
  category?: DemandCategory;
  status?: DemandStatus;
  keyword?: string;
  sortBy?: 'newest' | 'oldest' | 'reward_high' | 'reward_low';
  isUrgent?: boolean;
  page: number;
  pageSize: number;
}

export const demandRepository = {
  async create(data: Prisma.DemandCreateInput) {
    return prisma.demand.create({ data });
  },

  async findById(id: number) {
    return prisma.demand.findUnique({
      select: demandDetailSelect,
      where: { id },
    });
  },

  async findMany(filter: DemandFilter) {
    const { category, status, keyword, sortBy, isUrgent, page, pageSize } = filter;
    const where: Prisma.DemandWhereInput = {};
    const orderBy: Prisma.DemandOrderByWithRelationInput[] = [];

    if (category) where.category = category;
    if (status) where.status = status;
    if (isUrgent !== undefined) where.isUrgent = isUrgent;

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    switch (sortBy) {
      case 'oldest':
        orderBy.push({ createdAt: 'asc' });
        break;
      case 'reward_high':
        orderBy.push({ reward: 'desc' });
        break;
      case 'reward_low':
        orderBy.push({ reward: 'asc' });
        break;
      case 'newest':
      default:
        orderBy.push({ createdAt: 'desc' });
        break;
    }

    const [items, total] = await Promise.all([
      prisma.demand.findMany({
        select: demandListSelect,
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.demand.count({ where }),
    ]);

    return { items, total };
  },

  async update(id: number, data: Prisma.DemandUpdateInput) {
    return prisma.demand.update({
      where: { id },
      data,
      select: demandDetailSelect,
    });
  },

  async delete(id: number) {
    return prisma.demand.delete({ where: { id } });
  },

  async updateWithVersion(id: number, version: number, data: Prisma.DemandUpdateInput) {
    const result = await prisma.demand.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    return result.count;
  },
};
