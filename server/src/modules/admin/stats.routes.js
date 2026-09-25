import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import * as ctrl from './stats.controller.js';

// Mounted at /api/admin/stats
export const adminStatsRouter = Router();
adminStatsRouter.use(requireAuth, requireAdmin);
adminStatsRouter.get('/', ctrl.get);
