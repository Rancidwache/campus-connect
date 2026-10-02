import { prisma } from '../../lib/prisma.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { storage } from '../../lib/storage.js';

// Mark which of these listings the given user has saved.
async function withFavorited(listings, userId) {
  if (!userId || listings.length === 0) return listings;
  const favs = await prisma.favorite.findMany({
    where: { userId, listingId: { in: listings.map((l) => l.id) } },
    select: { listingId: true },
  });
  const set = new Set(favs.map((f) => f.listingId));
  return listings.map((l) => ({ ...l, favorited: set.has(l.id) }));
}

const OWNER_SELECT = {
  id: true,
  userName: true,
  avatarUrl: true,
  ratingAvg: true,
  ratingCount: true,
  createdAt: true,
};

const LISTING_INCLUDE = {
  owner: { select: OWNER_SELECT },
  media: { orderBy: [{ kind: 'asc' }, { position: 'asc' }] },
};

function serialize(listing) {
  const { media = [], ...rest } = listing;
  const video = media.find((m) => m.kind === 'VIDEO');
  return {
    ...rest,
    price: Number(listing.price),
    images: media
      .filter((m) => m.kind === 'IMAGE')
      .map((m) => ({ id: m.id, url: m.url, position: m.position })),
    video: video ? { id: video.id, url: video.url } : null,
  };
}

export async function createListing(userId, input) {
  const listing = await prisma.listing.create({
    data: {
      userId,
      categoryType: input.categoryType,
      category: input.category.trim(),
      title: input.title.trim(),
      description: input.description.trim(),
      price: input.price,
      location: input.location?.trim() || null,
    },
    include: LISTING_INCLUDE,
  });
  return serialize(listing);
}

export async function listListings(query, currentUserId) {
  const {
    q,
    categoryType,
    category,
    location,
    minPrice,
    maxPrice,
    mine,
    sort,
    page,
    pageSize,
  } = query;

  const where = {};

  if (mine) {
    where.userId = currentUserId;
  } else {
    // Public browsing only shows active listings.
    where.status = 'ACTIVE';
  }

  if (categoryType) where.categoryType = categoryType;
  if (category) where.category = { equals: category, mode: 'insensitive' };
  if (location) where.location = { contains: location, mode: 'insensitive' };

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
    ];
  }

  const orderBy =
    sort === 'price_asc'
      ? { price: 'asc' }
      : sort === 'price_desc'
        ? { price: 'desc' }
        : { createdAt: 'desc' };

  const [total, rows] = await prisma.$transaction([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: LISTING_INCLUDE,
    }),
  ]);

  return {
    data: await withFavorited(rows.map(serialize), currentUserId),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getListing(id, currentUserId) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: LISTING_INCLUDE,
  });
  if (!listing || listing.status === 'REMOVED') throw notFound('This listing is no longer available');
  const [decorated] = await withFavorited([serialize(listing)], currentUserId);
  return decorated;
}

// Distinct active categories with counts, curated names first.
export async function listCategories() {
  const rows = await prisma.listing.groupBy({
    by: ['category'],
    where: { status: 'ACTIVE' },
    _count: true,
  });
  return rows
    .map((r) => ({ category: r.category, count: r._count }))
    .sort((a, b) => b.count - a.count);
}

// ── favourites ────────────────────────────────────────────────────────────
export async function toggleFavorite(userId, listingId) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) throw notFound('Listing not found');
  const key = { userId_listingId: { userId, listingId } };
  const existing = await prisma.favorite.findUnique({ where: key });
  if (existing) {
    await prisma.favorite.delete({ where: key });
    return { favorited: false };
  }
  await prisma.favorite.create({ data: { userId, listingId } });
  return { favorited: true };
}

export async function listSaved(userId, { page, pageSize }) {
  const where = { userId };
  const [total, favs] = await prisma.$transaction([
    prisma.favorite.count({ where }),
    prisma.favorite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { listing: { include: LISTING_INCLUDE } },
    }),
  ]);
  const data = favs.map((f) => ({ ...serialize(f.listing), favorited: true }));
  return {
    data,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

async function loadOwned(id, userId) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw notFound('Listing not found');
  if (listing.userId !== userId) throw forbidden('This listing is not yours');
  return listing;
}

export async function updateListing(id, userId, input) {
  await loadOwned(id, userId);

  const data = {};
  for (const key of ['categoryType', 'category', 'title', 'description', 'status']) {
    if (input[key] !== undefined) data[key] = typeof input[key] === 'string' ? input[key].trim() : input[key];
  }
  if (input.price !== undefined) data.price = input.price;
  if (input.location !== undefined) data.location = input.location?.trim() || null;

  const listing = await prisma.listing.update({
    where: { id },
    data,
    include: LISTING_INCLUDE,
  });
  return serialize(listing);
}

// Soft-delete: keep the row so linked transactions stay intact; drop the media.
export async function deleteListing(id, userId) {
  await loadOwned(id, userId);
  await removeListing(id);
}

export async function removeListing(id) {
  const media = await prisma.listingMedia.findMany({ where: { listingId: id }, select: { storageKey: true } });
  await prisma.$transaction([
    prisma.listingMedia.deleteMany({ where: { listingId: id } }),
    prisma.favorite.deleteMany({ where: { listingId: id } }),
    prisma.listing.update({ where: { id }, data: { status: 'REMOVED' } }),
  ]);
  for (const m of media) storage.remove(m.storageKey);
}
