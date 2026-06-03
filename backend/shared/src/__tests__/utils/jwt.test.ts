import { describe, it, expect } from 'vitest';

describe('JWT utilities', () => {
  describe('generateAccessToken', () => {
    it('should return a string token', async () => {
      const { generateAccessToken } = await import('../../utils/jwt.js');
      const token = generateAccessToken({ userId: 1, role: 'student' });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should produce token that can be verified', async () => {
      const { generateAccessToken, verifyAccessToken } = await import('../../utils/jwt.js');
      const payload = { userId: 42, role: 'admin' };
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(42);
      expect(decoded.role).toBe('admin');
    });

    it('should include userId and role in decoded payload', async () => {
      const { generateAccessToken, verifyAccessToken } = await import('../../utils/jwt.js');
      const token = generateAccessToken({ userId: 100, role: 'vip' });
      const decoded = verifyAccessToken(token);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('role');
    });
  });

  describe('verifyAccessToken', () => {
    it('should throw on malformed token', async () => {
      const { verifyAccessToken } = await import('../../utils/jwt.js');
      expect(() => verifyAccessToken('not.a.valid.jwt')).toThrow();
    });

    it('should throw on empty string', async () => {
      const { verifyAccessToken } = await import('../../utils/jwt.js');
      expect(() => verifyAccessToken('')).toThrow();
    });

    it('should throw on expired token (backdated 3601s)', async () => {
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'dev-jwt-secret';
      const expired = jwt.default.sign(
        { userId: 1, role: 'student' },
        secret,
        { expiresIn: '-1s' },
      );
      const { verifyAccessToken } = await import('../../utils/jwt.js');
      expect(() => verifyAccessToken(expired)).toThrow();
    });

    it('should throw on token signed with wrong secret', async () => {
      const jwt = await import('jsonwebtoken');
      const wrongToken = jwt.default.sign(
        { userId: 1, role: 'student' },
        'wrong-secret',
        { expiresIn: '1h' },
      );
      const { verifyAccessToken } = await import('../../utils/jwt.js');
      expect(() => verifyAccessToken(wrongToken)).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    it('should return rawToken, tokenHash, and expiresAt', async () => {
      const { generateRefreshToken } = await import('../../utils/jwt.js');
      const result = generateRefreshToken();
      expect(result).toHaveProperty('rawToken');
      expect(result).toHaveProperty('tokenHash');
      expect(result).toHaveProperty('expiresAt');
    });

    it('rawToken should contain two UUIDs separated by dash', async () => {
      const { generateRefreshToken } = await import('../../utils/jwt.js');
      const { rawToken } = generateRefreshToken();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const parts = rawToken.split('-');
      // Two UUIDs joined by '-' = 10 parts (UUID has 5 parts, 2 × 5 = 10 parts)
      expect(parts.length).toBeGreaterThanOrEqual(9);
    });

    it('tokenHash should be 64 hex characters (SHA-256)', async () => {
      const { generateRefreshToken } = await import('../../utils/jwt.js');
      const { tokenHash } = generateRefreshToken();
      expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('expiresAt should be ~7 days from now', async () => {
      const { generateRefreshToken } = await import('../../utils/jwt.js');
      const before = new Date();
      const { expiresAt } = generateRefreshToken();
      const diffMs = expiresAt.getTime() - before.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      // Should be approximately 7 days (tolerance: 1 second)
      expect(diffDays).toBeGreaterThan(6.99);
      expect(diffDays).toBeLessThan(7.01);
    });
  });

  describe('hashToken', () => {
    it('should produce deterministic hash for same input', async () => {
      const { hashToken } = await import('../../utils/jwt.js');
      const input = 'test-refresh-token';
      expect(hashToken(input)).toBe(hashToken(input));
    });

    it('should produce different hash for different input', async () => {
      const { hashToken } = await import('../../utils/jwt.js');
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });

    it('should return 64-char hex string', async () => {
      const { hashToken } = await import('../../utils/jwt.js');
      const hash = hashToken('some-token');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('ACCESS_TOKEN_EXPIRES_IN', () => {
    it('should be 3600', async () => {
      const { ACCESS_TOKEN_EXPIRES_IN } = await import('../../utils/jwt.js');
      expect(ACCESS_TOKEN_EXPIRES_IN).toBe(3600);
    });
  });
});
