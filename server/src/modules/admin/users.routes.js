import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './users.controller.js';

const idParam = { params: z.object({ id: z.coerce.number().int().positive() }) };
const listQuery = {
  query: z.object({
    q: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  }),
};

// Mounted at /api/admin/users
export const adminUsersRouter = Router();
adminUsersRouter.use(requireAuth, requireAdmin);
adminUsersRouter.get('/', validate(listQuery), ctrl.list);
adminUsersRouter.patch(
  '/:id/admin',
  validate({ ...idParam, body: z.object({ isAdmin: z.boolean() }) }),
  ctrl.setAdmin,
);
adminUsersRouter.patch(
  '/:id/suspend',
  validate({ ...idParam, body: z.object({ isSuspended: z.boolean() }) }),
  ctrl.setSuspended,
);
