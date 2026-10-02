import { Router } from 'express';
import { requireAuth, requireAuthOptional, requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { bugLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './bugs.controller.js';
import { createSchema, listQuery, idParam, updateSchema } from './bugs.validation.js';

// Mounted at /api/bug-reports — open to signed-out visitors too.
export const bugReportsRouter = Router();
bugReportsRouter.post('/', requireAuthOptional, bugLimiter, validate(createSchema), ctrl.create);

// Mounted at /api/admin/bug-reports
export const adminBugReportsRouter = Router();
adminBugReportsRouter.use(requireAuth, requireAdmin);
adminBugReportsRouter.get('/', validate(listQuery), ctrl.list);
adminBugReportsRouter.patch('/:id', validate({ ...idParam, ...updateSchema }), ctrl.update);
