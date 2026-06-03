import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import type { UserProfile, OrderDetail, DemandCategory, OrderStatus, DemandStatus } from '@/types';
import OrderDetailPage from '../OrderDetailPage';
import * as ordersApi from '@/api/orders';
import * as reviewsApi from '@/api/reviews';

// ── fixture ──

const PUBLISHER: UserProfile = {
  id: 10, nickname: '发布者', studentId: '1', creditScore: 70,
  role: 'student', status: '正常', showRealName: false, createdAt: '',
};
const PROVIDER: UserProfile = {
  id: 20, nickname: '承接者', studentId: '2', creditScore: 75,
  role: 'student', status: '正常', showRealName: false, createdAt: '',
};
const OTHER_USER: UserProfile = {
  id: 99, nickname: '无关用户', studentId: '3', creditScore: 60,
  role: 'student', status: '正常', showRealName: false, createdAt: '',
};
const DEMAND_SUMMARY = {
  id: 1, title: '代取快递', category: '快递代取' as DemandCategory,
  reward: 15, status: '进行中' as DemandStatus, isUrgent: false, isAnonymous: false,
  publisher: { id: 10, nickname: '发布者', creditScore: 70 },
  createdAt: '2026-06-03T10:00:00.000Z',
};

function makeOrder(status: OrderStatus, overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 42, demandId: 1, demandTitle: '代取快递', reward: 15,
    publisherId: 10, providerId: 20, status, isPaid: false,
    publisher: { id: 10, nickname: '发布者', creditScore: 70, totalOrders: 5, joinedAt: '', college: undefined, avatar: undefined, name: null },
    provider: { id: 20, nickname: '承接者', creditScore: 75, totalOrders: 3, joinedAt: '', college: undefined, avatar: undefined, name: null },
    demand: DEMAND_SUMMARY,
    createdAt: '2026-06-03T10:00:00.000Z',
    ...overrides,
  };
}

// ── mock ──

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '42' }), useNavigate: () => mockNavigate }));
vi.mock('@/api/orders', () => ({ getOrder: vi.fn(), completeOrder: vi.fn(), confirmOrder: vi.fn(), cancelOrder: vi.fn(), disputeOrder: vi.fn() }));
vi.mock('@/api/reviews', () => ({ createReview: vi.fn(), getMyReview: vi.fn() }));

// ── timezone ──
beforeAll(() => { process.env.TZ = 'UTC'; });
afterAll(() => { delete process.env.TZ; });

function renderPage(user: UserProfile | null = OTHER_USER) {
  const mockAuth: AuthContextType = {
    user, accessToken: 'x', isLoading: false, isAuthenticated: !!user,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={mockAuth}>
      <OrderDetailPage />
    </AuthContext.Provider>,
  );
}

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: makeOrder('进行中'), error: null });
    (reviewsApi.getMyReview as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
  });

  // ──── loading / error ────

  it('shows spinner while loading', () => {
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    renderPage(PUBLISHER);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error alert on load failure', async () => {
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '网络错误' });
    renderPage(PUBLISHER);
    expect(await screen.findByText('网络错误')).toBeInTheDocument();
  });

  // ──── 基本信息 ────

  it('renders demand title, category, status chip and reward', async () => {
    renderPage(PUBLISHER);
    expect(await screen.findByText('代取快递')).toBeInTheDocument();
    expect(screen.getByText('快递代取')).toBeInTheDocument();
    // "进行中" 出现在 status chip 和 stepper 中，使用 getAllByText 确认至少出现一次
    expect(screen.getAllByText('进行中').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/¥15/)).toBeInTheDocument();
  });

  it('shows back button', async () => {
    renderPage(PUBLISHER);
    expect(await screen.findByText('返回')).toBeInTheDocument();
  });

  // ──── 状态时间线 vs 终态提示 ────

  it('shows stepper for active statuses', async () => {
    renderPage(PUBLISHER);
    await screen.findByText('代取快递');
    expect(screen.getByText('待确认')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.queryByText('该订单已取消')).not.toBeInTheDocument();
  });

  it('shows warning alert for cancelled orders', async () => {
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: makeOrder('已取消'), error: null });
    renderPage(PUBLISHER);
    expect(await screen.findByText('该订单已取消')).toBeInTheDocument();
    expect(screen.queryByText('待确认')).not.toBeInTheDocument();
  });

  it('shows error alert for disputed orders', async () => {
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: makeOrder('纠纷中'), error: null });
    renderPage(PUBLISHER);
    expect(await screen.findByText('该订单正在纠纷处理中')).toBeInTheDocument();
  });

  // ──── 参与者卡片 ────

  it('shows publisher and provider info', async () => {
    renderPage(PUBLISHER);
    await screen.findByText('代取快递');
    // 标题和昵称中都会出现
    expect(screen.getAllByText('发布者').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('承接者').length).toBeGreaterThanOrEqual(1);
  });

  // ──── 操作按钮可见性 ────

  it('shows "提交完成" only for provider in 进行中', async () => {
    renderPage(PROVIDER);
    expect(await screen.findByText('提交完成')).toBeInTheDocument();
    expect(screen.queryByText('确认完成')).not.toBeInTheDocument();
  });

  it('shows "确认完成" only for publisher in 待确认', async () => {
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: makeOrder('待确认'), error: null });
    renderPage(PUBLISHER);
    expect(await screen.findByText('确认完成')).toBeInTheDocument();
    expect(screen.queryByText('提交完成')).not.toBeInTheDocument();
  });

  it('shows chat button for participants in active statuses', async () => {
    renderPage(PROVIDER);
    expect(await screen.findByText('聊天')).toBeInTheDocument();
  });

  it('hides chat button for non-participants', async () => {
    renderPage(OTHER_USER);
    await screen.findByText('代取快递');
    expect(screen.queryByText('聊天')).not.toBeInTheDocument();
  });

  it('shows cancel and dispute for 进行中', async () => {
    renderPage(PROVIDER);
    expect(await screen.findByText('取消订单')).toBeInTheDocument();
    expect(screen.getByText('发起纠纷')).toBeInTheDocument();
  });

  // ──── 操作执行 ────

  it('calls completeOrder and shows success snackbar', async () => {
    (ordersApi.completeOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {}, error: null });
    renderPage(PROVIDER);
    await userEvent.click(await screen.findByText('提交完成'));
    expect(await screen.findByText('已提交完成，等待发布者确认')).toBeInTheDocument();
    expect(ordersApi.completeOrder).toHaveBeenCalledWith(42);
  });

  it('calls confirmOrder and shows success snackbar', async () => {
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: makeOrder('待确认'), error: null });
    (ordersApi.confirmOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {}, error: null });
    renderPage(PUBLISHER);
    await userEvent.click(await screen.findByText('确认完成'));
    expect(await screen.findByText('已确认完成')).toBeInTheDocument();
    expect(ordersApi.confirmOrder).toHaveBeenCalledWith(42);
  });

  it('calls cancelOrder when confirmed in dialog', async () => {
    (ordersApi.cancelOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {}, error: null });
    renderPage(PROVIDER);
    await userEvent.click(await screen.findByText('取消订单'));
    // 对话框中确认
    await userEvent.click(screen.getByText('确认取消'));
    expect(await screen.findByText('订单已取消')).toBeInTheDocument();
    expect(ordersApi.cancelOrder).toHaveBeenCalledWith(42, undefined);
  });

  it('calls disputeOrder when reason is provided', async () => {
    (ordersApi.disputeOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {}, error: null });
    renderPage(PROVIDER);
    await userEvent.click(await screen.findByText('发起纠纷'));
    const textboxes = screen.getAllByRole('textbox');
    const reasonField = textboxes.find(t => t.closest('[role="dialog"]') !== null) || textboxes[textboxes.length - 1];
    await userEvent.type(reasonField, '服务不满意');
    await userEvent.click(screen.getByText('提交纠纷'));
    expect(await screen.findByText('纠纷已提交')).toBeInTheDocument();
    expect(ordersApi.disputeOrder).toHaveBeenCalledWith(42, '服务不满意');
  });

  it('navigates to chat page', async () => {
    renderPage(PROVIDER);
    await userEvent.click(await screen.findByText('聊天'));
    expect(mockNavigate).toHaveBeenCalledWith('/orders/42/chat');
  });

  // ──── 评价区 ────

  it('shows review form for completed orders', async () => {
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: makeOrder('已完成'), error: null });
    renderPage(PUBLISHER);
    expect(await screen.findByText('评价')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('写下你的评价（选填）…')).toBeInTheDocument();
  });

  it('shows existing review when available', async () => {
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: makeOrder('已完成'), error: null });
    (reviewsApi.getMyReview as ReturnType<typeof vi.fn>).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { id: 1, orderId: 42, rating: 4, content: '很不错', fromUser: PROVIDER as any, toUserId: 10, createdAt: '2026-06-04T10:00:00.000Z' },
      error: null,
    });
    renderPage(PUBLISHER);
    expect(await screen.findByText('很不错')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('写下你的评价（选填）…')).not.toBeInTheDocument();
  });

  it('shows review section with text input and submit button for completed orders', async () => {
    (ordersApi.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: makeOrder('已完成'), error: null });
    renderPage(PUBLISHER);
    await screen.findByText('评价');
    expect(screen.getByPlaceholderText('写下你的评价（选填）…')).toBeInTheDocument();
    // 无评分时提交按钮禁用
    expect(screen.getByText('提交评价')).toBeDisabled();
  });
});
