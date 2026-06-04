import {
  prisma,
  userRepository,
  refreshTokenRepository,
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  decryptPhone,
  maskPhone,
  UnauthorizedError,
  ConflictError,
  ForbiddenError,
} from '@campushub/shared';

export const authService = {
  async register(data: {
    studentId: string;
    password: string;
    nickname: string;
    name?: string;
    email?: string;
    avatar?: string;
  }) {
    const existing = await userRepository.findByStudentId(data.studentId);
    if (existing) {
      throw new ConflictError('该学号已注册');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        studentId: data.studentId,
        passwordHash,
        nickname: data.nickname,
        name: data.name,
        email: data.email,
        avatar: data.avatar,
      },
      select: {
        id: true,
        studentId: true,
        nickname: true,
        name: true,
        college: true,
        email: true,
        avatar: true,
        creditScore: true,
        role: true,
        showRealName: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      studentId: maskStudentId(user.studentId),
    };
  },

  async login(studentId: string, password: string) {
    const user = await userRepository.findByStudentIdWithPassword(studentId);
    if (!user) {
      throw new UnauthorizedError('学号或密码错误');
    }

    if (user.status === '已禁用') {
      throw new ForbiddenError('该账号已被禁用，请联系管理员');
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('学号或密码错误');
    }

    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();
    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const accessToken = generateAccessToken({ userId: user.id, role: user.role });

    await userRepository.updateLastLogin(user.id);

    return {
      token: accessToken,
      refreshToken: rawToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        studentId: maskStudentId(user.studentId),
        nickname: user.nickname,
        name: user.name,
        college: user.college,
        phone: user.phoneEncrypted ? maskPhone(decryptPhone(user.phoneEncrypted)) : undefined,
        email: user.email,
        avatar: user.avatar,
        creditScore: user.creditScore,
        role: user.role,
        status: user.status,
        showRealName: user.showRealName,
        createdAt: user.createdAt.toISOString(),
      },
    };
  },

  async refresh(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const stored = await refreshTokenRepository.findValidToken(tokenHash);

    if (!stored) {
      throw new UnauthorizedError('refresh token无效或已过期');
    }

    await refreshTokenRepository.revoke(stored.id);

    const { rawToken: newRawToken, tokenHash: newHash, expiresAt } = generateRefreshToken();
    await refreshTokenRepository.create({
      userId: stored.userId,
      tokenHash: newHash,
      expiresAt,
    });

    const user = await userRepository.findById(stored.userId);
    const accessToken = generateAccessToken({
      userId: stored.userId,
      role: user?.role ?? 'student',
    });

    return {
      token: accessToken,
      refreshToken: newRawToken,
      expiresIn: 3600,
    };
  },

  async logout(userId: number, rawToken?: string) {
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      const stored = await refreshTokenRepository.findValidToken(tokenHash);
      if (stored) {
        await refreshTokenRepository.revoke(stored.id);
      }
    } else {
      await refreshTokenRepository.revokeAllForUser(userId);
    }
  },
};

function maskStudentId(studentId: string): string {
  if (studentId.length !== 10) return studentId;
  return studentId.slice(0, 4) + '*****' + studentId.slice(-3);
}
