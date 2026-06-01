import api from './client';
import type { ApiResponse, Demand, DemandSummary, PaginatedData, CreateDemandInput, DemandQueryParams } from '@/types';

function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}

function normalizeDemand(d: Demand): Demand {
  return { ...d, reward: Number(d.reward) };
}

function normalizeSummary(d: DemandSummary): DemandSummary {
  return { ...d, reward: Number(d.reward) };
}

export async function createDemand(input: CreateDemandInput): Promise<{ data: Demand | null; error: string | null }> {
  try {
    const res = await api.post<ApiResponse<Demand>>('/demands', input);
    return { data: res.data.data ? normalizeDemand(res.data.data) : null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '发布失败') };
  }
}

export async function getDemands(params?: DemandQueryParams): Promise<{
  data: PaginatedData<DemandSummary> | null; error: string | null
}> {
  try {
    // 将 categories 数组转为逗号分隔字符串（后端要求）
    const { categories, ...rest } = params || {};
    const apiParams: Record<string, unknown> = { ...rest };
    if (categories?.length) {
      apiParams.category = categories.join(',');
    }
    const res = await api.get<ApiResponse<PaginatedData<DemandSummary>>>('/demands', { params: apiParams });
    if (res.data.data) {
      return {
        data: { ...res.data.data, items: res.data.data.items.map(normalizeSummary) },
        error: null,
      };
    }
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取需求列表失败') };
  }
}

export async function deleteDemand(id: number): Promise<{ error: string | null }> {
  try {
    const res = await api.delete<ApiResponse<null>>(`/demands/${id}`);
    return { error: res.data.data === null ? null : null };
  } catch (err: unknown) {
    return { error: extractMessage(err, '删除需求失败') };
  }
}

export async function getDemand(id: number): Promise<{ data: Demand | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<Demand>>(`/demands/${id}`);
    return { data: res.data.data ? normalizeDemand(res.data.data) : null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取需求详情失败') };
  }
}
