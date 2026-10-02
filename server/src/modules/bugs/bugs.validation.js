import { z } from 'zod';

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'];
export const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'];

export const createSchema = {
  body: z.object({
    title: z.string().trim().min(3, 'Give the bug a short title').max(120),
    description: z.string().trim().min(10, 'Describe what happened in a little more detail').max(4000),
    severity: z.enum(SEVERITIES).default('MEDIUM'),
    pageUrl: z.string().trim().max(500).optional(),
    contact: z.string().trim().max(120).optional(),
  }),
};

export const listQuery = {
  query: z.object({
    status: z.enum(STATUSES).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  }),
};

export const idParam = { params: z.object({ id: z.coerce.number().int().positive() }) };

export const updateSchema = {
  body: z
    .object({
      status: z.enum(STATUSES).optional(),
      adminNote: z.string().trim().max(2000).optional(),
    })
    .refine((v) => v.status !== undefined || v.adminNote !== undefined, 'Nothing to update'),
};
