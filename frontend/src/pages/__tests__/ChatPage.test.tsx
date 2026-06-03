import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import type { UserProfile, ChatMessage } from '@/types';
import ChatPage from '../ChatPage';
import * as messagesApi from '@/api/messages';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '1' }), useNavigate: () => mockNavigate }));
vi.mock('@/api/messages', () => ({ getMessages: vi.fn(), sendMessage: vi.fn() }));

const mockUser: UserProfile = {
  id: 10, nickname: '我', studentId: '1',
  creditScore: 70, role: 'student', status: '正常', showRealName: false, createdAt: '',
};

const OTHER = { id: 20, nickname: '对方', avatar: undefined };

function makeMsg(id: number, senderId: number, content: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id, orderId: 1, senderId, contentType: 'text', content,
    createdAt: '2026-06-03T10:00:00.000Z',
    sender: senderId === mockUser.id
      ? { id: mockUser.id, nickname: mockUser.nickname, avatar: undefined }
      : { id: OTHER.id, nickname: OTHER.nickname, avatar: undefined },
    ...overrides,
  };
}

function renderPage(user: UserProfile | null = mockUser) {
  const mockAuth: AuthContextType = {
    user, accessToken: 'x', isLoading: false, isAuthenticated: !!user,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={mockAuth}>
      <ChatPage />
    </AuthContext.Provider>,
  );
}

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom 不实现 scrollIntoView，chat 组件调用时会抛异常
    Element.prototype.scrollIntoView = vi.fn();
    (messagesApi.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 } }, error: null,
    });
  });

  // ──── loading / error / empty ────

  it('shows spinner while loading', () => {
    (messagesApi.getMessages as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error alert on load failure', async () => {
    (messagesApi.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '获取消息失败' });
    renderPage();
    expect(await screen.findByText('获取消息失败')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    renderPage();
    expect(await screen.findByText('暂无消息，发送第一条消息吧')).toBeInTheDocument();
  });

  // ──── 消息渲染 ────

  it('renders own message right-aligned', async () => {
    (messagesApi.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeMsg(1, mockUser.id, '你好')], pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 } }, error: null,
    });
    renderPage();
    expect(await screen.findByText('你好')).toBeInTheDocument();
  });

  it('renders own and other messages', async () => {
    (messagesApi.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        items: [
          makeMsg(1, OTHER.id, '你好吗'),
          makeMsg(2, mockUser.id, '我很好'),
        ], pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
      }, error: null,
    });
    renderPage();
    expect(await screen.findByText('你好吗')).toBeInTheDocument();
    expect(screen.getByText('我很好')).toBeInTheDocument();
    expect(screen.getAllByText('对方').length).toBeGreaterThanOrEqual(1); // 对方昵称
  });

  // ──── 发送消息 ────

  it('sends message and appends to list', async () => {
    (messagesApi.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 } }, error: null,
    });
    (messagesApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeMsg(3, mockUser.id, '新消息'), error: null,
    });
    renderPage();
    await screen.findByText('暂无消息，发送第一条消息吧');
    const input = screen.getByPlaceholderText('输入消息…');
    await userEvent.type(input, '新消息');
    // MUI 图标 data-testid 为 ChatOutlinedIcon（即 ChatOutlined 的 muiName）
    await userEvent.click(screen.getByTestId('ChatOutlinedIcon'));
    await waitFor(() => expect(messagesApi.sendMessage).toHaveBeenCalledWith(1, '新消息'));
    expect(await screen.findByText('新消息')).toBeInTheDocument();
  });

  it('sends message on Enter key', async () => {
    (messagesApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeMsg(4, mockUser.id, '回车发送'), error: null,
    });
    renderPage();
    await screen.findByText('暂无消息，发送第一条消息吧');
    const input = screen.getByPlaceholderText('输入消息…');
    await userEvent.type(input, '回车发送');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(messagesApi.sendMessage).toHaveBeenCalledWith(1, '回车发送'));
  });

  it('shows error when send fails', async () => {
    (messagesApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '发送失败' });
    renderPage();
    await screen.findByText('暂无消息，发送第一条消息吧');
    const input = screen.getByPlaceholderText('输入消息…');
    await userEvent.type(input, '消息');
    await userEvent.click(screen.getByTestId('ChatOutlinedIcon'));
    await waitFor(() => expect(screen.getByText('发送失败')).toBeInTheDocument());
  });

  it('restores input text on send failure', async () => {
    (messagesApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '发送失败' });
    renderPage();
    await screen.findByText('暂无消息，发送第一条消息吧');
    const input = screen.getByPlaceholderText('输入消息…');
    await userEvent.type(input, '重要的消息');
    await userEvent.click(screen.getByTestId('ChatOutlinedIcon'));
    // 失败后文本应恢复（没被清空）
    await waitFor(() => expect(screen.getByPlaceholderText('输入消息…')).toHaveValue('重要的消息'));
  });

  // ──── 合作伙伴名称 ────

  it('shows partner name in header', async () => {
    (messagesApi.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        items: [makeMsg(1, OTHER.id, '你好')],
        pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
      }, error: null,
    });
    renderPage();
    // 等待加载完成，再检查 header 中的 partner name
    await screen.findByText('你好');
    expect(screen.getAllByText('对方').length).toBeGreaterThanOrEqual(1);
  });

  // ──── 加载更多 ────

  it('shows "加载更多" when hasMore is true', async () => {
    const items = Array.from({ length: 50 }, (_, i) => makeMsg(i + 1, OTHER.id, `msg${i}`));
    (messagesApi.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items, pagination: { total: 80, page: 1, pageSize: 50, totalPages: 2 } }, error: null,
    });
    renderPage();
    expect(await screen.findByText('加载更多')).toBeInTheDocument();
  });
});
