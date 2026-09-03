import { Router } from 'express';
import { requireAuth, requireAuthOptional, requireVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './listings.controller.js';
import {
  createListingSchema,
  updateListingSchema,
  listQuerySchema,
  idParamSchema,
} from './listings.validation.js';

const router = Router();

// Public browse / search. Signed-in users may also pass ?mine=true.
router.get('/', requireAuthOptional, validate(listQuerySchema), ctrl.list);
router.get('/:id', validate(idParamSchema), ctrl.getOne);

// Posting or changing a listing requires a verified account.
router.post(
  '/',
  requireAuth,
  requireVerified,
  writeLimiter,
  validate(createListingSchema),
  ctrl.create,
);
router.patch(
  '/:id',
  requireAuth,
  requireVerified,
  writeLimiter,
  validate({ ...idParamSchema, ...updateListingSchema }),
  ctrl.update,
);
router.delete('/:id', requireAuth, requireVerified, validate(idParamSchema), ctrl.remove);

export default router;
