import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { removeListing } from '../listings/listings.service.js';

const OWNER_SELECT = { id: true, fullName: true };

function serialize(listing) {
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    categoryType: listing.categoryType,
    status: listing.status,
    price: Number(listing.price),
    location: listing.location,
    createdAt: listing.createdAt,
    owner: listing.owner,
  };
}

// Every listing regardless of status (public browse hides PAUSED/REMOVED — the
// admin view needs to see everything, including what it's about to moderate).
export async function listAllListings({ q, status, page, pageSize }) {
  const where = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { owner: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [total, rows] = await prisma.$transaction([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { owner: { select: OWNER_SELECT } },
    }),
  ]);

  return {
    data: rows.map(serialize),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function pauseListing(id) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.status === 'REMOVED') throw notFound('Listing not found');
  const updated = await prisma.listing.update({
    where: { id },
    data: { status: 'PAUSED' },
    include: { owner: { select: OWNER_SELECT } },
  });
  return serialize(updated);
}

export async function reactivateListing(id) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.status === 'REMOVED') throw notFound('Listing not found');
  const updated = await prisma.listing.update({
    where: { id },
    data: { status: 'ACTIVE' },
    include: { owner: { select: OWNER_SELECT } },
  });
  return serialize(updated);
}

export async function removeListingAsAdmin(id) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw notFound('Listing not found');
  await removeListing(id);
}
