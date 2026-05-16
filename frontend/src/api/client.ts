import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ---- refresh 回调注入 ---- */

let refreshHandler: ((refreshToken: string) => Promise<{ token: string; refreshToken: string }>) | null = null;

export function setRefreshHandler(
  handler: (refreshToken: string) => Promise<{ token: string; refreshToken: string }>,
) {
  refreshHandler = handler;
}

export function clearRefreshHandler() {
  refreshHandler = null;
}

/* ---- 刷新队列（防并发） ---- */

let pendingRefresh: Promise<{ token: string; refreshToken: string }> | null = null;

function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem('refreshToken');
  } catch {
    return null;
  }
}

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return url.startsWith('/auth/');
}

/* ---- 请求拦截器：自动加 token ---- */

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---- 响应拦截器：401 自动刷新 ---- */

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // 不是 401 或已重试过，直接拒绝
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // 认证相关接口出现 401 不尝试刷新（避免死循环）
    if (isAuthEndpoint(originalRequest.url)) {
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    }

    const refreshToken = getStoredRefreshToken();
    if (!refreshHandler || !refreshToken) {
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // 用已有 pending 刷新请求防并发
    if (!pendingRefresh) {
      pendingRefresh = refreshHandler(refreshToken).finally(() => {
        pendingRefresh = null;
      });
    }

    try {
      const { token } = await pendingRefresh;
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch {
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    }
  },
);

export default api;
