import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import ProtectedRoute from '../ProtectedRoute';

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
    renderWithAuth({ isAuthenticated: true, user: { id: 1, nickname: 'test', creditScore: 70, role: 'student' } as any });
    expect(screen.getByText('受保护内容')).toBeInTheDocument();
  });
});
