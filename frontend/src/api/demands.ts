import api from './client';
import type { ApiResponse, Demand, DemandSummary, PaginatedData, CreateDemandInput, DemandQueryParams } from '@/types';

function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}

export async function createDemand(input: CreateDemandInput): Promise<{ data: Demand | null; error: string | null }> {
  try {
    const res = await api.post<ApiResponse<Demand>>('/demands', input);
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '发布失败') };
  }
}

export async function getDemands(params?: DemandQueryParams): Promise<{
  data: PaginatedData<DemandSummary> | null; error: string | null
}> {
  try {
    const res = await api.get<ApiResponse<PaginatedData<DemandSummary>>>('/demands', { params });
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取需求列表失败') };
  }
}

export async function getDemand(id: number): Promise<{ data: Demand | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<Demand>>(`/demands/${id}`);
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取需求详情失败') };
  }
}
