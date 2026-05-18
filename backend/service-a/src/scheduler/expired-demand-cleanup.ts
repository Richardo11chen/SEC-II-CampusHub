import schedule from 'node-schedule';
import { prisma, logger } from '@campushub/shared';
import { DemandStatus } from '@prisma/client';

export function initExpiredDemandCleanup() {
  schedule.scheduleJob('0 3 * * *', async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const { count } = await prisma.demand.updateMany({
        where: {
          status: DemandStatus['开放'],
          createdAt: { lt: thirtyDaysAgo },
        },
        data: {
          status: DemandStatus['已关闭'],
        },
      });

      if (count > 0) {
        logger.info(`[定时任务] 已将 ${count} 条过期需求标记为已关闭`);
      }
    } catch (error) {
      logger.error('[定时任务] 过期需求清理失败', { error });
    }
  });

  logger.info('[定时任务] 过期需求清理已注册 (每日 3:00)');
}
