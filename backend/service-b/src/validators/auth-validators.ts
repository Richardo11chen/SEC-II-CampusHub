import { z } from 'zod';

export const registerSchema = z.object({
  studentId: z
    .string()
    .length(10, '学号必须为10位数字')
    .regex(/^\d{10}$/, '学号必须为10位数字'),
  password: z
    .string()
    .min(8, '密码长度需在8-32位之间')
    .max(32, '密码长度需在8-32位之间')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/, '密码必须包含字母和数字'),
  nickname: z
    .string()
    .min(1, '昵称不能为空')
    .max(20, '昵称最多20个字符'),
  name: z.string().max(20).optional(),
  email: z.string().email('邮箱格式不正确').max(100).optional(),
  avatar: z.string().url().max(500).optional(),
});

export const loginSchema = z.object({
  studentId: z.string().length(10, '学号必须为10位数字'),
  password: z.string().min(1, '密码不能为空'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken不能为空'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
