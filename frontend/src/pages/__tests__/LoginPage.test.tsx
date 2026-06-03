import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import LoginPage from '../LoginPage';

const mockLogin = vi.fn();
let resolveLogin: ((value: unknown) => void) | null = null;

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
  beforeEach(() => {
    mockLogin.mockReset();
    // 默认 resolve 以通过 loading 态
    mockLogin.mockResolvedValue(undefined);
  });

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

  it('shows loading state while logging in', async () => {
    mockLogin.mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve; }));
    renderPage();
    await userEvent.type(screen.getByLabelText('学号'), '2024123456');
    await userEvent.type(screen.getByLabelText('密码'), 'pass1234');

    const btn = screen.getByRole('button', { name: '登录' });
    await userEvent.click(btn);

    expect(await screen.findByText('登录中…')).toBeInTheDocument();
    expect(btn).toBeDisabled();

    resolveLogin!(undefined);
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('学号或密码错误'));
    renderPage();
    await userEvent.type(screen.getByLabelText('学号'), '2024123456');
    await userEvent.type(screen.getByLabelText('密码'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByText('学号或密码错误')).toBeInTheDocument();
  });

  it('shows generic fallback error for non-Error rejection', async () => {
    mockLogin.mockRejectedValue('raw string');
    renderPage();
    await userEvent.type(screen.getByLabelText('学号'), '2024123456');
    await userEvent.type(screen.getByLabelText('密码'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByText('登录失败')).toBeInTheDocument();
  });
});
