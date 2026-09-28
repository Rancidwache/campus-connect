import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './payments.controller.js';

const listQuery = {
  query: z.object({
    q: z.string().trim().min(1).optional(),
    status: z
      .enum([
        'PENDING_PAYMENT',
        'PAYMENT_FAILED',
        'HELD',
        'RELEASING',
        'RELEASED',
        'REFUNDING',
        'REFUNDED',
        'CANCELLED',
      ])
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  }),
};
const exportQuery = { query: listQuery.query.omit({ page: true, pageSize: true }) };

// Mounted at /api/admin/transactions
export const adminPaymentsRouter = Router();
adminPaymentsRouter.use(requireAuth, requireAdmin);
adminPaymentsRouter.get('/', validate(listQuery), ctrl.list);
adminPaymentsRouter.get('/export.csv', validate(exportQuery), ctrl.exportCsv);
