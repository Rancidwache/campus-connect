import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as svc from './listings.service.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await svc.listAllListings(req.query));
});

export const pause = asyncHandler(async (req, res) => {
  res.json({ listing: await svc.pauseListing(Number(req.params.id)) });
});

export const reactivate = asyncHandler(async (req, res) => {
  res.json({ listing: await svc.reactivateListing(Number(req.params.id)) });
});

export const remove = asyncHandler(async (req, res) => {
  await svc.removeListingAsAdmin(Number(req.params.id));
  res.json({ ok: true });
});
