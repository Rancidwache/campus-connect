import { Router } from 'express';
import { requireAuth, requireAuthOptional, requireVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './reviews.controller.js';
import {
  createSchema,
  updateSchema,
  replySchema,
  providerParam,
  idParam,
  replyIdParam,
} from './reviews.validation.js';

const router = Router();

// Public: a provider's reviews (viewer, if signed in, gets likedByMe + mine).
router.get(
  '/provider/:providerId',
  requireAuthOptional,
  validate(providerParam),
  ctrl.listForProvider,
);

// Orders the signed-in user can still review.
router.get('/pending', requireAuth, ctrl.pending);

router.post('/', requireAuth, requireVerified, writeLimiter, validate(createSchema), ctrl.create);
router.patch('/:id', requireAuth, writeLimiter, validate({ ...idParam, ...updateSchema }), ctrl.update);
router.delete('/:id', requireAuth, validate(idParam), ctrl.remove);

router.post('/:id/replies', requireAuth, writeLimiter, validate({ ...idParam, ...replySchema }), ctrl.addReply);
router.delete('/replies/:replyId', requireAuth, validate(replyIdParam), ctrl.removeReply);

router.post('/:id/like', requireAuth, writeLimiter, validate(idParam), ctrl.likeReview);
router.post('/replies/:replyId/like', requireAuth, writeLimiter, validate(replyIdParam), ctrl.likeReply);

export default router;
