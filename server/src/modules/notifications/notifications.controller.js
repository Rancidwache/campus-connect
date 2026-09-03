import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as svc from './notifications.service.js';

export const markReadSchema = {
  body: z.object({ ids: z.array(z.number().int().positive()).optional() }),
};

export const list = asyncHandler(async (req, res) => {
  res.json(await svc.listForUser(req.user.id));
});

export const markRead = asyncHandler(async (req, res) => {
  res.json(await svc.markRead(req.user.id, req.body.ids));
});
