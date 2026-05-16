import api from './client';
import type { ApiResponse } from '@/types';

export async function uploadImage(file: File): Promise<{ data: { url: string } | null; error: string | null }> {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post<ApiResponse<{ url: string }>>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    const resp = err as { response?: { data?: { message?: string } } } | null;
    return { data: null, error: resp?.response?.data?.message || '上传失败' };
  }
}
