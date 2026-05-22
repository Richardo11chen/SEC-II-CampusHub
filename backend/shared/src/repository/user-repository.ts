import prisma from '../utils/prisma.js';
import { Prisma } from '@prisma/client';

const userPublicSelect = {
  id: true,
  studentId: true,
  nickname: true,
  name: true,
  college: true,
  avatar: true,
  creditScore: true,
  role: true,
  showRealName: true,
  status: true,
  restrictedUntil: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} as const;

export const userRepository = {
  async findById(id: number) {
    return prisma.user.findUnique({
      select: userPublicSelect,
      where: { id },
    });
  },

  async findByStudentId(studentId: string) {
    return prisma.user.findUnique({
      where: { studentId },
    });
  },

  async findByStudentIdWithPassword(studentId: string) {
    return prisma.user.findUnique({
      where: { studentId },
      select: {
        id: true,
        studentId: true,
        passwordHash: true,
        nickname: true,
        avatar: true,
        creditScore: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  },

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  },

  async update(id: number, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: userPublicSelect,
    });
  },

  async updateLastLogin(id: number) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },

  async countRecentModifications(userId: number, fieldName: string, sinceMonths = 6): Promise<number> {
    const since = new Date();
    since.setMonth(since.getMonth() - sinceMonths);
    return prisma.fieldModificationLog.count({
      where: {
        userId,
        fieldName,
        modifiedAt: { gte: since },
      },
    });
  },

  async logModification(userId: number, fieldName: string, oldValue: string | undefined, newValue: string | undefined) {
    return prisma.fieldModificationLog.create({
      data: {
        userId,
        fieldName,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      },
    });
  },
};
