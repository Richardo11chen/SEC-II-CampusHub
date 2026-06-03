import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  maskStudentId, maskPhone, formatDateTime, formatRelativeTime,
  formatReward, demandStatusColor, orderStatusColor,
} from '../format';

// 时间相关测试固定为 UTC，避免本地时区干扰
beforeAll(() => {
  process.env.TZ = 'UTC';
});

afterAll(() => {
  delete process.env.TZ;
});

// ──────────────────────────────────────────
// maskStudentId
// ──────────────────────────────────────────
describe('maskStudentId', () => {
  it('masks middle digits of a full-length student ID', () => {
    expect(maskStudentId('2024123456')).toBe('2024****456');
  });

  it('returns short string as-is', () => {
    expect(maskStudentId('abc')).toBe('abc');
  });

  it('masks exactly 7-char string (boundary: 7 is enough for 4+3)', () => {
    expect(maskStudentId('1234567')).toBe('1234****567');
  });

  it('returns 6-char string as-is (below mask threshold)', () => {
    expect(maskStudentId('123456')).toBe('123456');
  });
});

// ──────────────────────────────────────────
// maskPhone
// ──────────────────────────────────────────
describe('maskPhone', () => {
  it('masks middle digits of a full-length phone number', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });

  it('returns short string as-is', () => {
    expect(maskPhone('123')).toBe('123');
  });

  it('masks exactly 7-char string (boundary: 7 is enough for 3+4)', () => {
    expect(maskPhone('1234567')).toBe('123****4567');
  });

  it('returns 6-char string as-is (below mask threshold)', () => {
    expect(maskPhone('123456')).toBe('123456');
  });
});

// ──────────────────────────────────────────
// formatDateTime
// ──────────────────────────────────────────
describe('formatDateTime', () => {
  it('formats full date time correctly', () => {
    expect(formatDateTime('2026-06-03T14:30:45.000Z')).toBe('2026-06-03 14:30');
  });

  it('pads single-digit month, date, hours, minutes', () => {
    expect(formatDateTime('2026-01-05T08:05:00.000Z')).toBe('2026-01-05 08:05');
  });

  it('handles midnight correctly', () => {
    expect(formatDateTime('2026-12-01T00:00:00.000Z')).toBe('2026-12-01 00:00');
  });
});

// ──────────────────────────────────────────
// formatRelativeTime
// ──────────────────────────────────────────
describe('formatRelativeTime', () => {
  // 固定当前时间：2026-06-03 12:00:00 UTC
  // 注意：这里必须在 vitest 的 fakeTimers 环境下，否则 Date.now 不能用 vi.setSystemTime 控制
  // 但我们不在这个 describe 里设置 fakeTimers，而是用真实 Date.now 的差值来构造输入
  // 这样更健壮 —— 不依赖 fake timer

  it('shows "刚刚" for timestamps less than 1 minute ago', () => {
    const now = Date.now();
    const recent = new Date(now - 30_000).toISOString(); // 30秒前
    expect(formatRelativeTime(recent)).toBe('刚刚');
  });

  it('shows "X分钟前" for timestamps less than 60 minutes ago', () => {
    const now = Date.now();
    const past = new Date(now - 30 * 60_000).toISOString(); // 30分钟前
    expect(formatRelativeTime(past)).toBe('30分钟前');
  });

  it('shows "X小时前" for timestamps less than 24 hours ago', () => {
    const now = Date.now();
    const past = new Date(now - 14 * 60 * 60_000).toISOString(); // 14小时前
    expect(formatRelativeTime(past)).toBe('14小时前');
  });

  it('shows "X天前" for timestamps less than 30 days ago', () => {
    const now = Date.now();
    const past = new Date(now - 14 * 24 * 60 * 60_000).toISOString(); // 14天前
    expect(formatRelativeTime(past)).toBe('14天前');
  });

  it('falls back to formatDateTime for timestamps 30+ days ago', () => {
    const now = Date.now();
    const past = new Date(now - 35 * 24 * 60 * 60_000).toISOString(); // 35天前
    const result = formatRelativeTime(past);
    // 不应返回相对时间格式
    expect(result).not.toBe('刚刚');
    expect(result).not.toMatch(/[分钟小时天]前/);
    // 应返回日期时间格式 YYYY-MM-DD HH:mm
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

// ──────────────────────────────────────────
// formatReward
// ──────────────────────────────────────────
describe('formatReward', () => {
  it('shows 无偿 for 0', () => {
    expect(formatReward(0)).toBe('无偿');
  });

  it('formats integer reward without decimals', () => {
    expect(formatReward(20)).toBe('¥20');
  });

  it('formats decimal reward with 2 decimal places', () => {
    expect(formatReward(15.5)).toBe('¥15.50');
  });

  it('formats large integer reward', () => {
    expect(formatReward(9999)).toBe('¥9999');
  });
});

// ──────────────────────────────────────────
// demandStatusColor
// ──────────────────────────────────────────
describe('demandStatusColor', () => {
  it('maps "开放" to primary', () => {
    expect(demandStatusColor('开放')).toBe('primary');
  });

  it('maps "进行中" to warning', () => {
    expect(demandStatusColor('进行中')).toBe('warning');
  });

  it('maps "已完成" to success', () => {
    expect(demandStatusColor('已完成')).toBe('success');
  });

  it('maps "已关闭" to default', () => {
    expect(demandStatusColor('已关闭')).toBe('default');
  });
});

// ──────────────────────────────────────────
// orderStatusColor
// ──────────────────────────────────────────
describe('orderStatusColor', () => {
  it('maps "进行中" to warning', () => {
    expect(orderStatusColor('进行中')).toBe('warning');
  });

  it('maps "待确认" to info', () => {
    expect(orderStatusColor('待确认')).toBe('info');
  });

  it('maps "已完成" to success', () => {
    expect(orderStatusColor('已完成')).toBe('success');
  });

  it('maps "已取消" to default', () => {
    expect(orderStatusColor('已取消')).toBe('default');
  });

  it('maps "纠纷中" to error', () => {
    expect(orderStatusColor('纠纷中')).toBe('error');
  });
});
