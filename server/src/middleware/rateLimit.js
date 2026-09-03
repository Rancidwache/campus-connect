import rateLimit from 'express-rate-limit';
import { tooManyRequests } from '../lib/errors.js';

const handler = (_req, _res, next) => next(tooManyRequests());

// Tight limiter for auth endpoints (register / login / OTP).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

// Looser limiter for general write endpoints.
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});
