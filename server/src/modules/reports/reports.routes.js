import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './reports.controller.js';
import { createSchema, queueQuery, idParam, updateSchema, removeSchema } from './reports.validation.js';

// Mounted at /api/reports
export const reportsRouter = Router();
reportsRouter.post('/', requireAuth, writeLimiter, validate(createSchema), ctrl.create);
reportsRouter.get('/mine', requireAuth, ctrl.mine);

// Mounted at /api/admin/reports
export const adminReportsRouter = Router();
adminReportsRouter.use(requireAuth, requireAdmin);
adminReportsRouter.get('/', validate(queueQuery), ctrl.queue);
adminReportsRouter.get('/stats', ctrl.stats);
adminReportsRouter.patch('/:id', validate({ ...idParam, ...updateSchema }), ctrl.update);
adminReportsRouter.post('/:id/remove', validate({ ...idParam, ...removeSchema }), ctrl.remove);
