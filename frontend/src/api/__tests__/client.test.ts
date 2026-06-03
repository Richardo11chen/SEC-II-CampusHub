import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ── mock axios 必须在 import 之前 ──

const { mockAxiosInstance, mockRequestUse, mockResponseUse } = vi.hoisted(() => {
  const _requestUse = vi.fn();
  const _responseUse = vi.fn();
  const _instance = Object.assign(vi.fn(), {
    interceptors: {
      request: { use: _requestUse },
      response: { use: _responseUse },
    },
  });
  return {
    mockAxiosInstance: _instance,
    mockRequestUse: _requestUse,
    mockResponseUse: _responseUse,
  };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

// ── import 被测模块 ──

import { setRefreshHandler, clearRefreshHandler } from '../client';

describe('API Client', () => {
  let requestCallback: (config: Record<string, unknown>) => Record<string, unknown>;
  let responseErrorCallback: (error: unknown) => Promise<unknown>;

  beforeAll(() => {
    requestCallback = mockRequestUse.mock.calls[0][0];
    responseErrorCallback = mockResponseUse.mock.calls[0][1];
  });

  beforeEach(() => {
    localStorage.clear();
    clearRefreshHandler();
    vi.clearAllMocks();
    mockAxiosInstance.mockReset();
  });

  // ──────────────────────────────
  // 请求拦截器
  // ──────────────────────────────

  describe('request interceptor', () => {
    it('adds Authorization header when accessToken exists', () => {
      localStorage.setItem('accessToken', 'my-token');
      const config = { headers: {} as Record<string, string> };
      const result = requestCallback(config);
      const headers = result.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer my-token');
    });

    it('does not add Authorization header when no token', () => {
      const config = { headers: {} as Record<string, string> };
      const result = requestCallback(config);
      const headers = result.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('does not fail when config.headers is undefined', () => {
      localStorage.setItem('accessToken', 'my-token');
      const config = {};
      const result = requestCallback(config);
      expect(result).toBe(config);
    });
  });

  // ──────────────────────────────
  // 响应拦截器 — 401 自动刷新
  // ─────────────────────────────-

  describe('response error interceptor (401 refresh)', () => {
    function makeError(overrides: Record<string, unknown> = {}) {
      return {
        response: { status: 401 },
        config: { url: '/api/demands', headers: {} },
        ...overrides,
      };
    }

    it('passes through non-401 errors', async () => {
      const err = makeError({ response: { status: 500 } });
      await expect(responseErrorCallback(err)).rejects.toEqual(err);
    });

    it('passes through 401 when already retried (_retry=true)', async () => {
      const err = makeError({ config: { url: '/api/demands', headers: {}, _retry: true } });
      await expect(responseErrorCallback(err)).rejects.toEqual(err);
    });

    it('dispatches auth:logout for 401 on auth endpoints', async () => {
      const spy = vi.spyOn(window, 'dispatchEvent');
      const err = makeError({ config: { url: '/auth/login', headers: {} } });
      await expect(responseErrorCallback(err)).rejects.toEqual(err);
      expect(spy).toHaveBeenCalledWith(new Event('auth:logout'));
    });

    it('dispatches auth:logout when no refreshHandler is set', async () => {
      const spy = vi.spyOn(window, 'dispatchEvent');
      const err = makeError();
      await expect(responseErrorCallback(err)).rejects.toEqual(err);
      expect(spy).toHaveBeenCalledWith(new Event('auth:logout'));
    });

    it('dispatches auth:logout when no refreshToken in localStorage', async () => {
      const spy = vi.spyOn(window, 'dispatchEvent');
      setRefreshHandler(vi.fn().mockResolvedValue({ token: 'x', refreshToken: 'y' }));
      const err = makeError();
      await expect(responseErrorCallback(err)).rejects.toEqual(err);
      expect(spy).toHaveBeenCalledWith(new Event('auth:logout'));
    });

    it('refresh succeeds: retries original request with new token', async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ token: 'new-at', refreshToken: 'new-rt' });
      setRefreshHandler(mockRefresh);
      localStorage.setItem('refreshToken', 'old-rt');

      const retryData = { data: 'retried' };
      mockAxiosInstance.mockResolvedValue(retryData);

      const err = makeError();
      const result = await responseErrorCallback(err);

      expect(mockRefresh).toHaveBeenCalledWith('old-rt');
      expect((err.config as Record<string, unknown>).headers).toHaveProperty('Authorization', 'Bearer new-at');
      expect(result).toBe(retryData);
    });

    it('refresh fails: dispatches auth:logout and rejects', async () => {
      const spy = vi.spyOn(window, 'dispatchEvent');
      setRefreshHandler(vi.fn().mockRejectedValue(new Error('network error')));
      localStorage.setItem('refreshToken', 'old-rt');

      const err = makeError();
      await expect(responseErrorCallback(err)).rejects.toEqual(err);
      expect(spy).toHaveBeenCalledWith(new Event('auth:logout'));
    });

    it('only calls refreshHandler once for concurrent 401s (queue)', async () => {
      let callCount = 0;
      const mockRefresh = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({ token: 'new-at', refreshToken: 'new-rt' });
      });
      setRefreshHandler(mockRefresh);
      localStorage.setItem('refreshToken', 'old-rt');
      mockAxiosInstance.mockResolvedValue({ data: 'ok' });

      const err1 = makeError({ config: { url: '/api/demands/1', headers: {} } });
      const err2 = makeError({ config: { url: '/api/demands/2', headers: {} } });

      await Promise.all([
        responseErrorCallback(err1),
        responseErrorCallback(err2),
      ]);

      expect(callCount).toBe(1);
    });
  });

  // ──────────────────────────────
  // setRefreshHandler / clearRefreshHandler
  // ─────────────────────────────-

  describe('setRefreshHandler / clearRefreshHandler', () => {
    it('setRefreshHandler can be called without error', () => {
      setRefreshHandler(vi.fn());
    });

    it('clearRefreshHandler after setRefreshHandler resets the handler', () => {
      setRefreshHandler(vi.fn());
      clearRefreshHandler();
    });

    it('clearRefreshHandler can be called without setRefreshHandler first', () => {
      clearRefreshHandler();
    });
  });
});
