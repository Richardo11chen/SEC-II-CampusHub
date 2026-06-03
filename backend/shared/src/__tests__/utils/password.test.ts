import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, validatePasswordFormat } from '../../utils/password.js';

describe('hashPassword', () => {
  it('should return a 60-character bcrypt hash', async () => {
    const hash = await hashPassword('Test1234');
    expect(hash).toHaveLength(60);
    expect(hash).toMatch(/^\$2[abxy]\$\d+/);
  });

  it('should produce different hashes for the same password', async () => {
    const hash1 = await hashPassword('Test1234');
    const hash2 = await hashPassword('Test1234');
    expect(hash1).not.toBe(hash2);
  });

  it('should use 12 rounds (hash starts with $2b$12$)', async () => {
    const hash = await hashPassword('Test1234');
    expect(hash).toMatch(/^\$2b\$12\$/);
  });
});

describe('comparePassword', () => {
  it('should return true for correct password', async () => {
    const hash = await hashPassword('MyPassword1');
    const result = await comparePassword('MyPassword1', hash);
    expect(result).toBe(true);
  });

  it('should return false for wrong password', async () => {
    const hash = await hashPassword('MyPassword1');
    const result = await comparePassword('WrongPassword1', hash);
    expect(result).toBe(false);
  });

  it('should return false for empty string', async () => {
    const hash = await hashPassword('MyPassword1');
    const result = await comparePassword('', hash);
    expect(result).toBe(false);
  });

  it('should work end-to-end: hash then compare', async () => {
    const password = 'E2ETestPass1';
    const hash = await hashPassword(password);
    expect(await comparePassword(password, hash)).toBe(true);
    expect(await comparePassword('WrongOne', hash)).toBe(false);
  });
});

describe('validatePasswordFormat', () => {
  it('should accept valid password "abc12345"', () => {
    expect(validatePasswordFormat('abc12345')).toEqual({ valid: true });
  });

  it('should accept 8-char boundary "Abcdefgh1"', () => {
    expect(validatePasswordFormat('Abcdefgh1')).toEqual({ valid: true });
  });

  it('should accept 32-char password', () => {
    const pwd = 'Ab12' + 'x'.repeat(28);
    expect(validatePasswordFormat(pwd)).toEqual({ valid: true });
  });

  it('should reject pure letters "abcdefgh" (no digit)', () => {
    const result = validatePasswordFormat('abcdefgh');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('字母和数字');
  });

  it('should reject pure digits "12345678" (no letter)', () => {
    const result = validatePasswordFormat('12345678');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('字母和数字');
  });

  it('should reject 7-char password "Abcd123" (too short)', () => {
    const result = validatePasswordFormat('Abcd123');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('长度');
  });

  it('should reject 33-char password (too long)', () => {
    const result = validatePasswordFormat('Ab1' + 'x'.repeat(30));
    expect(result.valid).toBe(false);
    expect(result.message).toContain('长度');
  });

  it('should accept password with special chars "Abc123!@" (letters+digits is sufficient)', () => {
    const result = validatePasswordFormat('Abc123!@');
    expect(result.valid).toBe(true);
  });

  it('should reject empty string', () => {
    const result = validatePasswordFormat('');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('长度');
  });

  it('should accept password with Chinese characters "Abc12345中" (letters+digits is sufficient)', () => {
    const result = validatePasswordFormat('Abc12345中');
    expect(result.valid).toBe(true);
  });

  it('should reject null/undefined password', () => {
    const result = validatePasswordFormat(undefined as unknown as string);
    expect(result.valid).toBe(false);
  });
});
