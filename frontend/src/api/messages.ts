import api from './client';
import type { ApiResponse, PaginatedData, ChatMessage, MessageContentType } from '@/types';

function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}

export async function getMessages(
  orderId: number,
  page = 1,
  pageSize = 50,
): Promise<{ data: PaginatedData<ChatMessage> | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<PaginatedData<ChatMessage>>>('/messages', {
      params: { orderId, page, pageSize },
    });
    return { data: res.data.data ?? null, error: null };
  } catch (err) {
    return { data: null, error: extractMessage(err, '获取消息失败') };
  }
}

export async function sendMessage(
  orderId: number,
  content: string,
  contentType: MessageContentType = 'text',
): Promise<{ data: ChatMessage | null; error: string | null }> {
  try {
    const res = await api.post<ApiResponse<ChatMessage>>('/messages', {
      orderId,
      content,
      contentType,
    });
    return { data: res.data.data ?? null, error: null };
  } catch (err) {
    return { data: null, error: extractMessage(err, '发送消息失败') };
  }
}
