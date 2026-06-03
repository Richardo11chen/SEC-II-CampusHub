import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import type { UserProfile, Order, OrderStatus } from '@/types';
import OrderListPage from '../OrderListPage';
import * as ordersApi from '@/api/orders';
import * as demandsApi from '@/api/demands';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

// Mock 非确定性时间函数
vi.mock('@/utils/format', async () => {
  const actual = await vi.importActual<typeof import('@/utils/format')>('@/utils/format');
  return { ...actual, formatRelativeTime: () => '2小时前' };
});

vi.mock('@/api/orders', () => ({ getOrders: vi.fn() }));
vi.mock('@/api/demands', () => ({ getDemands: vi.fn() }));

const mockUser: UserProfile = {
  id: 10, nickname: '测试用户', studentId: '2024000001',
  creditScore: 70, role: 'student', status: '正常', showRealName: false,
  createdAt: '2026-01-01T00:00:00Z',
};

function makeOrder(id: number, status: OrderStatus): Order {
  return {
    id, demandId: id, demandTitle: `需求${id}`,
    publisherId: 10, providerId: 20, status, reward: 15,
    isPaid: false, createdAt: '2026-06-03T10:00:00.000Z',
  };
}

function renderPage(user: UserProfile | null = mockUser) {
  const mockAuth: AuthContextType = {
    user, accessToken: 'x', isLoading: false, isAuthenticated: !!user,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={mockAuth}>
      <OrderListPage />
    </AuthContext.Provider>,
  );
}

describe('OrderListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ordersApi.getOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }, error: null,
    });
    (demandsApi.getDemands as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }, error: null,
    });
  });

  // ──── loading / error / empty ────

  it('shows spinner while loading', () => {
    (ordersApi.getOrders as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error alert on load failure', async () => {
    (ordersApi.getOrders as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '网络错误' });
    renderPage();
    expect(await screen.findByText('网络错误')).toBeInTheDocument();
  });

  it('shows empty state when no orders', async () => {
    renderPage();
    expect(await screen.findByText('暂无订单')).toBeInTheDocument();
  });

  // ──── Tab 切换 ────

  it('shows tabs and switches role', async () => {
    (ordersApi.getOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeOrder(1, '进行中')], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } }, error: null,
    });
    renderPage();
    expect(await screen.findByText('我发布的')).toBeInTheDocument();
    expect(screen.getByText('我承接的')).toBeInTheDocument();
    await userEvent.click(screen.getByText('我承接的'));
    await waitFor(() => {
      expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({ role: 'provider' }));
    });
  });

  // ──── 状态筛选 ────

  it('filters by status', async () => {
    renderPage();
    await screen.findByText('暂无订单');
    await userEvent.click(screen.getByText('已完成'));
    await waitFor(() => {
      expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({ status: '已完成' }));
    });
  });

  it('shows all status filter chips', async () => {
    renderPage();
    await screen.findByText('暂无订单');
    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByText('进行中')).toBeInTheDocument();
    expect(screen.getByText('待确认')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('已取消')).toBeInTheDocument();
    expect(screen.getByText('纠纷中')).toBeInTheDocument();
  });

  // ──── 订单列表 ────

  it('renders order list and navigates on click', async () => {
    (ordersApi.getOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeOrder(1, '进行中'), makeOrder(2, '已完成')], pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 } }, error: null,
    });
    renderPage();
    expect(await screen.findByText('需求1')).toBeInTheDocument();
    expect(screen.getByText('需求2')).toBeInTheDocument();
    await userEvent.click(screen.getByText('需求1'));
    expect(mockNavigate).toHaveBeenCalledWith('/orders/1');
  });

  it('shows order status chip', async () => {
    (ordersApi.getOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeOrder(1, '待确认')], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } }, error: null,
    });
    renderPage();
    expect(await screen.findByText('待确认')).toBeInTheDocument();
  });

  // ──── 开放需求混排（发布者 Tab） ────

  it('shows open demands mixed in publisher tab', async () => {
    (ordersApi.getOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeOrder(1, '进行中')], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } }, error: null,
    });
    (demandsApi.getDemands as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        items: [{ id: 99, title: '未接单需求', category: '快递代取', reward: 20, status: '开放', isUrgent: false, isAnonymous: false, publisher: { id: 10, nickname: '测试用户', creditScore: 70 }, createdAt: '2026-06-03T10:00:00.000Z' }],
        pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
      }, error: null,
    });
    renderPage();
    expect(await screen.findByText('未接单需求')).toBeInTheDocument();
    expect(screen.getByText('开放中')).toBeInTheDocument();
  });

  it('navigates to demand detail when clicking open demand', async () => {
    (ordersApi.getOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeOrder(1, '进行中')], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } }, error: null,
    });
    (demandsApi.getDemands as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        items: [{ id: 99, title: '未接单需求', category: '快递代取', reward: 20, status: '开放', isUrgent: false, isAnonymous: false, publisher: { id: 10, nickname: '测试用户', creditScore: 70 }, createdAt: '2026-06-03T10:00:00.000Z' }],
        pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
      }, error: null,
    });
    renderPage();
    await userEvent.click(await screen.findByText('未接单需求'));
    expect(mockNavigate).toHaveBeenCalledWith('/demands/99');
  });

  it('does not refetch open demands after switching to provider tab', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('我承接的'));
    await waitFor(() => {
      // 初始 mount 时 role=publisher 会调用一次，切到 provider 后不应再调用
      expect(demandsApi.getDemands).toHaveBeenCalledTimes(1);
    });
  });
});
