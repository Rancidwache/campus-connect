import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as usersService from './users.service.js';
import { SOCIAL_KEYS } from '../../lib/socials.js';

export const updateMeSchema = {
  body: z.object({
    fullName: z.string().min(2).max(120).optional(),
    bio: z.string().max(600).optional(),
    socials: z
      .object(Object.fromEntries(SOCIAL_KEYS.map((k) => [k, z.string().max(300).optional()])))
      .partial()
      .optional(),
  }),
};

export const listQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
  }),
};

export const publicKeySchema = {
  body: z.object({
    publicKey: z
      .string()
      .min(32, 'That does not look like a valid public key')
      .max(4096),
  }),
};

export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: await usersService.getMe(req.user.id) });
});

export const updateMe = asyncHandler(async (req, res) => {
  res.json({ user: await usersService.updateMe(req.user.id, req.body) });
});

export const setPublicKey = asyncHandler(async (req, res) => {
  const user = await usersService.setPublicKey(req.user.id, req.body.publicKey);
  res.json({ message: 'Encryption key registered.', user });
});

export const getPublicProfile = asyncHandler(async (req, res) => {
  res.json({ user: await usersService.getPublicProfile(req.params.id) });
});

export const getPublicListings = asyncHandler(async (req, res) => {
  res.json(await usersService.getPublicListings(req.params.id, req.query));
});
