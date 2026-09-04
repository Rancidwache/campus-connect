import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { normalizeSocials } from '../../lib/socials.js';

const PUBLIC_PROFILE = {
  id: true,
  fullName: true,
  phoneNumber: true,
  phoneVerified: true,
  publicKey: true,
  bio: true,
  avatarUrl: true,
  socials: true,
  createdAt: true,
};

// Public view of another user (a listing owner / chat partner). No phone number.
const PUBLIC_VIEW = {
  id: true,
  fullName: true,
  publicKey: true,
  bio: true,
  avatarUrl: true,
  socials: true,
  phoneVerified: true,
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
  if (data.bio !== undefined) patch.bio = data.bio.trim() || null;
  if (data.socials !== undefined) patch.socials = normalizeSocials(data.socials);
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
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_VIEW });
  if (!user) throw notFound('User not found');

  const listingCount = await prisma.listing.count({
    where: { userId, status: 'ACTIVE' },
  });

  return { ...user, activeListingCount: listingCount };
}

export async function getPublicListings(userId, { page, pageSize }) {
  const where = { userId, status: 'ACTIVE' };
  const [total, rows] = await prisma.$transaction([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, fullName: true } },
        media: { orderBy: [{ kind: 'asc' }, { position: 'asc' }] },
      },
    }),
  ]);
  return {
    data: rows.map((l) => {
      const { media, ...rest } = l;
      return {
        ...rest,
        price: Number(l.price),
        images: media.filter((m) => m.kind === 'IMAGE').map((m) => ({ id: m.id, url: m.url })),
        video: media.find((m) => m.kind === 'VIDEO') ? { url: media.find((m) => m.kind === 'VIDEO').url } : null,
      };
    }),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
