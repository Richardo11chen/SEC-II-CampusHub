import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import type { UserProfile, Demand, DemandCategory } from '@/types';
import DemandDetailPage from '../DemandDetailPage';
import * as demandsApi from '@/api/demands';
import * as ordersApi from '@/api/orders';

// ── 固定时区，formatDateTime 输出可预测 ──
beforeAll(() => { process.env.TZ = 'UTC'; });
afterAll(() => { delete process.env.TZ; });

// ── mock ──

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '42' }), useNavigate: () => mockNavigate }));

vi.mock('@/api/demands', () => ({ getDemand: vi.fn(), deleteDemand: vi.fn() }));
vi.mock('@/api/orders', () => ({ createOrder: vi.fn() }));

// ── fixture ──

const mockUser: UserProfile = {
  id: 200, nickname: '当前用户', studentId: '2024000002',
  creditScore: 70, role: 'student', status: '正常', showRealName: false,
  createdAt: '2026-01-01T00:00:00Z',
};

const mockUserAlt: UserProfile = {
  ...mockUser, id: 100, nickname: '自己是发布者',
};

function makeDemand(overrides: Partial<Demand> = {}): Demand {
  return {
    id: 42,
    title: '代取快递',
    description: '南大仙林校区2栋',
    category: '快递代取' as DemandCategory,
    reward: 10,
    status: '开放',
    isUrgent: false,
    isAnonymous: false,
    images: [{ id: 1, url: '/uploads/img1.jpg', sortOrder: 0 }],
    publisher: { id: 100, nickname: '发布者小王', avatar: undefined, creditScore: 70 },
    location: '南大仙林校区',
    expectedTime: '2026-06-10T14:00:00.000Z',
    createdAt: '2026-06-03T10:00:00.000Z',
    updatedAt: '2026-06-03T10:00:00.000Z',
    ...overrides,
  };
}

function renderPage(auth: Partial<AuthContextType> = {}) {
  const mockAuth: AuthContextType = {
    user: mockUser, accessToken: 'x', isLoading: false, isAuthenticated: true,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
    ...auth,
  };
  return render(
    <AuthContext.Provider value={mockAuth}>
      <DemandDetailPage />
    </AuthContext.Provider>,
  );
}

// ── tests ──

describe('DemandDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (demandsApi.getDemand as ReturnType<typeof vi.fn>).mockResolvedValue({ data: makeDemand(), error: null });
  });

  // ──── loading / error ────

  it('shows loading spinner initially', () => {
    // 不让 API 返回，保持 loading
    (demandsApi.getDemand as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error and back-to-home button on load failure', async () => {
    (demandsApi.getDemand as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '网络错误' });
    renderPage();
    expect(await screen.findByText('网络错误')).toBeInTheDocument();
    await userEvent.click(screen.getByText('返回首页'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  // ──── 基本信息 ────

  it('renders demand title, description, category, status', async () => {
    renderPage();
    expect(await screen.findByText('代取快递')).toBeInTheDocument();
    expect(screen.getByText('南大仙林校区2栋')).toBeInTheDocument();
    expect(screen.getByText('快递代取')).toBeInTheDocument();
    expect(screen.getByText('开放')).toBeInTheDocument();
  });

  it('renders reward in ¥ format', async () => {
    renderPage();
    expect(await screen.findByText('¥10')).toBeInTheDocument();
  });

  it('renders location and expected time when provided', async () => {
    renderPage();
    expect(await screen.findByText('南大仙林校区')).toBeInTheDocument();
    expect(screen.getByText(/期望 2026-06-10 14:00/)).toBeInTheDocument();
  });

  it('renders "发布于" timestamp', async () => {
    renderPage();
    expect(await screen.findByText(/发布于 2026-06-03 10:00/)).toBeInTheDocument();
  });

  // ──── 图片 ────

  it('shows image gallery when images exist', async () => {
    renderPage();
    await screen.findByText('代取快递');
    expect(screen.getByAltText('需求图片')).toBeInTheDocument();
  });

  it('shows preview dialog when clicking image', async () => {
    renderPage();
    await screen.findByText('代取快递');
    await userEvent.click(screen.getByAltText('需求图片'));
    expect(screen.getByAltText('预览')).toBeInTheDocument();
  });

  // ──── 发布者卡片 ────

  it('shows publisher nickname', async () => {
    renderPage();
    expect(await screen.findByText('发布者小王')).toBeInTheDocument();
  });

  it('shows "查看主页" button for non-anonymous', async () => {
    renderPage();
    expect(await screen.findByText('查看主页')).toBeInTheDocument();
    await userEvent.click(screen.getByText('查看主页'));
    expect(mockNavigate).toHaveBeenCalledWith('/users/100');
  });

  it('hides publisher and shows "匿名用户" when anonymous', async () => {
    (demandsApi.getDemand as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeDemand({ isAnonymous: true }), error: null,
    });
    renderPage();
    expect(await screen.findByText('匿名用户')).toBeInTheDocument();
    expect(screen.queryByText('发布者小王')).not.toBeInTheDocument();
    expect(screen.queryByText('查看主页')).not.toBeInTheDocument();
  });

  // ──── 当前订单卡片 ────

  it('shows current order card when demand has an active order', async () => {
    (demandsApi.getDemand as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeDemand({ currentOrder: { id: 99, provider: { id: 300, nickname: '接单者', avatar: undefined, creditScore: 70 } } }),
      error: null,
    });
    renderPage();
    expect(await screen.findByText(/当前订单/)).toBeInTheDocument();
    expect(screen.getByText(/接单者/)).toBeInTheDocument();
  });

  it('shows "查看订单" button for order participants', async () => {
    (demandsApi.getDemand as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeDemand({ currentOrder: { id: 99, provider: { id: 300, nickname: '接单者', avatar: undefined, creditScore: 70 } } }),
      error: null,
    });
    renderPage(); // mockUser.id=200, 不是发布者也不是承接者，所以不应看到按钮
    await screen.findByText(/当前订单/);
    expect(screen.queryByText('查看订单')).not.toBeInTheDocument();
  });

  it('hides "查看订单" when user is not order participant', async () => {
    (demandsApi.getDemand as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeDemand({ currentOrder: { id: 99, provider: { id: 300, nickname: '接单者', avatar: undefined, creditScore: 70 } }, publisher: { id: 200, nickname: '自己', avatar: undefined, creditScore: 70 } }),
      error: null,
    });
    renderPage({ user: { ...mockUserAlt, id: 200 } });
    await screen.findByText(/当前订单/);
    expect(screen.getByText('查看订单')).toBeInTheDocument();
  });

  // ──── 接单按钮 ────

  it('shows "接单" button for logged-in user when demand is open', async () => {
    renderPage();
    expect(await screen.findByText('接单')).toBeInTheDocument();
  });

  it('shows "登录后接单" when not logged in', async () => {
    renderPage({ user: null, isAuthenticated: false });
    expect(await screen.findByText('登录后接单')).toBeInTheDocument();
  });

  it('navigates to /orders/:id after successful take-order', async () => {
    (ordersApi.createOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 123 }, error: null });
    renderPage();
    await userEvent.click(await screen.findByText('接单'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/orders/123'));
  });

  // ──── 删除按钮 ────

  it('shows delete button for own demand in 开放 status', async () => {
    (demandsApi.getDemand as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeDemand({ publisher: { id: 200, nickname: '自己', avatar: undefined, creditScore: 70 } }),
      error: null,
    });
    renderPage({ user: { ...mockUserAlt, id: 200 } });
    expect(await screen.findByText('删除需求')).toBeInTheDocument();
  });

  it('deletes demand and navigates on confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (demandsApi.getDemand as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeDemand({ publisher: { id: 200, nickname: '自己', avatar: undefined, creditScore: 70 } }),
      error: null,
    });
    (demandsApi.deleteDemand as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    renderPage({ user: { ...mockUserAlt, id: 200 } });

    await userEvent.click(await screen.findByText('删除需求'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/orders', { replace: true }));
    expect(demandsApi.deleteDemand).toHaveBeenCalledWith(42);
  });
});
