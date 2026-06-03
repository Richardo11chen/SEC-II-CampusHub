import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import type { UserProfile, DemandSummary, DemandCategory } from '@/types';
import HomePage from '../HomePage';
import * as demandsApi from '@/api/demands';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/api/demands', () => ({ getDemands: vi.fn() }));

const mockUser: UserProfile = {
  id: 10, nickname: '测试用户', studentId: '2024000001',
  creditScore: 70, role: 'student', status: '正常', showRealName: false,
  createdAt: '2026-01-01T00:00:00Z',
};

function makeDemand(id: number, overrides: Partial<DemandSummary> = {}): DemandSummary {
  return {
    id, title: `需求${id}`, category: '快递代取' as DemandCategory,
    reward: 20, status: '开放', isUrgent: false, isAnonymous: false,
    publisher: { id: 99, nickname: '用户', creditScore: 70, avatar: undefined },
    createdAt: '2026-06-03T10:00:00.000Z', ...overrides,
  };
}

function mockResponse(items: DemandSummary[] = [makeDemand(1)]) {
  (demandsApi.getDemands as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { items, pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 } },
    error: null,
  });
}

function renderPage() {
  const mockAuth: AuthContextType = {
    user: mockUser, accessToken: 'x', isLoading: false, isAuthenticated: true,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={mockAuth}>
      <HomePage />
    </AuthContext.Provider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse();
  });

  // ──── loading / error / empty ────

  it('shows skeleton while loading', () => {
    (demandsApi.getDemands as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    renderPage();
    // skeleton 渲染多个 MuiSkeleton
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('shows error and clears loading', async () => {
    (demandsApi.getDemands as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '网络错误' });
    renderPage();
    expect(await screen.findByText('网络错误')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockResponse([]);
    renderPage();
    expect(await screen.findByText('暂无需求')).toBeInTheDocument();
  });

  // ──── 搜索防抖 ────

  it('searches with debounce when typing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    // 等待初始加载完成
    await act(async () => { vi.advanceTimersByTime(1000); });
    await vi.waitFor(() => expect(screen.getByPlaceholderText('搜索需求标题…')).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('搜索需求标题…'), '快递');
    vi.advanceTimersByTime(500); // 超过 400ms 防抖

    await vi.waitFor(() => {
      expect(demandsApi.getDemands).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '快递' }),
      );
    });
    vi.useRealTimers();
  });

  // ──── 分类筛选 ────

  it('filters by selected category', async () => {
    renderPage();
    await screen.findByText('需求1');
    await userEvent.click(screen.getByText('学习辅导'));
    await waitFor(() => {
      expect(demandsApi.getDemands).toHaveBeenCalledWith(
        expect.objectContaining({ categories: ['学习辅导'] }),
      );
    });
  });

  it('clears categories when clicking "全部"', async () => {
    renderPage();
    await screen.findByText('需求1');
    await userEvent.click(screen.getByText('学习辅导'));
    await waitFor(() => {
      expect(demandsApi.getDemands).toHaveBeenLastCalledWith(
        expect.objectContaining({ categories: ['学习辅导'] }),
      );
    });
    await userEvent.click(screen.getAllByText('全部')[0]);
    await waitFor(() => {
      expect(demandsApi.getDemands).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ categories: expect.anything() }),
      );
    });
  });

  // ──── 排序 ────

  it('sorts by reward descending when clicking reward button', async () => {
    renderPage();
    await screen.findByText('需求1');
    await userEvent.click(screen.getByText('报酬'));
    await waitFor(() => {
      expect(demandsApi.getDemands).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'reward_high' }),
      );
    });
  });

  it('toggles sort direction on second click', async () => {
    renderPage();
    await screen.findByText('需求1');
    await userEvent.click(screen.getByText('报酬')); // 第一次：reward_high
    await userEvent.click(screen.getByText('报酬')); // 第二次：reward_low
    await waitFor(() => {
      expect(demandsApi.getDemands).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'reward_low' }),
      );
    });
  });

  // ──── 状态筛选 ────

  it('defaults to status 开放', async () => {
    renderPage();
    await screen.findByText('需求1');
    // 初始请求应带 status=开放
    expect(demandsApi.getDemands).toHaveBeenCalledWith(
      expect.objectContaining({ status: '开放' }),
    );
  });

  it('changes status filter when clicked', async () => {
    renderPage();
    await screen.findByText('需求1');
    await userEvent.click(screen.getByText('进行中'));
    await waitFor(() => {
      expect(demandsApi.getDemands).toHaveBeenCalledWith(
        expect.objectContaining({ status: '进行中' }),
      );
    });
  });

  // ──── 报酬筛选 ────

  it('sends reward range from preset', async () => {
    renderPage();
    await screen.findByText('需求1');
    // 点开更多筛选
    await userEvent.click(screen.getByText('更多筛选'));
    await userEvent.click(screen.getByText('1-50'));
    await waitFor(() => {
      expect(demandsApi.getDemands).toHaveBeenCalledWith(
        expect.objectContaining({ minReward: 1, maxReward: 50 }),
      );
    });
  });

  it('sends custom min reward when typing', async () => {
    renderPage();
    await screen.findByText('需求1');
    await userEvent.click(screen.getByText('更多筛选'));
    const minInput = screen.getByPlaceholderText('最低');
    await userEvent.type(minInput, '30');
    await waitFor(() => {
      expect(demandsApi.getDemands).toHaveBeenCalledWith(
        expect.objectContaining({ minReward: 30 }),
      );
    });
  });

  // ──── 渲染 ────

  it('renders demand list from API data', async () => {
    mockResponse([makeDemand(1), makeDemand(2, { title: '需求2' })]);
    renderPage();
    expect(await screen.findByText('需求1')).toBeInTheDocument();
    expect(screen.getByText('需求2')).toBeInTheDocument();
  });

  it('shows pagination when multiple pages', async () => {
    const items = Array.from({ length: 10 }, (_, i) => makeDemand(i + 1));
    (demandsApi.getDemands as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items, pagination: { page: 1, pageSize: 10, total: 25, totalPages: 3 } },
      error: null,
    });
    renderPage();
    await screen.findByText('需求1');
    // 分页组件渲染时应有 "3" 的页码按钮
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
