import prisma from '../utils/prisma.js';

export const disputeRepository = {
  async create(data: { orderId: number; initiatorId: number; reason: string }) {
    return prisma.dispute.create({ data });
  },

  async findByOrderId(orderId: number) {
    return prisma.dispute.findUnique({ where: { orderId } });
  },
};
