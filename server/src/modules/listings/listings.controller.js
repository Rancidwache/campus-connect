import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as listingsService from './listings.service.js';

export const create = asyncHandler(async (req, res) => {
  const listing = await listingsService.createListing(req.user.id, req.body);
  res.status(201).json({ listing });
});

export const list = asyncHandler(async (req, res) => {
  // `mine=true` requires auth; requireAuthOptional attaches req.user when present.
  const result = await listingsService.listListings(req.query, req.user?.id);
  res.json(result);
});

export const getOne = asyncHandler(async (req, res) => {
  res.json({ listing: await listingsService.getListing(req.params.id, req.user?.id) });
});

export const categories = asyncHandler(async (_req, res) => {
  res.json({ categories: await listingsService.listCategories() });
});

export const saved = asyncHandler(async (req, res) => {
  res.json(await listingsService.listSaved(req.user.id, req.query));
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  res.json(await listingsService.toggleFavorite(req.user.id, req.params.id));
});

export const update = asyncHandler(async (req, res) => {
  const listing = await listingsService.updateListing(req.params.id, req.user.id, req.body);
  res.json({ listing });
});

export const remove = asyncHandler(async (req, res) => {
  await listingsService.deleteListing(req.params.id, req.user.id);
  res.status(204).send();
});
