import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { uploadAvatar } from '../../middleware/upload.js';
import * as ctrl from './users.controller.js';
import * as mediaCtrl from '../media/media.controller.js';

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
router.post('/me/avatar', requireAuth, writeLimiter, uploadAvatar, mediaCtrl.setAvatar);
router.delete('/me/avatar', requireAuth, mediaCtrl.deleteAvatar);

router.get('/:id', validate(idParam), ctrl.getPublicProfile);
router.get('/:id/listings', validate({ ...idParam, ...ctrl.listQuerySchema }), ctrl.getPublicListings);

export default router;
