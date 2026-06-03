import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all shared module dependencies
vi.mock('@campushub/shared', async () => {
  const actual = await vi.importActual<typeof import('@campushub/shared')>('@campushub/shared');
  return {
    ...actual,
    prisma: {
      user: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      demand: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      noShowRecord: {
        create: vi.fn(),
        count: vi.fn(),
      },
      dispute: {
        create: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    userRepository: {
      findById: vi.fn(),
      findByStudentId: vi.fn(),
      findByStudentIdWithPassword: vi.fn(),
      updateLastLogin: vi.fn(),
    },
    refreshTokenRepository: {
      create: vi.fn(),
      findValidToken: vi.fn(),
      revoke: vi.fn(),
      revokeAllForUser: vi.fn(),
    },
    hashPassword: vi.fn(),
    comparePassword: vi.fn(),
    generateAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    hashToken: vi.fn(),
  };
});

import { authService } from '../service/auth-service.js';

// Get references to mocked functions
const shared = await import('@campushub/shared');

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      (shared.userRepository.findByStudentId as any).mockResolvedValue(null);
      (shared.hashPassword as any).mockResolvedValue('hashed_abc123');
      (shared.prisma.user.create as any).mockResolvedValue({
        id: 1,
        studentId: '2218800001',
        nickname: '测试用户',
        name: null,
        college: null,
        email: null,
        avatar: null,
        creditScore: 70,
        role: 'student',
        showRealName: false,
        createdAt: new Date('2025-01-01'),
      });

      const result = await authService.register({
        studentId: '2218800001',
        password: 'Test1234',
        nickname: '测试用户',
      });

      expect(result.id).toBe(1);
      expect(result.studentId).toBe('2218*****001'); // masked
    });

    it('should throw ConflictError if studentId exists', async () => {
      (shared.userRepository.findByStudentId as any).mockResolvedValue({ id: 1 });

      await expect(
        authService.register({
          studentId: '2218800001',
          password: 'Test1234',
          nickname: '测试',
        }),
      ).rejects.toThrow('该学号已注册');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError if studentId not found', async () => {
      (shared.userRepository.findByStudentIdWithPassword as any).mockResolvedValue(null);

      await expect(
        authService.login('2218800001', 'Test1234'),
      ).rejects.toThrow('学号或密码错误');
    });

    it('should throw UnauthorizedError if password wrong', async () => {
      (shared.userRepository.findByStudentIdWithPassword as any).mockResolvedValue({
        id: 1,
        passwordHash: 'hash',
        status: '正常',
        role: 'student',
        createdAt: new Date(),
      });
      (shared.comparePassword as any).mockResolvedValue(false);

      await expect(
        authService.login('2218800001', 'wrong'),
      ).rejects.toThrow('学号或密码错误');
    });

    it('should throw ForbiddenError if account disabled', async () => {
      (shared.userRepository.findByStudentIdWithPassword as any).mockResolvedValue({
        id: 1,
        passwordHash: 'hash',
        status: '已禁用',
        role: 'student',
      });

      await expect(
        authService.login('2218800001', 'Test1234'),
      ).rejects.toThrow('该账号已被禁用');
    });

    it('should return tokens and user on successful login', async () => {
      (shared.userRepository.findByStudentIdWithPassword as any).mockResolvedValue({
        id: 1,
        studentId: '2218800001',
        passwordHash: 'hash',
        status: '正常',
        role: 'student',
        nickname: '小明',
        avatar: null,
        creditScore: 70,
        createdAt: new Date('2025-01-01'),
      });
      (shared.comparePassword as any).mockResolvedValue(true);
      (shared.generateRefreshToken as any).mockReturnValue({
        rawToken: 'raw-refresh-token',
        tokenHash: 'hash-refresh',
        expiresAt: new Date(),
      });
      (shared.generateAccessToken as any).mockReturnValue('access-token-jwt');
      (shared.userRepository.updateLastLogin as any).mockResolvedValue(undefined);
      (shared.refreshTokenRepository.create as any).mockResolvedValue(undefined);

      const result = await authService.login('2218800001', 'Test1234');

      expect(result.token).toBe('access-token-jwt');
      expect(result.refreshToken).toBe('raw-refresh-token');
      expect(result.expiresIn).toBe(3600);
      expect(result.user.id).toBe(1);
      expect(result.user.studentId).toBe('2218*****001');
    });
  });

  describe('refresh', () => {
    it('should return new token pair for valid refresh token', async () => {
      (shared.hashToken as any).mockReturnValue('hashed-refresh');
      (shared.refreshTokenRepository.findValidToken as any).mockResolvedValue({
        id: 1,
        userId: 1,
        tokenHash: 'hashed-refresh',
      });
      (shared.generateRefreshToken as any).mockReturnValue({
        rawToken: 'new-raw',
        tokenHash: 'new-hash',
        expiresAt: new Date(),
      });
      (shared.generateAccessToken as any).mockReturnValue('new-access-token');
      (shared.userRepository.findById as any).mockResolvedValue({ id: 1, role: 'student' });

      const result = await authService.refresh('valid-refresh-token');

      expect(result.token).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-raw');
      expect(shared.refreshTokenRepository.revoke).toHaveBeenCalledWith(1);
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      (shared.hashToken as any).mockReturnValue('hashed-invalid');
      (shared.refreshTokenRepository.findValidToken as any).mockResolvedValue(null);

      await expect(
        authService.refresh('invalid-token'),
      ).rejects.toThrow('refresh token无效或已过期');
    });
  });

  describe('logout', () => {
    it('should revoke specific token when rawToken provided', async () => {
      (shared.hashToken as any).mockReturnValue('hashed-token');
      (shared.refreshTokenRepository.findValidToken as any).mockResolvedValue({
        id: 5,
        userId: 1,
        tokenHash: 'hashed-token',
      });

      await authService.logout(1, 'some-refresh-token');

      expect(shared.refreshTokenRepository.revoke).toHaveBeenCalledWith(5);
    });

    it('should revoke all user tokens when no rawToken', async () => {
      await authService.logout(1);

      expect(shared.refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(1);
    });
  });
});
