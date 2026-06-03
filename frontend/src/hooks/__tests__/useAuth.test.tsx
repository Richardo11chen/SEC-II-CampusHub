import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthContext } from '@/store/authContext';
import type { AuthContextType } from '@/store/authContext';

describe('useAuth', () => {
  it('returns auth context when used within AuthProvider', () => {
    const mockCtx: AuthContextType = {
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthContext.Provider value={mockCtx}>{children}</AuthContext.Provider>
      ),
    });

    expect(result.current).toBe(mockCtx);
  });

  it('throws error when used outside AuthProvider', () => {
    // React 19 下 renderHook 直接抛出同步错误
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });
});
