import { z } from 'zod';

export const ESCROW_STATUSES = [
  'PENDING_PAYMENT',
  'PAYMENT_FAILED',
  'HELD',
  'RELEASING',
  'RELEASED',
  'REFUNDING',
  'REFUNDED',
  'CANCELLED',
];

export const hireSchema = {
  body: z.object({
    listingId: z.coerce.number().int().positive(),
    phone: z.string().min(9).max(20).optional(),
  }),
};

export const listQuerySchema = {
  query: z.object({
    role: z.enum(['client', 'provider', 'all']).default('all'),
    status: z.enum(ESCROW_STATUSES).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
  }),
};

export const idParamSchema = {
  params: z.object({ id: z.coerce.number().int().positive() }),
};

export const quoteQuerySchema = {
  query: z.object({ listingId: z.coerce.number().int().positive() }),
};
