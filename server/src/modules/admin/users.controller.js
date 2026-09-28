import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as svc from './users.service.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await svc.listUsers(req.query));
});

export const setAdmin = asyncHandler(async (req, res) => {
  const user = await svc.setAdmin(Number(req.params.id), req.user.id, req.body.isAdmin);
  res.json({ user });
});

export const setSuspended = asyncHandler(async (req, res) => {
  const user = await svc.setSuspended(Number(req.params.id), req.user.id, req.body.isSuspended);
  res.json({ user });
});
