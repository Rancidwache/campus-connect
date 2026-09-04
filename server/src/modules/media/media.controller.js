import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as media from './media.service.js';

export const addListingImages = asyncHandler(async (req, res) => {
  const listing = await media.addListingImages(Number(req.params.id), req.user.id, req.files);
  res.status(201).json({ listing });
});

export const setListingVideo = asyncHandler(async (req, res) => {
  const listing = await media.setListingVideo(Number(req.params.id), req.user.id, req.file);
  res.status(201).json({ listing });
});

export const deleteListingMedia = asyncHandler(async (req, res) => {
  const listing = await media.deleteListingMedia(
    Number(req.params.id),
    req.user.id,
    Number(req.params.mediaId),
  );
  res.json({ listing });
});

export const setAvatar = asyncHandler(async (req, res) => {
  res.status(201).json({ user: await media.setAvatar(req.user.id, req.file) });
});

export const deleteAvatar = asyncHandler(async (req, res) => {
  res.json({ user: await media.deleteAvatar(req.user.id) });
});
