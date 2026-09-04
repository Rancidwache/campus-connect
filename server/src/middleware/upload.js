import multer from 'multer';
import { env } from '../config/env.js';
import { badRequest } from '../lib/errors.js';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

function mimeFilter(allowed, label) {
  return (_req, file, cb) => {
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(badRequest(`Unsupported file type for ${label}: ${file.mimetype}`));
  };
}

const imagesUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.storage.maxImageBytes, files: env.storage.maxImagesPerListing },
  fileFilter: mimeFilter(IMAGE_MIMES, 'images'),
}).array('images', env.storage.maxImagesPerListing);

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.storage.maxVideoBytes, files: 1 },
  fileFilter: mimeFilter(VIDEO_MIMES, 'video'),
}).single('video');

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.storage.maxImageBytes, files: 1 },
  fileFilter: mimeFilter(IMAGE_MIMES, 'avatar'),
}).single('avatar');

// Wrap a multer middleware so its errors become our typed AppErrors.
function wrap(mw) {
  return (req, res, next) =>
    mw(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        const msg =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'That file is too large'
            : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
              ? 'Too many files'
              : `Upload error: ${err.message}`;
        return next(badRequest(msg));
      }
      return next(err);
    });
}

export const uploadImages = wrap(imagesUpload);
export const uploadVideo = wrap(videoUpload);
export const uploadAvatar = wrap(avatarUpload);
