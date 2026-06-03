import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserPublicPage from '../UserPublicPage';
import * as usersApi from '@/api/users';
import * as reviewsApi from '@/api/reviews';
import type { PublicUserProfile, Review } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '42' }), useNavigate: () => mockNavigate }));
vi.mock('@/api/users', () => ({ getUserProfile: vi.fn() }));
vi.mock('@/api/reviews', () => ({ getUserReviews: vi.fn() }));

const mockProfile: PublicUserProfile = {
  id: 42, nickname: '测试用户', name: '张三', college: '计算机科学与技术系',
  avatar: undefined, creditScore: 85, totalOrders: 12, joinedAt: '2026-01-15T00:00:00.000Z',
};

function makeReview(id: number, overrides: Partial<Review> = {}): Review {
  return {
    id, orderId: 1, rating: 5, content: '很好', createdAt: '2026-06-03T10:00:00.000Z',
    fromUser: { id: 10, nickname: '评价者', name: null, avatar: undefined, creditScore: 70, totalOrders: 3, joinedAt: '' },
    toUserId: 42, ...overrides,
  };
}

function renderPage() {
  return render(<UserPublicPage />);
}

describe('UserPublicPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usersApi.getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockProfile, error: null });
    (reviewsApi.getUserReviews as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [] }, error: null });
  });

  // ──── loading / error ────

  it('shows spinner while loading', () => {
    (usersApi.getUserProfile as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error alert on load failure', async () => {
    (usersApi.getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '网络错误' });
    renderPage();
    expect(await screen.findByText('网络错误')).toBeInTheDocument();
    await userEvent.click(screen.getByText('返回首页'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows "用户不存在" when profile is null', async () => {
    (usersApi.getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
    renderPage();
    expect(await screen.findByText('用户不存在')).toBeInTheDocument();
  });

  // ──── 用户信息 ────

  it('renders profile info: nickname, score, orders', async () => {
    renderPage();
    expect(await screen.findByText('测试用户')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('信用分')).toBeInTheDocument();
    expect(screen.getByText('12 单')).toBeInTheDocument();
  });

  it('shows name and college when provided', async () => {
    renderPage();
    expect(await screen.findByText('张三')).toBeInTheDocument();
    expect(screen.getByText('计算机科学与技术系')).toBeInTheDocument();
  });

  it('hides name when not provided', async () => {
    (usersApi.getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...mockProfile, name: null }, error: null,
    });
    renderPage();
    expect(await screen.findByText('测试用户')).toBeInTheDocument();
    expect(screen.queryByText('张三')).not.toBeInTheDocument();
  });

  it('hides college when not provided', async () => {
    (usersApi.getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...mockProfile, college: undefined }, error: null,
    });
    renderPage();
    expect(await screen.findByText('测试用户')).toBeInTheDocument();
    expect(screen.queryByText('计算机科学与技术系')).not.toBeInTheDocument();
  });

  it('shows joined date', async () => {
    renderPage();
    expect(await screen.findByText(/加入于/)).toBeInTheDocument();
  });

  it('shows back button and navigates', async () => {
    renderPage();
    expect(await screen.findByText('返回')).toBeInTheDocument();
    await userEvent.click(screen.getByText('返回'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  // ──── 评价列表 ────

  it('shows "暂无评价" when no reviews', async () => {
    renderPage();
    expect(await screen.findByText('暂无评价')).toBeInTheDocument();
  });

  it('renders review list with ratings and content', async () => {
    (reviewsApi.getUserReviews as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [makeReview(1), makeReview(2, { content: '还不错', rating: 4 })], total: 2 }, error: null,
    });
    renderPage();
    await screen.findByText('收到的评价');
    expect(screen.getAllByText('评价者').length).toBe(2);
    expect(screen.getByText('很好')).toBeInTheDocument();
    expect(screen.getByText('还不错')).toBeInTheDocument();
  });
});
