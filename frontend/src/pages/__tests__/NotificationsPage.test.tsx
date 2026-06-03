import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationsPage from '../NotificationsPage';
import * as notifApi from '@/api/notifications';
import type { Notification } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/api/notifications', () => ({ getNotifications: vi.fn(), markNotificationRead: vi.fn() }));

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1, type: 'order_taken', title: '有新接单', content: '你的需求已被接单',
    relatedId: 42, isRead: false, createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderPage() {
  return render(<NotificationsPage />);
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0, unreadCount: 0 }, error: null,
    });
  });

  // ──── loading / error / empty ────

  it('shows spinner while loading', () => {
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error alert on load failure', async () => {
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '网络错误' });
    renderPage();
    expect(await screen.findByText('网络错误')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    renderPage();
    expect(await screen.findByText('暂无通知')).toBeInTheDocument();
  });

  it('shows "没有未读通知" when unread filter is active and no unread', async () => {
    renderPage();
    await screen.findByText('暂无通知');
    await userEvent.click(screen.getByText('未读'));
    expect(screen.getByText('没有未读通知')).toBeInTheDocument();
  });

  // ──── 列表渲染 ────

  it('renders notification list', async () => {
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeNotif()], total: 1, unreadCount: 1 }, error: null,
    });
    renderPage();
    expect(await screen.findByText('有新接单')).toBeInTheDocument();
    expect(screen.getByText('你的需求已被接单')).toBeInTheDocument();
    expect(screen.getByText('接单')).toBeInTheDocument(); // type label
  });

  it('marks notification as read and dispatches event on click', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeNotif({ id: 1, isRead: false })], total: 1, unreadCount: 1 }, error: null,
    });
    (notifApi.markNotificationRead as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    renderPage();
    await screen.findByText('有新接单');
    await userEvent.click(screen.getByText('有新接单'));
    await waitFor(() => expect(notifApi.markNotificationRead).toHaveBeenCalledWith(1));
    expect(dispatchSpy).toHaveBeenCalledWith(new Event('notifications:update'));
  });

  it('navigates to /orders/:id for non-message notifications', async () => {
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeNotif({ id: 1, type: 'order_taken', relatedId: 42 })], total: 1, unreadCount: 1 }, error: null,
    });
    (notifApi.markNotificationRead as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    renderPage();
    await screen.findByText('有新接单');
    await userEvent.click(screen.getByText('有新接单'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/orders/42'));
  });

  it('navigates to /orders/:id/chat for new_message type', async () => {
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeNotif({ id: 1, type: 'new_message', relatedId: 42, title: '新消息' })], total: 1, unreadCount: 1 }, error: null,
    });
    renderPage();
    await screen.findByText('新消息');
    await userEvent.click(screen.getByText('新消息'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/orders/42/chat'));
  });

  // ──── 未读标记 ────

  it('shows unread indicator (dot + bold title) for unread notifications', async () => {
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeNotif({ id: 1, isRead: false }), makeNotif({ id: 2, isRead: true, title: '已读通知' })], total: 2, unreadCount: 1 }, error: null,
    });
    renderPage();
    expect(await screen.findByText('有新接单')).toBeInTheDocument();
    expect(screen.getByText('已读通知')).toBeInTheDocument();
  });

  // ──── 筛选 ────

  it('filters to show only unread notifications', async () => {
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        items: [
          makeNotif({ id: 1, title: '未读的', isRead: false }),
          makeNotif({ id: 2, title: '已读的', isRead: true }),
        ], total: 2, unreadCount: 1,
      }, error: null,
    });
    renderPage();
    await screen.findByText('未读的');
    expect(screen.getByText('已读的')).toBeInTheDocument();
    await userEvent.click(screen.getByText('未读'));
    expect(screen.getByText('未读的')).toBeInTheDocument();
    expect(screen.queryByText('已读的')).not.toBeInTheDocument();
  });

  // ──── 查看按钮 ────

  it('navigates via "查看" button without marking read', async () => {
    (notifApi.getNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeNotif({ id: 1, type: 'order_completed', isRead: false })], total: 1, unreadCount: 1 }, error: null,
    });
    (notifApi.markNotificationRead as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    renderPage();
    await screen.findByText('完成');
    await userEvent.click(screen.getByText('查看'));
    expect(notifApi.markNotificationRead).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/orders/42');
  });
});
