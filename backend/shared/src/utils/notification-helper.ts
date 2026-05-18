import { notificationRepository } from '../repository/notification-repository.js';

export async function notifyOrderTaken(orderId: number, publisherId: number, providerNickname: string) {
  await notificationRepository.create({
    userId: publisherId,
    type: 'order_taken',
    title: '有人接了你的需求',
    content: `${providerNickname} 接取了你的需求，请前往查看`,
    relatedId: orderId,
  });
}

export async function notifyOrderCompleted(orderId: number, toUserId: number, byNickname: string) {
  await notificationRepository.create({
    userId: toUserId,
    type: 'order_completed',
    title: '订单待确认',
    content: `${byNickname} 已提交完成，请确认订单`,
    relatedId: orderId,
  });
}

export async function notifyOrderConfirmed(orderId: number, toUserId: number, byNickname: string) {
  await notificationRepository.create({
    userId: toUserId,
    type: 'order_confirmed',
    title: '订单已完成',
    content: `${byNickname} 已确认完成，订单结束`,
    relatedId: orderId,
  });
}

export async function notifyOrderCancelled(orderId: number, toUserId: number, byNickname: string, reason?: string) {
  await notificationRepository.create({
    userId: toUserId,
    type: 'order_cancelled',
    title: '订单已取消',
    content: reason ? `${byNickname} 取消了订单：${reason}` : `${byNickname} 取消了订单`,
    relatedId: orderId,
  });
}

export async function notifyReviewReceived(orderId: number, toUserId: number, fromNickname: string, rating: number) {
  await notificationRepository.create({
    userId: toUserId,
    type: 'review_received',
    title: '收到新评价',
    content: `${fromNickname} 给你打出了 ${rating} 星评价`,
    relatedId: orderId,
  });
}
