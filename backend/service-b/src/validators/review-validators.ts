import { z } from 'zod';

export const createReviewSchema = z.object({
  orderId: z.number().int().positive(),
  rating: z.number().int().min(1, '评分最低1星').max(5, '评分最高5星'),
  content: z.string().max(1000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
