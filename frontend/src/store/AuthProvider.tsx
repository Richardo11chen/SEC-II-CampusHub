import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { login as loginApi, register as registerApi, refresh as refreshApi, logout as logoutApi } from '@/api/auth';
import { getMe } from '@/api/users';
import { setRefreshHandler, clearRefreshHandler } from '@/api/client';
import { AuthContext } from './authContext';
import type { UserProfile, LoginInput, RegisterInput } from '@/types';

/* ---- helpers ---- */

function loadTokens() {
  try {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function saveTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

function clearStoredTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

type AuthState = {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

function createInitialState(): AuthState {
  const tokens = loadTokens();
  if (!tokens.accessToken) {
    return { user: null, accessToken: null, isLoading: false, isAuthenticated: false };
  }
  return { user: null, accessToken: tokens.accessToken, isLoading: true, isAuthenticated: false };
}

/* ---- provider ---- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(createInitialState);

  /* ---- 恢复会话 ---- */
  useEffect(() => {
    if (!state.accessToken) return;

    let cancelled = false;

    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.data) {
          setState({ user: me.data, accessToken: state.accessToken!, isAuthenticated: true, isLoading: false });
          return;
        }

        const tokens = loadTokens();
        if (!tokens.refreshToken) throw new Error('no refresh token');

        const ref = await refreshApi(tokens.refreshToken);
        if (cancelled) return;
        if (!ref.data) throw new Error('refresh failed');

        saveTokens(ref.data.token, ref.data.refreshToken);

        const me2 = await getMe();
        if (cancelled) return;
        if (me2.data) {
          setState({ user: me2.data, accessToken: ref.data.token, isAuthenticated: true, isLoading: false });
        } else {
          throw new Error('getMe failed after refresh');
        }
      } catch {
        if (!cancelled) {
          clearStoredTokens();
          setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- 注册 axios 刷新回调 & auth:logout 事件 ---- */
  useEffect(() => {
    setRefreshHandler(async (rt: string) => {
      const res = await refreshApi(rt);
      if (!res.data) throw new Error('refresh failed');
      saveTokens(res.data.token, res.data.refreshToken);
      setState((prev) => ({ ...prev, accessToken: res.data!.token }));
      return { token: res.data.token, refreshToken: res.data.refreshToken };
    });

    const forceLogout = () => {
      clearStoredTokens();
      setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    };
    window.addEventListener('auth:logout', forceLogout);

    return () => {
      clearRefreshHandler();
      window.removeEventListener('auth:logout', forceLogout);
    };
  }, []);

  /* ---- actions ---- */

  const login = useCallback(async (input: LoginInput) => {
    const res = await loginApi(input);
    if (!res.data) throw new Error(res.error || '登录失败');
    saveTokens(res.data.token, res.data.refreshToken);
    setState({ user: res.data.user, accessToken: res.data.token, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await registerApi(input);
    if (!res.data) throw new Error(res.error || '注册失败');
    return res.data as unknown as UserProfile;
  }, []);

  const logout = useCallback(async () => {
    try {
      const rt = localStorage.getItem('refreshToken');
      if (rt) await logoutApi(rt);
    } catch { /* ignore */ }
    clearStoredTokens();
    setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  }, []);

  const updateUser = useCallback((user: UserProfile) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
