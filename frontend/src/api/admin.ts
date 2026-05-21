import api from './client';
import type { ApiResponse, UserProfile, DemandSummary, PaginatedData } from '@/types';

function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}

/* ---- types ---- */

export interface AdminStatistics {
  totalUsers: number;
  dailyActiveUsers: number;
  totalOrders: number;
  completedOrders: number;
  pendingDisputes: number;
  categoryDistribution: Record<string, number>;
  dailyNewUsers: { date: string; count: number }[];
}

export interface AdminDispute {
  id: number;
  orderId: number;
  initiator: { id: number; nickname: string };
  reason: string;
  status: '待处理' | '已处理';
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AdminApplication {
  id: number;
  applicant: { id: number; nickname: string; studentId: string };
  reason: string;
  status: '待审批' | '已通过' | '已拒绝';
  reviewer?: { id: number; nickname: string };
  reviewComment?: string;
  createdAt: string;
  reviewedAt?: string;
}

/* ---- API ---- */

export async function getStatistics(): Promise<{ data: AdminStatistics | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<AdminStatistics>>('/admin/statistics');
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取统计失败') };
  }
}

export async function getAdminUsers(page = 1): Promise<{ data: PaginatedData<UserProfile> | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<PaginatedData<UserProfile>>>('/admin/users', { params: { page } });
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取用户列表失败') };
  }
}

export async function toggleUserStatus(userId: number, action: 'disable' | 'enable'): Promise<{ data: null; error: string | null }> {
  try {
    await api.put(`/admin/users/${userId}/status`, { action });
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '操作失败') };
  }
}

export async function getAdminDemands(page = 1): Promise<{ data: PaginatedData<DemandSummary> | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<PaginatedData<DemandSummary>>>('/admin/demands', { params: { page } });
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取需求列表失败') };
  }
}

export async function deleteAdminDemand(demandId: number): Promise<{ data: null; error: string | null }> {
  try {
    await api.delete(`/admin/demands/${demandId}`);
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '删除失败') };
  }
}

export async function getDisputes(page = 1): Promise<{ data: PaginatedData<AdminDispute> | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<PaginatedData<AdminDispute>>>('/admin/disputes', { params: { page } });
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取纠纷列表失败') };
  }
}

export async function resolveDispute(disputeId: number, resolution: string, action: string): Promise<{ data: null; error: string | null }> {
  try {
    await api.put(`/admin/disputes/${disputeId}/resolve`, { resolution, action });
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '处理失败') };
  }
}

export async function getApplications(page = 1): Promise<{ data: PaginatedData<AdminApplication> | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<PaginatedData<AdminApplication>>>('/admin/applications', { params: { page } });
    return { data: res.data.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取申请列表失败') };
  }
}

export async function reviewApplication(applicationId: number, action: 'approve' | 'reject', reason?: string): Promise<{ data: null; error: string | null }> {
  try {
    await api.put(`/admin/applications/${applicationId}/review`, { action, reason });
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '审批失败') };
  }
}
