import {
  prisma,
  maskPhone,
  encryptPhone,
  decryptPhone,
  reviewRepository,
} from '@campushub/shared';

export const userService = {
  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        studentId: true,
        nickname: true,
        name: true,
        college: true,
        phoneEncrypted: true,
        email: true,
        avatar: true,
        creditScore: true,
        role: true,
        showRealName: true,
        createdAt: true,
      },
    });

    if (!user) return null;

    const phone = user.phoneEncrypted
      ? maskPhone(decryptPhone(user.phoneEncrypted))
      : undefined;

    return {
      id: user.id,
      studentId: maskStudentId(user.studentId),
      nickname: user.nickname,
      name: user.name,
      college: user.college,
      phone,
      email: user.email,
      avatar: user.avatar,
      creditScore: user.creditScore,
      role: user.role,
      showRealName: user.showRealName,
      createdAt: user.createdAt,
    };
  },

  async updateProfile(
    userId: number,
    data: {
      nickname?: string;
      avatar?: string;
      college?: string;
      phone?: string;
      showRealName?: boolean;
    },
  ) {
    const updateData: Record<string, unknown> = {};

    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.college !== undefined) updateData.college = data.college;
    if (data.phone !== undefined) updateData.phoneEncrypted = encryptPhone(data.phone);
    if (data.showRealName !== undefined) updateData.showRealName = data.showRealName;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.getProfile(userId);
  },

  async getPublicProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        name: true,
        college: true,
        avatar: true,
        creditScore: true,
        showRealName: true,
        createdAt: true,
      },
    });
    if (!user) return null;

    const [orderCount, reviewStats] = await Promise.all([
      prisma.order.count({ where: { providerId: userId, status: '已完成' } }),
      reviewRepository.getStats(userId),
    ]);

    return {
      id: user.id,
      nickname: user.nickname,
      name: user.showRealName ? user.name : null,
      college: user.college,
      avatar: user.avatar,
      creditScore: user.creditScore,
      totalOrders: orderCount,
      averageRating: reviewStats.averageRating,
      totalReviews: reviewStats.totalReviews,
      joinedAt: user.createdAt,
    };
  },

  async getUserReviews(userId: number, page: number, pageSize: number) {
    const { items, total } = await reviewRepository.findByToUser(userId, page, pageSize);
    return { items, total, page, pageSize };
  },
};

function maskStudentId(studentId: string): string {
  if (studentId.length !== 10) return studentId;
  return studentId.slice(0, 4) + '*****' + studentId.slice(-3);
}
