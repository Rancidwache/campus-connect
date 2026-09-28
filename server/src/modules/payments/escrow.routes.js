import { Router } from 'express';
import { requireAuth, requireVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { uploadImages } from '../../middleware/upload.js';
import * as ctrl from './escrow.controller.js';
import * as deliveryCtrl from './delivery.controller.js';
import {
  hireSchema,
  listQuerySchema,
  idParamSchema,
  quoteQuerySchema,
  disputeSchema,
} from './escrow.validation.js';

const router = Router();

router.get('/quote', requireAuth, validate(quoteQuerySchema), ctrl.getQuote);

router.get('/', requireAuth, validate(listQuerySchema), ctrl.list);
router.get('/:id', requireAuth, validate(idParamSchema), ctrl.getOne);

router.post('/', requireAuth, requireVerified, writeLimiter, validate(hireSchema), ctrl.hire);
router.post('/:id/approve', requireAuth, requireVerified, writeLimiter, validate(idParamSchema), ctrl.approve);
router.post('/:id/decline', requireAuth, requireVerified, writeLimiter, validate(idParamSchema), ctrl.decline);
router.post('/:id/cancel', requireAuth, writeLimiter, validate(idParamSchema), ctrl.cancel);

// Delivery proof (provider, photos) + dispute (client) — DoorDash-style
// confirmation before funds release, feeding the admin moderation queue.
router.post(
  '/:id/delivery-proof',
  requireAuth,
  requireVerified,
  writeLimiter,
  validate(idParamSchema),
  uploadImages,
  deliveryCtrl.submitProof,
);
router.post(
  '/:id/dispute',
  requireAuth,
  requireVerified,
  writeLimiter,
  validate(disputeSchema),
  deliveryCtrl.dispute,
);

export default router;
