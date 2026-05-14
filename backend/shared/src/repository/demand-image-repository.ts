import prisma from '../utils/prisma.js';

export const demandImageRepository = {
  async createMany(data: { demandId: number; url: string; sortOrder: number }[]) {
    if (data.length === 0) return [];
    return prisma.demandImage.createMany({ data });
  },

  async deleteByDemandId(demandId: number) {
    return prisma.demandImage.deleteMany({ where: { demandId } });
  },

  async findByDemandId(demandId: number) {
    return prisma.demandImage.findMany({
      where: { demandId },
      orderBy: { sortOrder: 'asc' },
    });
  },
};
