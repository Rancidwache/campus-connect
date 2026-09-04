import { z } from 'zod';

export const createSchema = {
  body: z.object({
    transactionId: z.coerce.number().int().positive(),
    rating: z.coerce.number().int().min(1).max(5),
    body: z.string().min(3, 'Say a little about your experience').max(2000),
  }),
};

export const updateSchema = {
  body: z
    .object({
      rating: z.coerce.number().int().min(1).max(5).optional(),
      body: z.string().min(3).max(2000).optional(),
    })
    .refine((v) => v.rating !== undefined || v.body !== undefined, 'Nothing to update'),
};

export const replySchema = {
  body: z.object({
    body: z.string().min(1).max(2000),
    parentReplyId: z.coerce.number().int().positive().optional(),
  }),
};

export const providerParam = {
  params: z.object({ providerId: z.coerce.number().int().positive() }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
  }),
};

export const idParam = { params: z.object({ id: z.coerce.number().int().positive() }) };
export const replyIdParam = { params: z.object({ replyId: z.coerce.number().int().positive() }) };
