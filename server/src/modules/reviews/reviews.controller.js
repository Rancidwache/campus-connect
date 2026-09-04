import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as reviews from './reviews.service.js';

export const listForProvider = asyncHandler(async (req, res) => {
  res.json(await reviews.listForProvider(req.params.providerId, req.user?.id, req.query));
});

export const pending = asyncHandler(async (req, res) => {
  res.json({ pending: await reviews.pendingForUser(req.user.id) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ review: await reviews.createReview(req.user.id, req.body) });
});

export const update = asyncHandler(async (req, res) => {
  res.json({ review: await reviews.updateReview(req.user.id, req.params.id, req.body) });
});

export const remove = asyncHandler(async (req, res) => {
  await reviews.deleteReview(req.user.id, req.params.id);
  res.status(204).send();
});

export const addReply = asyncHandler(async (req, res) => {
  res.status(201).json({ reply: await reviews.addReply(req.user.id, req.params.id, req.body) });
});

export const removeReply = asyncHandler(async (req, res) => {
  await reviews.deleteReply(req.user.id, req.params.replyId);
  res.status(204).send();
});

export const likeReview = asyncHandler(async (req, res) => {
  res.json(await reviews.toggleReviewLike(req.user.id, req.params.id));
});

export const likeReply = asyncHandler(async (req, res) => {
  res.json(await reviews.toggleReplyLike(req.user.id, req.params.replyId));
});
