import { demandRepository, demandImageRepository, NotFoundError, ForbiddenError, ConflictError, resolvePublisher } from '@campushub/shared';
import type { DemandFilter } from '@campushub/shared';
import { DemandCategory, DemandStatus } from '@prisma/client';

export const demandService = {
  async createDemand(
    userId: number,
    data: {
      title: string;
      description: string;
      category: string;
      location?: string;
      expectedTime?: Date;
      reward: number;
      isUrgent?: boolean;
      isAnonymous?: boolean;
      images?: { url: string; sortOrder: number }[];
    },
  ) {
    const createData = {
      publisher: { connect: { id: userId } },
      title: data.title,
      description: data.description,
      category: data.category as DemandCategory,
      location: data.location,
      expectedTime: data.expectedTime,
      reward: data.reward,
      isUrgent: data.isUrgent ?? false,
      isAnonymous: data.isAnonymous ?? false,
    };
    const demand = await demandRepository.create(createData);

    if (data.images && data.images.length > 0) {
      const imageData = data.images.map((img) => ({
        demandId: demand.id,
        url: img.url,
        sortOrder: img.sortOrder,
      }));
      await demandImageRepository.createMany(imageData);
    }

    return demandRepository.findById(demand.id);
  },

  async getDemandList(filter: DemandFilter) {
    return demandRepository.findMany(filter);
  },

  async getDemandDetail(id: number, currentUserId?: number) {
    const demand = await demandRepository.findById(id);
    if (!demand) {
      throw new NotFoundError('需求不存在');
    }

    if (demand.isAnonymous) {
      const resolved = await resolvePublisher(
        { id: demand.id, publisherId: demand.publisherId, isAnonymous: demand.isAnonymous },
        currentUserId,
      );
      if (resolved) {
        demand.publisher = resolved;
      }
    }

    return demand;
  },

  async updateDemand(
    id: number,
    userId: number,
    version: number,
    data: {
      title?: string;
      description?: string;
      category?: string;
      location?: string;
      expectedTime?: Date;
      reward?: number;
      isUrgent?: boolean;
      isAnonymous?: boolean;
      images?: { url: string; sortOrder: number }[];
    },
  ) {
    const demand = await demandRepository.findById(id);
    if (!demand) {
      throw new NotFoundError('需求不存在');
    }

    if (demand.publisherId !== userId) {
      throw new ForbiddenError('只能修改自己的需求');
    }

    if (demand.status !== DemandStatus['开放']) {
      throw new ForbiddenError('只能修改开放状态的需求');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category as DemandCategory;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.expectedTime !== undefined) updateData.expectedTime = data.expectedTime;
    if (data.reward !== undefined) updateData.reward = data.reward;
    if (data.isUrgent !== undefined) updateData.isUrgent = data.isUrgent;
    if (data.isAnonymous !== undefined) updateData.isAnonymous = data.isAnonymous;

    const count = await demandRepository.updateWithVersion(id, version, updateData);
    if (count === 0) {
      throw new ConflictError('需求已被修改，请刷新后重试');
    }

    if (data.images !== undefined) {
      await demandImageRepository.deleteByDemandId(id);
      if (data.images.length > 0) {
        const imageData = data.images.map((img) => ({
          demandId: id,
          url: img.url,
          sortOrder: img.sortOrder,
        }));
        await demandImageRepository.createMany(imageData);
      }
    }

    return demandRepository.findById(id);
  },

  async deleteDemand(id: number, userId: number) {
    const demand = await demandRepository.findById(id);
    if (!demand) {
      throw new NotFoundError('需求不存在');
    }

    if (demand.publisherId !== userId) {
      throw new ForbiddenError('只能删除自己的需求');
    }

    if (demand.status !== DemandStatus['开放']) {
      throw new ForbiddenError('只能删除开放状态的需求');
    }

    await demandRepository.delete(id);
  },
};
