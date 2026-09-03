import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/errors.js';
import { asyncHandler } from './asyncHandler.js';

// Require a valid Bearer token. Attaches req.user (the full User row minus hash).
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw unauthorized('Account no longer exists');

  const { passwordHash, ...safe } = user;
  req.user = safe;
  next();
});

// Attach req.user when a valid token is present, but never reject the request.
// Used by endpoints that are public but change behaviour when signed in
// (e.g. listings?mine=true).
export const requireAuthOptional = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user) {
      const { passwordHash, ...safe } = user;
      req.user = safe;
    }
  } catch {
    /* ignore — treat as anonymous */
  }
  next();
});

// Require that the authenticated user has completed phone (OTP) verification.
export const requireVerified = (req, _res, next) => {
  if (!req.user?.phoneVerified) {
    next(unauthorized('Verify your phone number to continue'));
    return;
  }
  next();
};
