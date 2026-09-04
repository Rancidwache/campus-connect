import { prisma } from '../../lib/prisma.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { storage } from '../../lib/storage.js';

const OWNER_SELECT = { id: true, fullName: true, avatarUrl: true, createdAt: true };

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
    data: rows.map(serialize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getListing(id) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: LISTING_INCLUDE,
  });
  if (!listing) throw notFound('Listing not found');
  return serialize(listing);
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

export async function deleteListing(id, userId) {
  await loadOwned(id, userId);
  const media = await prisma.listingMedia.findMany({ where: { listingId: id }, select: { storageKey: true } });
  await prisma.listing.delete({ where: { id } }); // media rows cascade
  for (const m of media) storage.remove(m.storageKey);
}
