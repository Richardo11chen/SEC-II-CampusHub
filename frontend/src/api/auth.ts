import api from './client';
import type { ApiResponse, LoginResult, RefreshResult, RegisterInput, LoginInput } from '@/types';

function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}

export async function login(input: LoginInput): Promise<{ data: LoginResult | null; error: string | null }> {
  try {
    const res = await api.post<ApiResponse<LoginResult>>('/auth/login', input);
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '网络错误，请稍后再试') };
  }
}

export async function register(input: RegisterInput): Promise<{ data: { id: number } | null; error: string | null }> {
  try {
    const res = await api.post<ApiResponse<{ id: number }>>('/auth/register', input);
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '网络错误，请稍后再试') };
  }
}

export async function refresh(token: string): Promise<{ data: RefreshResult | null; error: string | null }> {
  try {
    const res = await api.post<ApiResponse<RefreshResult>>('/auth/refresh', { refreshToken: token });
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '刷新失败') };
  }
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}
