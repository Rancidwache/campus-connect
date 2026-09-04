import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as messages from './messages.service.js';

export const send = asyncHandler(async (req, res) => {
  const message = await messages.sendMessage(req.user.id, req.body);
  res.status(201).json({ message });
});

export const listThreads = asyncHandler(async (req, res) => {
  res.json({ threads: await messages.listThreads(req.user.id) });
});

export const getThread = asyncHandler(async (req, res) => {
  const [partner, msgs] = await Promise.all([
    messages.getChatPartner(req.user.id, req.params.userId),
    messages.getThread(req.user.id, req.params.userId, req.query),
  ]);
  res.json({ partner, messages: msgs });
});

export const markDelivered = asyncHandler(async (req, res) => {
  res.json(await messages.markDelivered(req.user.id, req.body.messageIds));
});

export const unreadCount = asyncHandler(async (req, res) => {
  res.json(await messages.unreadCount(req.user.id));
});
