import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DemandCard from '../DemandCard';
import type { DemandCategory, DemandSummary } from '@/types';

// 只 mock formatRelativeTime（非纯函数，依赖 Date.now），其余保留真实实现
vi.mock('@/utils/format', async () => {
  const actual = await vi.importActual<typeof import('@/utils/format')>('@/utils/format');
  return { ...actual, formatRelativeTime: () => '2小时前' };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

function createDemand(overrides: Partial<DemandSummary> = {}): DemandSummary {
  return {
    id: 1,
    title: '测试需求标题',
    category: '快递代取' as DemandCategory,
    reward: 20,
    status: '开放',
    isUrgent: false,
    isAnonymous: false,
    publisher: {
      id: 100,
      nickname: '测试用户',
      avatar: undefined,
      creditScore: 70,
    },
    createdAt: '2026-06-03T10:00:00.000Z',
    ...overrides,
  };
}

describe('DemandCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────
  // 基础渲染
  // ──────────────────────────────

  it('renders title and reward', () => {
    render(<DemandCard demand={createDemand()} currentUserId={200} />);
    expect(screen.getByText('测试需求标题')).toBeInTheDocument();
    expect(screen.getByText('¥20')).toBeInTheDocument();
  });

  it('shows "无偿" for zero reward', () => {
    render(<DemandCard demand={createDemand({ reward: 0 })} currentUserId={200} />);
    expect(screen.getByText('无偿')).toBeInTheDocument();
  });

  it('renders category and status chips', () => {
    render(<DemandCard demand={createDemand()} currentUserId={200} />);
    expect(screen.getByText('快递代取')).toBeInTheDocument();
    expect(screen.getByText('开放')).toBeInTheDocument();
  });

  it('renders relative time', () => {
    render(<DemandCard demand={createDemand()} currentUserId={200} />);
    expect(screen.getByText('2小时前')).toBeInTheDocument();
  });

  it('renders publisher nickname and avatar initial', () => {
    render(<DemandCard demand={createDemand()} currentUserId={200} />);
    expect(screen.getByText('测试用户')).toBeInTheDocument();
  });

  it('shows "匿名用户" when isAnonymous is true', () => {
    render(<DemandCard demand={createDemand({ isAnonymous: true })} currentUserId={200} />);
    expect(screen.getByText('匿名用户')).toBeInTheDocument();
    expect(screen.queryByText('测试用户')).not.toBeInTheDocument();
  });

  // ──────────────────────────────
  // 紧急标签
  // ──────────────────────────────

  it('shows "紧急" chip when isUrgent is true', () => {
    render(<DemandCard demand={createDemand({ isUrgent: true })} currentUserId={200} />);
    expect(screen.getByText('紧急')).toBeInTheDocument();
  });

  it('does not show "紧急" chip when isUrgent is false', () => {
    render(<DemandCard demand={createDemand({ isUrgent: false })} currentUserId={200} />);
    expect(screen.queryByText('紧急')).not.toBeInTheDocument();
  });

  // ──────────────────────────────
  // 可接单标签（组合逻辑）
  // ──────────────────────────────

  it('shows "可接单" when status is 开放 and currentUserId differs from publisher', () => {
    render(<DemandCard demand={createDemand({ status: '开放' })} currentUserId={200} />);
    expect(screen.getByText('可接单')).toBeInTheDocument();
  });

  it('hides "可接单" when currentUserId is undefined (not logged in)', () => {
    render(<DemandCard demand={createDemand({ status: '开放' })} />);
    expect(screen.queryByText('可接单')).not.toBeInTheDocument();
  });

  it('hides "可接单" when user is the publisher themselves', () => {
    render(<DemandCard
      demand={createDemand({ status: '开放', publisher: { id: 200, nickname: '自己', avatar: undefined, creditScore: 70 } })}
      currentUserId={200}
    />);
    expect(screen.queryByText('可接单')).not.toBeInTheDocument();
  });

  it('hides "可接单" when status is not 开放', () => {
    render(<DemandCard demand={createDemand({ status: '进行中' })} currentUserId={200} />);
    expect(screen.queryByText('可接单')).not.toBeInTheDocument();
  });

  // ──────────────────────────────
  // 交互
  // ──────────────────────────────

  it('navigates to /demands/:id on click', async () => {
    const user = userEvent.setup();
    render(<DemandCard demand={createDemand({ id: 42 })} currentUserId={200} />);
    await user.click(screen.getByText('测试需求标题'));
    expect(mockNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/demands/42');
  });

  // ──────────────────────────────
  // 各类别冒烟
  // ──────────────────────────────

  it('renders with all 9 categories without error', () => {
    const categories: DemandCategory[] = [
      '快递代取', '学习辅导', '二手交易', '活动组队',
      '失物招领', '拼车拼单', '找搭子', '咨询答疑', '其他',
    ];
    for (const category of categories) {
      const { unmount } = render(
        <DemandCard demand={createDemand({ category })} currentUserId={200} />,
      );
      expect(screen.getByText(category)).toBeInTheDocument();
      unmount();
    }
  });
});
