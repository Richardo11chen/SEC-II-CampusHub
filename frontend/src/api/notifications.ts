import api from './client';
import type { ApiResponse, Notification } from '@/types';

function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}

interface NotificationListData {
  items: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export async function getNotifications(page = 1, pageSize = 20): Promise<{
  data: NotificationListData | null; error: string | null
}> {
  try {
    const res = await api.get<ApiResponse<NotificationListData>>('/notifications', {
      params: { page, pageSize },
    });
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取通知失败') };
  }
}

export async function markNotificationRead(id: number): Promise<{ error: string | null }> {
  try {
    await api.patch(`/notifications/${id}`);
    return { error: null };
  } catch (err: unknown) {
    return { error: extractMessage(err, '操作失败') };
  }
}
