import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import type { UserProfile } from '@/types';
import Layout from '../Layout';
import * as notifApi from '@/api/notifications';

// Mock 通知 API（Layout useEffect 中会调用）
vi.mock('@/api/notifications', () => ({ getNotifications: vi.fn() }));

const mockUser: UserProfile = {
  id: 1, nickname: '测试用户', studentId: '2024123456',
  creditScore: 70, role: 'student', status: '正常', showRealName: false,
  createdAt: '2026-01-01T00:00:00Z',
};

const adminUser: UserProfile = {
  ...mockUser, id: 2, nickname: '管理员', role: 'admin',
};

function renderWithAuth(auth: Partial<AuthContextType>, initialRoute = '/') {
  const mockAuth: AuthContextType = {
    user: null, accessToken: null, isLoading: false, isAuthenticated: false,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
    ...auth,
  };
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthContext.Provider value={mockAuth}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<div>首页内容</div>} />
            <Route path="/login" element={<div>登录页</div>} />
            <Route path="/demands/new" element={<div>发布需求</div>} />
            <Route path="/orders" element={<div>我的订单</div>} />
            <Route path="/users/me" element={<div>个人资料</div>} />
            <Route path="/notifications" element={<div>通知页</div>} />
            <Route path="/admin" element={<div>管理后台页</div>} />
          </Route>
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认 getNotifications 返回 0 未读（避免 console.error 或 interval 报错）
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0, unreadCount: 0, page: 1, pageSize: 1 },
      error: null,
    });
  });

  // ──── 基础渲染 ────

  it('renders app title and bottom navigation', () => {
    renderWithAuth({});
    expect(screen.getByText('CampusHub')).toBeInTheDocument();
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('发布')).toBeInTheDocument();
    expect(screen.getByText('订单')).toBeInTheDocument();
    expect(screen.getByText('我的')).toBeInTheDocument();
  });

  it('shows login icon when not authenticated', () => {
    renderWithAuth({ isAuthenticated: false });
    expect(screen.getByTestId('LoginIcon')).toBeInTheDocument();
  });

  it('shows user avatar when authenticated', () => {
    renderWithAuth({ isAuthenticated: true, user: mockUser });
    expect(screen.queryByTestId('LoginIcon')).not.toBeInTheDocument();
    expect(screen.getByText('测')).toBeInTheDocument();
  });

  it('renders child route content', () => {
    renderWithAuth({});
    expect(screen.getByText('首页内容')).toBeInTheDocument();
  });

  it('navigates when clicking bottom nav', async () => {
    renderWithAuth({});
    await userEvent.click(screen.getByText('发布'));
    expect(await screen.findByText('发布需求')).toBeInTheDocument();
  });

  // ──── 标题导航 ────

  it('navigates to home when clicking CampusHub title', async () => {
    renderWithAuth({ isAuthenticated: true, user: mockUser }, '/orders');
    await userEvent.click(screen.getByText('CampusHub'));
    expect(await screen.findByText('首页内容')).toBeInTheDocument();
  });

  // ──── 通知铃铛 ────

  it('shows notification icon when authenticated', () => {
    renderWithAuth({ isAuthenticated: true, user: mockUser });
    expect(screen.getByTestId('NotificationsOutlinedIcon')).toBeInTheDocument();
  });

  it('hides notification icon when not authenticated', () => {
    renderWithAuth({ isAuthenticated: false });
    expect(screen.queryByTestId('NotificationsOutlinedIcon')).not.toBeInTheDocument();
  });

  it('navigates to /notifications when clicking notification bell', async () => {
    renderWithAuth({ isAuthenticated: true, user: mockUser });
    await userEvent.click(screen.getByTestId('NotificationsOutlinedIcon'));
    expect(await screen.findByText('通知页')).toBeInTheDocument();
  });

  it('shows unread badge count when notifications exist', async () => {
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0, unreadCount: 3, page: 1, pageSize: 1 },
      error: null,
    });
    renderWithAuth({ isAuthenticated: true, user: mockUser });
    const badge = await waitFor(() => document.querySelector('.MuiBadge-badge'));
    expect(badge).toBeTruthy();
  });

  // ──── 用户菜单 ────

  it('opens user menu when clicking avatar', async () => {
    renderWithAuth({ isAuthenticated: true, user: mockUser });
    await userEvent.click(screen.getByText('测'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('测试用户')).toBeInTheDocument();
    expect(screen.getByText('个人资料')).toBeInTheDocument();
    expect(screen.getByText('退出登录')).toBeInTheDocument();
  });

  it('navigates to profile when clicking "个人资料" in menu', async () => {
    renderWithAuth({ isAuthenticated: true, user: mockUser });
    await userEvent.click(screen.getByText('测'));
    await userEvent.click(screen.getByText('个人资料'));
    expect(await screen.findByText('个人资料')).toBeInTheDocument();
  });

  it('calls logout and navigates to /login when clicking "退出登录"', async () => {
    const mockLogout = vi.fn();
    renderWithAuth({ isAuthenticated: true, user: mockUser, logout: mockLogout });
    await userEvent.click(screen.getByText('测'));
    await userEvent.click(screen.getByText('退出登录'));
    expect(mockLogout).toHaveBeenCalledOnce();
    expect(await screen.findByText('登录页')).toBeInTheDocument();
  });

  // ──── 管理后台权限 ────

  it('shows "管理后台" menu item for admin users', async () => {
    renderWithAuth({ isAuthenticated: true, user: adminUser });
    await userEvent.click(screen.getByText('管'));
    expect(screen.getByText('管理后台')).toBeInTheDocument();
  });

  it('hides "管理后台" menu item for non-admin users', async () => {
    renderWithAuth({ isAuthenticated: true, user: mockUser });
    await userEvent.click(screen.getByText('测'));
    expect(screen.queryByText('管理后台')).not.toBeInTheDocument();
  });
});
