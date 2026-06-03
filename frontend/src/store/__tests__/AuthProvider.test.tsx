import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { AuthProvider } from '../AuthProvider';
import { AuthContext } from '../authContext';

// ── mock API modules ──

vi.mock('@/api/auth', () => ({ login: vi.fn(), register: vi.fn(), refresh: vi.fn(), logout: vi.fn() }));
vi.mock('@/api/users', () => ({ getMe: vi.fn() }));

import * as authApi from '@/api/auth';
import * as usersApi from '@/api/users';

// ── helpers ──

const mockUser = {
  id: 1, nickname: '测试', studentId: '2024000001',
  creditScore: 70, role: 'student' as const, status: '正常', showRealName: false,
  createdAt: '2026-01-01T00:00:00Z',
};

/** 测试组件：消费 AuthContext 并暴露按钮触发 action */
function TestConsumer() {
  const ctx = useContext(AuthContext);
  if (!ctx) return null;
  return (
    <div>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
      <span data-testid="authenticated">{String(ctx.isAuthenticated)}</span>
      <span data-testid="username">{ctx.user?.nickname || '-'}</span>
      <button data-testid="btn-login" onClick={() => ctx.login({ studentId: 's1', password: 'p1' })}>login</button>
      <button data-testid="btn-logout" onClick={() => ctx.logout()}>logout</button>
      <button
        data-testid="btn-update"
        onClick={() => ctx.updateUser({ ...mockUser, nickname: '新昵称' })}
      >update</button>
    </div>
  );
}

function renderApp() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

// ── tests ──

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ──── 初始状态 ────

  describe('initial state', () => {
    it('starts unauthenticated when no token in storage', () => {
      renderApp();
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('username')).toHaveTextContent('-');
    });

    it('starts loading when accessToken exists in storage', () => {
      localStorage.setItem('accessToken', 'some-token');
      renderApp();
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  // ──── 会话恢复 ────

  describe('session restore', () => {
    it('restores session from valid access token', async () => {
      localStorage.setItem('accessToken', 'valid-token');
      (usersApi.getMe as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockUser, error: null });

      renderApp();

      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('username')).toHaveTextContent('测试');
    });

    it('refreshes token and restores session when access token expired', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('refreshToken', 'valid-refresh');

      // getMe 返回 { data: null } 表示 token 失效（不会 throw）
      (usersApi.getMe as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: null, error: 'token expired' })
        .mockResolvedValueOnce({ data: mockUser, error: null });
      (authApi.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'new-token', refreshToken: 'new-refresh' },
        error: null,
      });

      renderApp();

      await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));
      expect(screen.getByTestId('username')).toHaveTextContent('测试');
      expect(localStorage.getItem('accessToken')).toBe('new-token');
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
    });

    it('clears auth state when both token and refresh fail', async () => {
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('refreshToken', 'bad-refresh');

      (usersApi.getMe as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: 'unauthorized' });
      (authApi.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: 'invalid' });

      renderApp();

      await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  // ──── login ────

  describe('login', () => {
    it('logs in successfully and saves tokens', async () => {
      (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'at-1', refreshToken: 'rt-1', user: mockUser },
        error: null,
      });

      renderApp();
      await userEvent.click(screen.getByTestId('btn-login'));

      await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));
      expect(screen.getByTestId('username')).toHaveTextContent('测试');
      expect(localStorage.getItem('accessToken')).toBe('at-1');
      expect(localStorage.getItem('refreshToken')).toBe('rt-1');
    });

    it('throws on login API error and stays unauthenticated', async () => {
      (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null, error: '账号不存在',
      });

      // login 的 throw 是异步的，React 不捕获 → 出现 unhandled rejection
      // 这里用 process.on 临时屏蔽，避免 vitest 报 unhandled error
      const rejectionHandler = vi.fn();
      process.on('unhandledRejection', rejectionHandler);

      renderApp();
      await userEvent.click(screen.getByTestId('btn-login'));
      await vi.waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });

      process.off('unhandledRejection', rejectionHandler);
    });
  });

  // ──── logout ────

  describe('logout', () => {
    it('clears tokens and state on logout', async () => {
      // 先登录
      (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'at-1', refreshToken: 'rt-1', user: mockUser },
        error: null,
      });
      renderApp();
      await userEvent.click(screen.getByTestId('btn-login'));
      await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));

      // 再登出
      (authApi.logout as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
      await userEvent.click(screen.getByTestId('btn-logout'));

      await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(authApi.logout).toHaveBeenCalledWith('rt-1');
    });
  });

  // ──── auth:logout 事件 ────

  describe('auth:logout event', () => {
    it('force-logouts when auth:logout event is dispatched', async () => {
      // 先登录
      (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'at-1', refreshToken: 'rt-1', user: mockUser },
        error: null,
      });
      renderApp();
      await userEvent.click(screen.getByTestId('btn-login'));
      await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));

      // 触发 auth:logout 事件（客户端 interceptor 发现 401 无法刷新时 dispatch）
      window.dispatchEvent(new Event('auth:logout'));

      await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  // ──── register ────

  describe('register', () => {
    it('calls registerApi and returns user', async () => {
      (authApi.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockUser, error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any = null;
      function RegisterTester() {
        const ctx = useContext(AuthContext);
        return <button onClick={async () => { result = await ctx!.register({ studentId: 's1', password: 'p1', nickname: 'n1' }); }}>do-register</button>;
      }
      render(
        <AuthProvider>
          <RegisterTester />
        </AuthProvider>,
      );

      await userEvent.click(screen.getByText('do-register'));
      await vi.waitFor(() => expect(result).not.toBeNull());
      expect(result).toMatchObject({ nickname: '测试' });
    });
  });

  // ──── updateUser ────

  describe('updateUser', () => {
    it('updates user in state', async () => {
      // 先登录
      (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'at-1', refreshToken: 'rt-1', user: mockUser },
        error: null,
      });
      renderApp();
      await userEvent.click(screen.getByTestId('btn-login'));
      await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('测试'));

      // 更新用户
      await userEvent.click(screen.getByTestId('btn-update'));
      expect(screen.getByTestId('username')).toHaveTextContent('新昵称');
    });
  });
});
