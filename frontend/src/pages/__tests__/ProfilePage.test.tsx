import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserProfile } from '@/types';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import ProfilePage from '../ProfilePage';
import * as usersApi from '@/api/users';
import * as uploadApi from '@/api/upload';

vi.mock('@/api/users', () => ({ updateMe: vi.fn() }));
vi.mock('@/api/upload', () => ({ uploadImage: vi.fn() }));

const mockUser: UserProfile = {
  id: 1, nickname: '测试用户', studentId: '2024123456',
  college: '计算机科学与技术系', phone: '13812345678',
  email: 'test@nju.edu.cn', name: '张三', showRealName: true,
  creditScore: 70, role: 'student', status: '正常',
  avatar: undefined, createdAt: '2026-01-01T00:00:00Z',
};

function renderPage(auth: Partial<AuthContextType> = {}) {
  const mockAuth: AuthContextType = {
    user: mockUser, accessToken: 'x', isLoading: false, isAuthenticated: true,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
    ...auth,
  };
  return render(
    <AuthContext.Provider value={mockAuth}>
      <ProfilePage />
    </AuthContext.Provider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── 基本渲染 ────

  it('returns null when no user', () => {
    const { container } = renderPage({ user: null, isAuthenticated: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders avatar, nickname and credit score in view mode', () => {
    renderPage();
    expect(screen.getByText('测试用户')).toBeInTheDocument();
    expect(screen.getByText('信用分 70')).toBeInTheDocument();
  });

  it('renders info rows with masked values', () => {
    renderPage();
    // studentId mask: 2024****456
    expect(screen.getByText('2024****456')).toBeInTheDocument();
    // phone mask: 138****5678
    expect(screen.getByText('138****5678')).toBeInTheDocument();
    expect(screen.getByText('test@nju.edu.cn')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('shows "编辑" button in view mode', () => {
    renderPage();
    expect(screen.getByText('编辑')).toBeInTheDocument();
  });

  // ──── 编辑模式 ────

  it('switches to edit mode when clicking 编辑', async () => {
    renderPage();
    await userEvent.click(screen.getByText('编辑'));
    expect(screen.getByDisplayValue('测试用户')).toBeInTheDocument();
    expect(screen.getByDisplayValue('计算机科学与技术系')).toBeInTheDocument();
    expect(screen.getByDisplayValue('13812345678')).toBeInTheDocument();
    expect(screen.getByText('保存')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('cancels edit mode and reverts to view', async () => {
    renderPage();
    await userEvent.click(screen.getByText('编辑'));
    await userEvent.click(screen.getByText('取消'));
    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.queryByText('保存')).not.toBeInTheDocument();
  });

  // ──── 校验 ────

  it('shows error when nickname is empty', async () => {
    renderPage();
    await userEvent.click(screen.getByText('编辑'));
    const nicknameInput = screen.getByDisplayValue('测试用户');
    await userEvent.clear(nicknameInput);
    await userEvent.click(screen.getByText('保存'));
    expect(screen.getByText('昵称不能为空')).toBeInTheDocument();
  });

  it('shows error when phone is invalid', async () => {
    renderPage();
    await userEvent.click(screen.getByText('编辑'));
    const phoneInput = screen.getByDisplayValue('13812345678');
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '123');
    await userEvent.click(screen.getByText('保存'));
    expect(screen.getByText('手机号格式不正确')).toBeInTheDocument();
  });

  // ──── 保存 ────

  it('saves successfully and calls updateUser', async () => {
    const mockUpdateUser = vi.fn();
    (usersApi.updateMe as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockUser, error: null });
    renderPage({ updateUser: mockUpdateUser });
    await userEvent.click(screen.getByText('编辑'));
    await userEvent.click(screen.getByText('保存'));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith(mockUser));
    expect(await screen.findByText('保存成功')).toBeInTheDocument();
  });

  it('shows error snackbar on save failure', async () => {
    (usersApi.updateMe as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '学号已存在' });
    renderPage();
    await userEvent.click(screen.getByText('编辑'));
    await userEvent.click(screen.getByText('保存'));
    expect(await screen.findByText('学号已存在')).toBeInTheDocument();
  });

  // ──── 头像上传 ────

  it('uploads avatar and calls updateUser', async () => {
    const mockUpdateUser = vi.fn();
    (uploadApi.uploadImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { url: '/uploads/avatar.jpg' }, error: null,
    });
    (usersApi.updateMe as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...mockUser, avatar: '/uploads/avatar.jpg' }, error: null,
    });
    renderPage({ updateUser: mockUpdateUser });

    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    const file = new File([''], 'avatar.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    await waitFor(() => expect(uploadApi.uploadImage).toHaveBeenCalled());
    expect(await screen.findByText('头像更新成功')).toBeInTheDocument();
  });
});
