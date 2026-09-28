import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './listings.controller.js';

const idParam = { params: z.object({ id: z.coerce.number().int().positive() }) };
const listQuery = {
  query: z.object({
    q: z.string().trim().min(1).optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'HIRED', 'REMOVED']).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  }),
};

// Mounted at /api/admin/listings
export const adminListingsRouter = Router();
adminListingsRouter.use(requireAuth, requireAdmin);
adminListingsRouter.get('/', validate(listQuery), ctrl.list);
adminListingsRouter.post('/:id/pause', validate(idParam), ctrl.pause);
adminListingsRouter.post('/:id/reactivate', validate(idParam), ctrl.reactivate);
adminListingsRouter.post('/:id/remove', validate(idParam), ctrl.remove);
