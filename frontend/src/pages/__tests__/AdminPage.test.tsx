import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import type { UserProfile } from '@/types';
import AdminPage from '../AdminPage';
import * as adminApi from '@/api/admin';

vi.mock('@/api/admin', () => ({
  getStatistics: vi.fn(),
  getAdminUsers: vi.fn(),
  toggleUserStatus: vi.fn(),
  getAdminDemands: vi.fn(),
  deleteAdminDemand: vi.fn(),
  getDisputes: vi.fn(),
  resolveDispute: vi.fn(),
  getApplications: vi.fn(),
  reviewApplication: vi.fn(),
}));

const adminUser: UserProfile = {
  id: 1, nickname: '管理员', studentId: '1',
  creditScore: 0, role: 'admin', status: '正常', showRealName: false, createdAt: '',
};
const normalUser: UserProfile = {
  ...adminUser, nickname: '普通用户', role: 'student', id: 2,
};

function renderPage(user: UserProfile | null = adminUser) {
  const mockAuth: AuthContextType = {
    user, accessToken: 'x', isLoading: false, isAuthenticated: !!user,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={mockAuth}>
      <AdminPage />
    </AuthContext.Provider>,
  );
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.getStatistics as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { totalUsers: 100, dailyActiveUsers: 30, totalOrders: 200, completedOrders: 80, pendingDisputes: 5 }, error: null,
    });
    (adminApi.getAdminUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [{ id: 10, nickname: '用户A', studentId: '2024000001', creditScore: 70, role: 'student', status: '正常' }], pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }, error: null,
    });
    (adminApi.getAdminDemands as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [{ id: 42, title: '需求X', category: '快递代取', status: '开放', reward: 20, createdAt: '2026-06-03T10:00:00.000Z' }], pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }, error: null,
    });
    (adminApi.getDisputes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [{ id: 7, initiator: { nickname: '用户A' }, reason: '未付款', status: '待处理', createdAt: '2026-06-03T10:00:00.000Z' }], pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }, error: null,
    });
    (adminApi.getApplications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [{ id: 3, applicant: { nickname: '申请者', studentId: '2024123456' }, reason: '想当管理员', status: '待审批', createdAt: '2026-06-03T10:00:00.000Z' }], pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }, error: null,
    });
    (adminApi.resolveDispute as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    (adminApi.reviewApplication as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
  });

  // ──── 权限 ────

  it('shows "无权访问" for non-admin users', () => {
    renderPage(normalUser);
    expect(screen.getByText('无权访问管理后台')).toBeInTheDocument();
  });

  it('renders admin dashboard for admin users', async () => {
    renderPage();
    expect(await screen.findByText('管理后台')).toBeInTheDocument();
    expect(screen.getByText('概览')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('需求管理')).toBeInTheDocument();
    expect(screen.getByText('纠纷处理')).toBeInTheDocument();
    expect(screen.getByText('管理员申请')).toBeInTheDocument();
  });

  // ──── 概览 Tab ────

  it('shows statistics cards on stats tab', async () => {
    renderPage();
    expect(await screen.findByText('总用户')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('待处理纠纷')).toBeInTheDocument();
  });

  // ──── 用户管理 Tab ────

  it('shows users table in users tab', async () => {
    renderPage();
    await screen.findByText('总用户');
    await userEvent.click(screen.getByText('用户管理'));
    expect(await screen.findByText('用户A')).toBeInTheDocument();
    expect(screen.getByText('2024****001')).toBeInTheDocument();
    expect(screen.getByText('student')).toBeInTheDocument();
  });

  // ──── 需求管理 Tab ────

  it('shows demands table in demands tab', async () => {
    renderPage();
    await screen.findByText('总用户');
    await userEvent.click(screen.getByText('需求管理'));
    expect(await screen.findByText('需求X')).toBeInTheDocument();
    expect(screen.getByText('快递代取')).toBeInTheDocument();
  });

  // ──── 纠纷处理 Tab ────

  it('shows disputes and resolves via dialog', async () => {
    renderPage();
    await screen.findByText('总用户');
    await userEvent.click(screen.getByText('纠纷处理'));
    expect(await screen.findByText('未付款')).toBeInTheDocument();
    await userEvent.click(screen.getByText('处理'));
    await userEvent.type(screen.getByLabelText('处理结果'), '已退款');
    await userEvent.click(screen.getByText('标记完成'));
    await waitFor(() => expect(adminApi.resolveDispute).toHaveBeenCalledWith(7, '已退款', 'complete'));
  });

  // ──── 管理员申请 Tab ────

  it('shows applications and approves one', async () => {
    renderPage();
    await screen.findByText('总用户');
    await userEvent.click(screen.getByText('管理员申请'));
    expect(await screen.findByText('申请者')).toBeInTheDocument();
    expect(screen.getByText('想当管理员')).toBeInTheDocument();
    // 通过申请
    await userEvent.click(screen.getByTitle('通过'));
    await waitFor(() => expect(adminApi.reviewApplication).toHaveBeenCalledWith(3, 'approve'));
  });

  it('rejects application', async () => {
    renderPage();
    await screen.findByText('总用户');
    await userEvent.click(screen.getByText('管理员申请'));
    await screen.findByText('申请者');
    await userEvent.click(screen.getByTitle('拒绝'));
    await waitFor(() => expect(adminApi.reviewApplication).toHaveBeenCalledWith(3, 'reject'));
  });
});
