import { z } from 'zod';

export const sendMessageSchema = z.object({
  orderId: z.number().int().positive(),
  contentType: z.enum(['text', 'image']).default('text'),
  content: z.string().min(1, '消息内容不能为空').max(2000, '消息内容不能超过2000字'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
