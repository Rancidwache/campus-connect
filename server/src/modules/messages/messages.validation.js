import { z } from 'zod';

export const sendSchema = {
  body: z.object({
    toUserId: z.coerce.number().int().positive(),
    encryptedPayload: z.string().min(1).max(8192),
  }),
};

export const threadParamSchema = {
  params: z.object({ userId: z.coerce.number().int().positive() }),
};

export const threadQuerySchema = {
  query: z.object({
    before: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
};

export const deliveredSchema = {
  body: z.object({ messageIds: z.array(z.number().int().positive()).max(200) }),
};
