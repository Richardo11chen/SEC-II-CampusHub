import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import LoginPage from '../LoginPage';

const mockLogin = vi.fn();

const mockAuth: AuthContextType = {
  user: null,
  accessToken: null,
  isLoading: false,
  isAuthenticated: false,
  login: mockLogin,
  register: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuth}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('renders login form with heading and button', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByLabelText('学号')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('shows error on empty submit', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(screen.getByText('请填写学号和密码')).toBeInTheDocument();
  });

  it('has link to register page', () => {
    renderPage();
    expect(screen.getByText('立即注册')).toBeInTheDocument();
    expect(screen.getByText('立即注册').closest('a')).toHaveAttribute('href', '/register');
  });

  it('calls login when form is filled', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('学号'), '2024123456');
    await userEvent.type(screen.getByLabelText('密码'), 'pass1234');
    await userEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(mockLogin).toHaveBeenCalledWith({ studentId: '2024123456', password: 'pass1234' });
  });
});
