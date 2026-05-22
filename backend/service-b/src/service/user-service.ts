import {
  prisma,
  maskPhone,
  encryptPhone,
  decryptPhone,
  reviewRepository,
  userRepository,
} from '@campushub/shared';
import { BadRequestError } from '@campushub/shared';

const RATE_LIMITED_FIELDS = ['college', 'phone', 'name', 'email'] as const;
const MAX_CHANGES_PER_FIELD = 3;

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
      name?: string;
      email?: string;
    },
  ) {
    // 对受限字段检查修改次数
    for (const field of RATE_LIMITED_FIELDS) {
      if (data[field] !== undefined) {
        const count = await userRepository.countRecentModifications(userId, field);
        if (count >= MAX_CHANGES_PER_FIELD) {
          const fieldLabels: Record<string, string> = { college: '学院', phone: '手机号', name: '真实姓名', email: '邮箱' };
          throw new BadRequestError(`${fieldLabels[field] || field}近6个月修改已达上限(${MAX_CHANGES_PER_FIELD}次)`);
        }
      }
    }

    const updateData: Record<string, unknown> = {};

    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.college !== undefined) updateData.college = data.college;
    if (data.phone !== undefined) updateData.phoneEncrypted = encryptPhone(data.phone);
    if (data.showRealName !== undefined) updateData.showRealName = data.showRealName;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 记录受限字段的修改日志
    for (const field of RATE_LIMITED_FIELDS) {
      if (data[field] !== undefined) {
        const newValue = field === 'phone' ? data.phone : (data[field] as string | undefined);
        await userRepository.logModification(userId, field, undefined, newValue);
      }
    }

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
