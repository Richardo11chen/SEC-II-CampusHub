import api from './client';
import type { ApiResponse, Order, OrderDetail, OrderQueryParams, PaginatedData } from '@/types';

function extractMessage(err: unknown, fallback: string): string {
  const resp = err as { response?: { data?: { message?: string } } } | null;
  return resp?.response?.data?.message ?? fallback;
}

function mapDemandToFlat<T extends { demand?: { id: number; title: string } }>(
  item: T,
): Omit<T, 'demand'> & { demandId: number; demandTitle: string } {
  const { demand, ...rest } = item;
  return { ...rest, demandId: demand?.id ?? (rest as Record<string, unknown>).demandId as number ?? 0, demandTitle: demand?.title ?? '' };
}

function normalizeOrder(o: Order): Order {
  return { ...o, reward: Number(o.reward) };
}

export async function createOrder(demandId: number): Promise<{ data: Order | null; error: string | null }> {
  try {
    const res = await api.post<ApiResponse<Order & { demand?: { id: number; title: string } }>>('/orders', { demandId });
    if (res.data.data) {
      const mapped = mapDemandToFlat(res.data.data);
      return { data: normalizeOrder(mapped as unknown as Order), error: null };
    }
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '接单失败') };
  }
}

export async function getOrders(params?: OrderQueryParams): Promise<{
  data: PaginatedData<Order> | null; error: string | null
}> {
  try {
    const res = await api.get<ApiResponse<PaginatedData<Order>>>( '/orders', { params });
    if (res.data.data) {
      const items = res.data.data.items.map((item) => {
        const mapped = mapDemandToFlat(item as Order & { demand?: { id: number; title: string } });
        return normalizeOrder(mapped as unknown as Order);
      });
      return { data: { ...res.data.data, items }, error: null };
    }
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取订单列表失败') };
  }
}

export async function getOrder(id: number): Promise<{ data: OrderDetail | null; error: string | null }> {
  try {
    const res = await api.get<ApiResponse<OrderDetail>>(`/orders/${id}`);
    if (res.data.data) {
      return { data: { ...res.data.data, reward: Number(res.data.data.reward) }, error: null };
    }
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '获取订单详情失败') };
  }
}

export async function completeOrder(id: number): Promise<{ data: Order | null; error: string | null }> {
  try {
    const res = await api.put<ApiResponse<Order & { demand?: { id: number; title: string } }>>(`/orders/${id}/complete`);
    if (res.data.data) {
      const mapped = mapDemandToFlat(res.data.data);
      return { data: normalizeOrder(mapped as unknown as Order), error: null };
    }
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '操作失败') };
  }
}

export async function confirmOrder(id: number): Promise<{ data: Order | null; error: string | null }> {
  try {
    const res = await api.put<ApiResponse<Order & { demand?: { id: number; title: string } }>>(`/orders/${id}/confirm`);
    if (res.data.data) {
      const mapped = mapDemandToFlat(res.data.data);
      return { data: normalizeOrder(mapped as unknown as Order), error: null };
    }
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '操作失败') };
  }
}

export async function cancelOrder(id: number, reason?: string): Promise<{ data: Order | null; error: string | null }> {
  try {
    const res = await api.put<ApiResponse<Order & { demand?: { id: number; title: string } }>>(`/orders/${id}/cancel`, { reason });
    if (res.data.data) {
      const mapped = mapDemandToFlat(res.data.data);
      return { data: normalizeOrder(mapped as unknown as Order), error: null };
    }
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '取消订单失败') };
  }
}

export async function disputeOrder(id: number, reason: string): Promise<{ data: Order | null; error: string | null }> {
  try {
    const res = await api.post<ApiResponse<Order & { demand?: { id: number; title: string } }>>(`/orders/${id}/dispute`, { reason });
    if (res.data.data) {
      const mapped = mapDemandToFlat(res.data.data);
      return { data: normalizeOrder(mapped as unknown as Order), error: null };
    }
    return { data: null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractMessage(err, '发起纠纷失败') };
  }
}
