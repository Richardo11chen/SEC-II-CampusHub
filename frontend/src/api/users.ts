import api from './client';
import type { ApiResponse, UserProfile, PublicUserProfile, UpdateUserInput } from '@/types';

function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}

export async function getMe(): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<UserProfile>>('/users/me');
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取用户信息失败') };
  }
}

export async function updateMe(input: UpdateUserInput): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const res = await api.put<ApiResponse<UserProfile>>('/users/me', input);
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '更新失败') };
  }
}

export async function getUserProfile(userId: number): Promise<{ data: PublicUserProfile | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<PublicUserProfile>>(`/users/${userId}/profile`);
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取用户资料失败') };
  }
}
