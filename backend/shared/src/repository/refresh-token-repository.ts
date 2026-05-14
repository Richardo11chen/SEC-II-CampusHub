import prisma from '../utils/prisma.js';

export const refreshTokenRepository = {
  async create(data: { userId: number; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  },

  async findValidToken(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  },

  async revoke(id: number) {
    return prisma.refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  },

  async revokeAllForUser(userId: number) {
    return prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  },

  async deleteExpired() {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  },
};
