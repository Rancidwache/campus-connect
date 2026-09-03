import { Router } from 'express';
import { requireAuth, requireVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './escrow.controller.js';
import {
  hireSchema,
  listQuerySchema,
  idParamSchema,
  quoteQuerySchema,
} from './escrow.validation.js';

const router = Router();

router.get('/quote', requireAuth, validate(quoteQuerySchema), ctrl.getQuote);

router.get('/', requireAuth, validate(listQuerySchema), ctrl.list);
router.get('/:id', requireAuth, validate(idParamSchema), ctrl.getOne);

router.post('/', requireAuth, requireVerified, writeLimiter, validate(hireSchema), ctrl.hire);
router.post('/:id/approve', requireAuth, requireVerified, writeLimiter, validate(idParamSchema), ctrl.approve);
router.post('/:id/decline', requireAuth, requireVerified, writeLimiter, validate(idParamSchema), ctrl.decline);
router.post('/:id/cancel', requireAuth, writeLimiter, validate(idParamSchema), ctrl.cancel);

export default router;
