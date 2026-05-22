import { z } from 'zod';

export const updateUserSchema = z.object({
  nickname: z.string().min(1).max(20).optional(),
  avatar: z.string().url().max(500).optional(),
  college: z.string().max(50).optional(),
  phone: z
    .string()
    .length(11, '手机号必须为11位')
    .regex(/^1[3-9]\d{9}$/, '手机号格式不正确')
    .optional(),
  showRealName: z.boolean().optional(),
  name: z.string().max(20).optional(),
  email: z.string().email('邮箱格式不正确').max(100).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
