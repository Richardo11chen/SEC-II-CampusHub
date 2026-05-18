import prisma from './prisma.js';

export async function resolvePublisher(
  demand: { id: number; publisherId: number; isAnonymous: boolean },
  currentUserId?: number,
): Promise<{ id: number; nickname: string; avatar: string | null; creditScore: number } | null> {
  const user = await prisma.user.findUnique({
    where: { id: demand.publisherId },
    select: { id: true, nickname: true, avatar: true, creditScore: true },
  });
  if (!user) return null;

  if (!demand.isAnonymous) return user;

  if (!currentUserId) {
    return { id: user.id, nickname: '匿名用户', avatar: null, creditScore: user.creditScore };
  }

  const order = await prisma.order.findUnique({
    where: { demandId: demand.id },
    select: { publisherId: true, providerId: true },
  });

  if (order && (order.publisherId === currentUserId || order.providerId === currentUserId)) {
    return user;
  }

  return { id: user.id, nickname: '匿名用户', avatar: null, creditScore: user.creditScore };
}
