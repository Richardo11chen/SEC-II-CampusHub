import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import type { UserProfile } from '@/types';
import ProtectedRoute from '../ProtectedRoute';

const mockUser: UserProfile = {
  id: 1, nickname: 'test', studentId: '2024000001',
  creditScore: 70, role: 'student', status: '正常', showRealName: false,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderWithAuth(auth: Partial<AuthContextType>) {
  const mockAuth: AuthContextType = {
    user: null,
    accessToken: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...auth,
  };

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <AuthContext.Provider value={mockAuth}>
        <Routes>
          <Route path="/login" element={<div>登录页</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>受保护内容</div>} />
          </Route>
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows loading spinner when loading', () => {
    renderWithAuth({ isLoading: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderWithAuth({ isAuthenticated: false });
    expect(screen.getByText('登录页')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    renderWithAuth({ isAuthenticated: true, user: mockUser });
    expect(screen.getByText('受保护内容')).toBeInTheDocument();
  });
});
