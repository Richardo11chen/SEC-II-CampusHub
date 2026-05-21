import api from './client';
import type { ApiResponse, Review, PaginatedData, CreateReviewInput } from '@/types';

function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}

export async function getUserReviews(userId: number, page = 1): Promise<{
  data: PaginatedData<Review> | null; error: string | null
}> {
  try {
    const res = await api.get<ApiResponse<PaginatedData<Review>>>(`/users/${userId}/reviews`, { params: { page } });
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取评价失败') };
  }
}

export async function createReview(input: CreateReviewInput): Promise<{ data: Review | null; error: string | null }> {
  try {
    const res = await api.post<ApiResponse<Review>>('/reviews', input);
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '提交评价失败') };
  }
}
