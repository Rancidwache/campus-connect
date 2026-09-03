import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './users.controller.js';

const router = Router();

const idParam = { params: z.object({ id: z.coerce.number().int().positive() }) };

router.get('/me', requireAuth, ctrl.getMe);
router.patch('/me', requireAuth, writeLimiter, validate(ctrl.updateMeSchema), ctrl.updateMe);
router.put(
  '/me/public-key',
  requireAuth,
  writeLimiter,
  validate(ctrl.publicKeySchema),
  ctrl.setPublicKey,
);
router.get('/:id', validate(idParam), ctrl.getPublicProfile);

export default router;
