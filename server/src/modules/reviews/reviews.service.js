import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { notify } from '../notifications/notifications.service.js';

// A client may review a transaction once it has reached a terminal outcome.
const REVIEWABLE_STATES = ['RELEASED', 'REFUNDED'];
// Any of these means the author actually transacted with the provider.
const CUSTOMER_STATES = ['HELD', 'RELEASING', 'RELEASED', 'REFUNDING', 'REFUNDED'];

const AUTHOR_SELECT = { id: true, fullName: true, avatarUrl: true };

// ── rating rollup ──────────────────────────────────────────────────────────
export async function recomputeProviderRating(providerId) {
  const agg = await prisma.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.user.update({
    where: { id: providerId },
    data: {
      ratingAvg: agg._count ? Number((agg._avg.rating || 0).toFixed(2)) : 0,
      ratingCount: agg._count,
    },
  });
}

// ── role of an author, relative to the reviewed provider ───────────────────
async function customerIdSet(providerId, authorIds) {
  if (authorIds.length === 0) return new Set();
  const rows = await prisma.transaction.findMany({
    where: { providerId, clientId: { in: authorIds }, escrowStatus: { in: CUSTOMER_STATES } },
    select: { clientId: true },
    distinct: ['clientId'],
  });
  return new Set(rows.map((r) => r.clientId));
}

function roleFor(authorId, providerId, customers) {
  if (authorId === providerId) return 'PROVIDER';
  if (customers.has(authorId)) return 'CUSTOMER';
  return 'VISITOR';
}

// ── create / edit / delete a review ───────────────────────────────────────
export async function createReview(authorId, { transactionId, rating, body }) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { review: true },
  });
  if (!tx) throw notFound('Order not found');
  if (tx.clientId !== authorId) throw forbidden('You can only review your own orders');
  if (!REVIEWABLE_STATES.includes(tx.escrowStatus)) {
    throw conflict('You can review an order once it is completed');
  }
  if (tx.review) throw conflict('You have already reviewed this order');

  const review = await prisma.review.create({
    data: { providerId: tx.providerId, authorId, transactionId, rating, body: body.trim() },
  });
  await recomputeProviderRating(tx.providerId);

  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { fullName: true } });
  await notify(
    tx.providerId,
    'NEW_REVIEW',
    `New ${rating}-star review`,
    `${author.fullName} reviewed your work: "${truncate(body, 90)}"`,
    transactionId,
  );

  return getReview(review.id, authorId);
}

export async function updateReview(authorId, id, { rating, body }) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw notFound('Review not found');
  if (review.authorId !== authorId) throw forbidden('Not your review');

  const updated = await prisma.review.update({
    where: { id },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(body !== undefined ? { body: body.trim() } : {}),
    },
  });
  if (rating !== undefined) await recomputeProviderRating(review.providerId);
  return getReview(updated.id, authorId);
}

export async function deleteReview(authorId, id) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw notFound('Review not found');
  if (review.authorId !== authorId) throw forbidden('Not your review');
  await prisma.review.delete({ where: { id } });
  await recomputeProviderRating(review.providerId);
}

// ── replies ───────────────────────────────────────────────────────────────
export async function addReply(authorId, reviewId, { body, parentReplyId }) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { author: { select: { fullName: true } } },
  });
  if (!review) throw notFound('Review not found');

  if (parentReplyId) {
    const parent = await prisma.reviewReply.findUnique({ where: { id: parentReplyId } });
    if (!parent || parent.reviewId !== reviewId) throw badRequest('Invalid parent reply');
  }

  const reply = await prisma.reviewReply.create({
    data: { reviewId, authorId, parentReplyId: parentReplyId ?? null, body: body.trim() },
  });

  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { fullName: true } });
  const recipients = new Set([review.authorId, review.providerId]);
  recipients.delete(authorId);
  for (const uid of recipients) {
    await notify(
      uid,
      'REVIEW_REPLY',
      'New reply on a review',
      `${author.fullName}: "${truncate(body, 90)}"`,
      review.transactionId,
    );
  }

  return getReply(reply.id, authorId);
}

export async function deleteReply(authorId, replyId) {
  const reply = await prisma.reviewReply.findUnique({ where: { id: replyId } });
  if (!reply) throw notFound('Reply not found');
  if (reply.authorId !== authorId) throw forbidden('Not your reply');
  await prisma.reviewReply.delete({ where: { id: replyId } });
}

// ── likes (toggle) ────────────────────────────────────────────────────────
export async function toggleReviewLike(userId, reviewId) {
  const existing = await prisma.reviewLike.findUnique({
    where: { reviewId_userId: { reviewId, userId } },
  });
  if (existing) {
    await prisma.reviewLike.delete({ where: { reviewId_userId: { reviewId, userId } } });
  } else {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw notFound('Review not found');
    await prisma.reviewLike.create({ data: { reviewId, userId } });
  }
  const likeCount = await prisma.reviewLike.count({ where: { reviewId } });
  return { liked: !existing, likeCount };
}

export async function toggleReplyLike(userId, replyId) {
  const existing = await prisma.replyLike.findUnique({
    where: { replyId_userId: { replyId, userId } },
  });
  if (existing) {
    await prisma.replyLike.delete({ where: { replyId_userId: { replyId, userId } } });
  } else {
    const reply = await prisma.reviewReply.findUnique({ where: { id: replyId } });
    if (!reply) throw notFound('Reply not found');
    await prisma.replyLike.create({ data: { replyId, userId } });
  }
  const likeCount = await prisma.replyLike.count({ where: { replyId } });
  return { liked: !existing, likeCount };
}

// ── reads ─────────────────────────────────────────────────────────────────
const REVIEW_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  _count: { select: { likes: true } },
  replies: {
    orderBy: { createdAt: 'asc' },
    include: { author: { select: AUTHOR_SELECT }, _count: { select: { likes: true } } },
  },
};

async function decorate(reviews, providerId, viewerId) {
  const authorIds = new Set();
  for (const r of reviews) {
    authorIds.add(r.authorId);
    for (const rep of r.replies) authorIds.add(rep.authorId);
  }
  const customers = await customerIdSet(providerId, [...authorIds]);

  let likedReviews = new Set();
  let likedReplies = new Set();
  if (viewerId) {
    const reviewIds = reviews.map((r) => r.id);
    const replyIds = reviews.flatMap((r) => r.replies.map((x) => x.id));
    const [rl, pl] = await Promise.all([
      reviewIds.length
        ? prisma.reviewLike.findMany({ where: { userId: viewerId, reviewId: { in: reviewIds } }, select: { reviewId: true } })
        : [],
      replyIds.length
        ? prisma.replyLike.findMany({ where: { userId: viewerId, replyId: { in: replyIds } }, select: { replyId: true } })
        : [],
    ]);
    likedReviews = new Set(rl.map((x) => x.reviewId));
    likedReplies = new Set(pl.map((x) => x.replyId));
  }

  const mapReply = (rep) => ({
    id: rep.id,
    body: rep.body,
    createdAt: rep.createdAt,
    parentReplyId: rep.parentReplyId,
    author: rep.author,
    authorRole: roleFor(rep.authorId, providerId, customers),
    likeCount: rep._count.likes,
    likedByMe: likedReplies.has(rep.id),
    mine: rep.authorId === viewerId,
  });

  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    author: r.author,
    authorRole: roleFor(r.authorId, providerId, customers),
    likeCount: r._count.likes,
    likedByMe: likedReviews.has(r.id),
    mine: r.authorId === viewerId,
    replies: r.replies.map(mapReply),
  }));
}

async function getReview(id, viewerId) {
  const r = await prisma.review.findUnique({ where: { id }, include: REVIEW_INCLUDE });
  const [decorated] = await decorate([r], r.providerId, viewerId);
  return decorated;
}

async function getReply(id, viewerId) {
  const rep = await prisma.reviewReply.findUnique({
    where: { id },
    include: { author: { select: AUTHOR_SELECT }, _count: { select: { likes: true } }, review: true },
  });
  const customers = await customerIdSet(rep.review.providerId, [rep.authorId]);
  return {
    id: rep.id,
    body: rep.body,
    createdAt: rep.createdAt,
    parentReplyId: rep.parentReplyId,
    reviewId: rep.reviewId,
    author: rep.author,
    authorRole: roleFor(rep.authorId, rep.review.providerId, customers),
    likeCount: rep._count.likes,
    likedByMe: false,
    mine: rep.authorId === viewerId,
  };
}

export async function listForProvider(providerId, viewerId, { page, pageSize }) {
  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true, ratingAvg: true, ratingCount: true },
  });
  if (!provider) throw notFound('User not found');

  const [rows, dist] = await Promise.all([
    prisma.review.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: REVIEW_INCLUDE,
    }),
    prisma.review.groupBy({ by: ['rating'], where: { providerId }, _count: true }),
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of dist) distribution[d.rating] = d._count;

  return {
    summary: {
      average: provider.ratingAvg,
      count: provider.ratingCount,
      distribution,
    },
    data: await decorate(rows, providerId, viewerId),
    pagination: {
      page,
      pageSize,
      total: provider.ratingCount,
      totalPages: Math.max(1, Math.ceil(provider.ratingCount / pageSize)),
    },
  };
}

// Orders the current user can review but hasn't yet.
export async function pendingForUser(userId) {
  const txs = await prisma.transaction.findMany({
    where: { clientId: userId, escrowStatus: { in: REVIEWABLE_STATES }, review: null },
    orderBy: { updatedAt: 'desc' },
    include: {
      listing: { select: { id: true, title: true } },
      provider: { select: { id: true, fullName: true } },
    },
  });
  return txs.map((t) => ({
    transactionId: t.id,
    listing: t.listing,
    provider: t.provider,
    escrowStatus: t.escrowStatus,
    completedAt: t.releasedAt || t.refundedAt || t.updatedAt,
  }));
}

function truncate(s, n) {
  const t = String(s).trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}
