import { describe, it, expect } from 'vitest';
import { maskStudentId, maskPhone, formatReward } from '../format';

describe('maskStudentId', () => {
  it('masks middle digits', () => {
    expect(maskStudentId('2024123456')).toBe('2024****456');
  });

  it('returns short string as-is', () => {
    expect(maskStudentId('abc')).toBe('abc');
  });
});

describe('maskPhone', () => {
  it('masks middle digits', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });

  it('returns short string as-is', () => {
    expect(maskPhone('123')).toBe('123');
  });
});

describe('formatReward', () => {
  it('shows 无偿 for 0', () => {
    expect(formatReward(0)).toBe('无偿');
  });

  it('formats integer reward', () => {
    expect(formatReward(20)).toBe('¥20');
  });

  it('formats decimal reward', () => {
    expect(formatReward(15.5)).toBe('¥15.50');
  });
});
