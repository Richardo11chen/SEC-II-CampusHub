import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import type { UserProfile } from '@/types';
import Layout from '../Layout';

const mockUser: UserProfile = {
  id: 1, nickname: '测试用户', studentId: '2024123456',
  creditScore: 70, role: 'student', showRealName: false,
  createdAt: '2026-01-01T00:00:00Z',
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
          </Route>
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
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
    renderWithAuth({
      isAuthenticated: true,
      user: mockUser,
    });
    expect(screen.queryByTestId('LoginIcon')).not.toBeInTheDocument();
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
});
