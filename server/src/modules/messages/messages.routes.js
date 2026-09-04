import { Router } from 'express';
import { requireAuth, requireVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './messages.controller.js';
import {
  sendSchema,
  threadParamSchema,
  threadQuerySchema,
  deliveredSchema,
} from './messages.validation.js';

const router = Router();

router.get('/threads', requireAuth, ctrl.listThreads);
router.get('/unread-count', requireAuth, ctrl.unreadCount);
router.post('/delivered', requireAuth, validate(deliveredSchema), ctrl.markDelivered);
router.get(
  '/thread/:userId',
  requireAuth,
  validate({ ...threadParamSchema, ...threadQuerySchema }),
  ctrl.getThread,
);
router.post('/', requireAuth, requireVerified, writeLimiter, validate(sendSchema), ctrl.send);

export default router;
