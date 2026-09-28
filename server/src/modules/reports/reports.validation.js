import { z } from 'zod';

export const TARGET_TYPES = ['LISTING', 'REVIEW', 'REVIEW_REPLY', 'USER', 'TRANSACTION'];
export const REASONS = [
  'SPAM',
  'SCAM_OR_FRAUD',
  'PROHIBITED_ITEM',
  'HARASSMENT_OR_HATE',
  'OFF_PLATFORM_PAYMENT',
  'MISLEADING',
  'OTHER',
  'NOT_DELIVERED',
  'ITEM_NOT_AS_DESCRIBED',
];
export const STATUSES = ['OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED'];

export const createSchema = {
  body: z.object({
    targetType: z.enum(TARGET_TYPES),
    targetId: z.coerce.number().int().positive(),
    reason: z.enum(REASONS),
    detail: z.string().max(2000).optional(),
  }),
};

export const queueQuery = {
  query: z.object({
    status: z.enum(STATUSES).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
  }),
};

export const idParam = { params: z.object({ id: z.coerce.number().int().positive() }) };

export const updateSchema = {
  body: z
    .object({
      status: z.enum(['REVIEWING', 'ACTIONED', 'DISMISSED']).optional(),
      reviewNote: z.string().max(2000).optional(),
    })
    .refine((v) => v.status !== undefined || v.reviewNote !== undefined, 'Nothing to update'),
};

export const removeSchema = {
  body: z.object({ reviewNote: z.string().max(2000).optional() }),
};
