import { prisma, NotFoundError, ConflictError, ForbiddenError } from '@campushub/shared';

export const adminService = {
  // ── 用户管理 ──
  async getUserList(params: { keyword?: string; status?: string; page: number; pageSize: number }) {
    const { keyword, status, page, pageSize } = params;
    const where: any = {};
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { studentId: { contains: keyword } },
        { nickname: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, studentId: true, nickname: true, name: true,
          college: true, email: true, creditScore: true,
          status: true, role: true, createdAt: true, lastLoginAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },

  async setUserStatus(userId: number, action: 'disable' | 'enable') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('用户不存在');
    if (user.role === 'admin') throw new ForbiddenError('不能操作管理员账号');
    const status = action === 'disable' ? '已禁用' : '正常';
    await prisma.user.update({ where: { id: userId }, data: { status } });
    return { message: action === 'disable' ? '用户已禁用' : '用户已启用' };
  },

  // ── 需求管理 ──
  async getDemandList(params: { status?: string; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where: any = {};
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      prisma.demand.findMany({
        where,
        include: { publisher: { select: { id: true, nickname: true, studentId: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.demand.count({ where }),
    ]);
    return { items, total };
  },

  async deleteDemand(demandId: number, reason?: string) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) throw new NotFoundError('需求不存在');
    await prisma.demand.update({
      where: { id: demandId },
      data: { status: '已关闭' },
    });
    // Log the deletion reason if provided — we simply close the demand
    return { message: '需求已下架' };
  },

  // ── 统计看板 ──
  async getStatistics() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalUsers, totalOrders, completedOrders, pendingDisputes, dailyActive, dailyNew] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: '已完成' } }),
      prisma.dispute.count({ where: { status: '待处理' } }),
      prisma.user.count({ where: { lastLoginAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    // Category distribution
    const demands = await prisma.demand.groupBy({
      by: ['category'],
      _count: true,
    });
    const categoryDistribution: Record<string, number> = {};
    for (const d of demands) {
      categoryDistribution[d.category] = d._count;
    }

    // Last 7 days new users
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });
    const dailyMap: Record<string, number> = {};
    for (const u of recentUsers) {
      const day = u.createdAt.toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }
    const dailyNewUsers = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    return {
      totalUsers,
      dailyActiveUsers: dailyActive,
      totalOrders,
      completedOrders,
      pendingDisputes,
      categoryDistribution,
      dailyNewUsers,
    };
  },

  // ── 纠纷处理 ──
  async getDisputeList(params: { status?: string; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where: any = {};
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          order: { select: { id: true, demandId: true } },
          initiator: { select: { id: true, nickname: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.dispute.count({ where }),
    ]);
    return { items, total };
  },

  async resolveDispute(disputeId: number, data: { resolution: string; action: string }) {
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundError('纠纷不存在');
    if (dispute.status !== '待处理') throw new ConflictError('该纠纷已处理');

    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: '已处理',
        resolution: data.resolution,
        resolvedAt: new Date(),
      },
    });

    // Update order based on action
    if (data.action === 'complete') {
      await prisma.order.update({ where: { id: dispute.orderId }, data: { status: '已完成' } });
    } else if (data.action === 'cancel') {
      await prisma.order.update({ where: { id: dispute.orderId }, data: { status: '已取消' } });
    }

    return { message: '纠纷处理完成' };
  },

  // ── 管理员申请 ──
  async getApplicationList(params: { status?: string; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where: any = {};
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      prisma.adminApplication.findMany({
        where,
        include: { applicant: { select: { id: true, nickname: true, studentId: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminApplication.count({ where }),
    ]);
    return { items, total };
  },

  async reviewApplication(applicationId: number, reviewerId: number, data: { action: 'approve' | 'reject'; reason?: string }) {
    const app = await prisma.adminApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundError('申请不存在');
    if (app.status !== '待审批') throw new ConflictError('该申请已审批');

    const isApproved = data.action === 'approve';
    await prisma.adminApplication.update({
      where: { id: applicationId },
      data: {
        status: isApproved ? '已通过' : '已拒绝',
        reviewerId,
        reviewComment: data.reason,
        reviewedAt: new Date(),
      },
    });

    if (isApproved) {
      await prisma.user.update({
        where: { id: app.userId },
        data: { role: 'admin' },
      });
    }

    return { message: isApproved ? '申请已通过' : '申请已拒绝' };
  },
};
