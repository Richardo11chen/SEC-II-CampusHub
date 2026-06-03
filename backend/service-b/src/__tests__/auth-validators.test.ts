import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth-validators.js';

describe('registerSchema', () => {
  const validInput = {
    studentId: '2218800001',
    password: 'Test1234',
    nickname: '测试用户',
  };

  it('should accept valid input', () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should accept valid input with optional fields', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      name: '张三',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('should reject studentId not 10 digits', () => {
    const result = registerSchema.safeParse({ ...validInput, studentId: '12345' });
    expect(result.success).toBe(false);
  });

  it('should reject studentId with letters', () => {
    const result = registerSchema.safeParse({ ...validInput, studentId: '221880000a' });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'Abc1234' });
    expect(result.success).toBe(false);
  });

  it('should reject password longer than 32 chars', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'A'.repeat(33) + '1' });
    expect(result.success).toBe(false);
  });

  it('should accept password exactly 8 chars with letter and digit', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'Abcdefg1' });
    expect(result.success).toBe(true);
  });

  it('should accept password exactly 32 chars with letter and digit', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'Abcdefg1'.repeat(4) });
    expect(result.success).toBe(true);
  });

  it('should reject password with only letters', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'abcdefgh' });
    expect(result.success).toBe(false);
  });

  it('should reject password with only digits', () => {
    const result = registerSchema.safeParse({ ...validInput, password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('should accept password with special characters (letters+digits is sufficient)', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'Abc123!@' });
    expect(result.success).toBe(true);
  });

  it('should accept password with Chinese characters (letters+digits is sufficient)', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'Abc12345中' });
    expect(result.success).toBe(true);
  });

  it('should reject empty nickname', () => {
    const result = registerSchema.safeParse({ ...validInput, nickname: '' });
    expect(result.success).toBe(false);
  });

  it('should reject nickname longer than 20 chars', () => {
    const result = registerSchema.safeParse({ ...validInput, nickname: 'A'.repeat(21) });
    expect(result.success).toBe(false);
  });

  it('should accept nickname exactly 20 chars', () => {
    const result = registerSchema.safeParse({ ...validInput, nickname: 'A'.repeat(20) });
    expect(result.success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('should accept valid input', () => {
    const result = loginSchema.safeParse({
      studentId: '2218800001',
      password: 'Test1234',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing studentId', () => {
    const result = loginSchema.safeParse({ password: 'Test1234' });
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const result = loginSchema.safeParse({ studentId: '2218800001' });
    expect(result.success).toBe(false);
  });

  it('should reject studentId not 10 chars', () => {
    const result = loginSchema.safeParse({ studentId: '123', password: 'test' });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({ studentId: '2218800001', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('refreshSchema', () => {
  it('should accept valid refresh token', () => {
    const result = refreshSchema.safeParse({ refreshToken: 'some-token' });
    expect(result.success).toBe(true);
  });

  it('should reject empty refresh token', () => {
    const result = refreshSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing refreshToken', () => {
    const result = refreshSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
