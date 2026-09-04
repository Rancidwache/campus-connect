import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { storage, newKey } from '../../lib/storage.js';

const LISTING_INCLUDE = {
  owner: { select: { id: true, fullName: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
  media: { orderBy: [{ kind: 'asc' }, { position: 'asc' }] },
};

function serializeListing(listing) {
  const video = listing.media.find((m) => m.kind === 'VIDEO');
  const { media, ...rest } = listing;
  return {
    ...rest,
    price: Number(listing.price),
    images: media
      .filter((m) => m.kind === 'IMAGE')
      .map((m) => ({ id: m.id, url: m.url, position: m.position })),
    video: video ? { id: video.id, url: video.url } : null,
  };
}

async function loadOwnedListing(listingId, userId) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { media: true },
  });
  if (!listing) throw notFound('Listing not found');
  if (listing.userId !== userId) throw forbidden('This listing is not yours');
  return listing;
}

export async function addListingImages(listingId, userId, files) {
  if (!files?.length) throw badRequest('No images uploaded');
  const listing = await loadOwnedListing(listingId, userId);

  const existing = listing.media.filter((m) => m.kind === 'IMAGE');
  const room = env.storage.maxImagesPerListing - existing.length;
  if (room <= 0) throw badRequest(`A listing can have at most ${env.storage.maxImagesPerListing} images`);
  const accepted = files.slice(0, room);

  let position = existing.reduce((max, m) => Math.max(max, m.position), -1);
  for (const file of accepted) {
    position += 1;
    const key = newKey(`listings/${listingId}`, file.mimetype);
    const { url } = await storage.put(key, file.buffer, file.mimetype);
    await prisma.listingMedia.create({
      data: { listingId, kind: 'IMAGE', url, storageKey: key, position },
    });
  }

  const fresh = await prisma.listing.findUnique({ where: { id: listingId }, include: LISTING_INCLUDE });
  return serializeListing(fresh);
}

export async function setListingVideo(listingId, userId, file) {
  if (!file) throw badRequest('No video uploaded');
  const listing = await loadOwnedListing(listingId, userId);

  const old = listing.media.find((m) => m.kind === 'VIDEO');
  const key = newKey(`listings/${listingId}`, file.mimetype);
  const { url } = await storage.put(key, file.buffer, file.mimetype);

  if (old) {
    await prisma.listingMedia.update({ where: { id: old.id }, data: { url, storageKey: key } });
    storage.remove(old.storageKey);
  } else {
    await prisma.listingMedia.create({ data: { listingId, kind: 'VIDEO', url, storageKey: key } });
  }

  const fresh = await prisma.listing.findUnique({ where: { id: listingId }, include: LISTING_INCLUDE });
  return serializeListing(fresh);
}

export async function deleteListingMedia(listingId, userId, mediaId) {
  await loadOwnedListing(listingId, userId);
  const m = await prisma.listingMedia.findUnique({ where: { id: mediaId } });
  if (!m || m.listingId !== listingId) throw notFound('Media not found');
  await prisma.listingMedia.delete({ where: { id: mediaId } });
  storage.remove(m.storageKey);

  const fresh = await prisma.listing.findUnique({ where: { id: listingId }, include: LISTING_INCLUDE });
  return serializeListing(fresh);
}

// ── Avatars ────────────────────────────────────────────────────────────────
const PUBLIC_PROFILE = {
  id: true,
  fullName: true,
  phoneNumber: true,
  phoneVerified: true,
  publicKey: true,
  bio: true,
  avatarUrl: true,
  socials: true,
  ratingAvg: true,
  ratingCount: true,
  createdAt: true,
};

export async function setAvatar(userId, file) {
  if (!file) throw badRequest('No image uploaded');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });

  const key = newKey(`avatars/${userId}`, file.mimetype);
  const { url } = await storage.put(key, file.buffer, file.mimetype);
  if (user?.avatarKey) storage.remove(user.avatarKey);

  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: url, avatarKey: key },
    select: PUBLIC_PROFILE,
  });
}

export async function deleteAvatar(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });
  if (user?.avatarKey) storage.remove(user.avatarKey);
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null, avatarKey: null },
    select: PUBLIC_PROFILE,
  });
}
