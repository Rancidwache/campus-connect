import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';

const PUBLIC_PROFILE = {
  id: true,
  fullName: true,
  phoneNumber: true,
  phoneVerified: true,
  publicKey: true,
  createdAt: true,
};

// Limited public view of another user (e.g. a listing owner). No phone number.
const LISTING_OWNER_VIEW = {
  id: true,
  fullName: true,
  publicKey: true,
  createdAt: true,
};

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_PROFILE });
  if (!user) throw notFound('Account not found');
  return user;
}

export async function updateMe(userId, data) {
  const patch = {};
  if (data.fullName !== undefined) patch.fullName = data.fullName.trim();
  const user = await prisma.user.update({ where: { id: userId }, data: patch, select: PUBLIC_PROFILE });
  return user;
}

// Store the client-generated public key used for end-to-end encrypted chat.
// The private key never leaves the device.
export async function setPublicKey(userId, publicKey) {
  return prisma.user.update({
    where: { id: userId },
    data: { publicKey },
    select: PUBLIC_PROFILE,
  });
}

export async function getPublicProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: LISTING_OWNER_VIEW });
  if (!user) throw notFound('User not found');
  return user;
}
