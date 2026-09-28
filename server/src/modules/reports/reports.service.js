import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { recomputeProviderRating } from '../reviews/reviews.service.js';
import { removeListing } from '../listings/listings.service.js';

const REMOVABLE = ['LISTING', 'REVIEW', 'REVIEW_REPLY'];

// Load a report target: existence, who "owns" it (for self-report checks), and a
// short label for the moderation queue.
async function loadTarget(type, id) {
  switch (type) {
    case 'LISTING': {
      const l = await prisma.listing.findUnique({ where: { id }, select: { id: true, userId: true, title: true, status: true } });
      return l && l.status !== 'REMOVED'
        ? { ownerId: l.userId, label: l.title, link: `/listings/${l.id}` }
        : null;
    }
    case 'REVIEW': {
      const r = await prisma.review.findUnique({ where: { id }, select: { authorId: true, providerId: true, body: true } });
      return r && { ownerId: r.authorId, label: r.body.slice(0, 120), link: `/u/${r.providerId}#reviews` };
    }
    case 'REVIEW_REPLY': {
      const r = await prisma.reviewReply.findUnique({
        where: { id },
        select: { authorId: true, body: true, review: { select: { providerId: true } } },
      });
      return r && { ownerId: r.authorId, label: r.body.slice(0, 120), link: `/u/${r.review.providerId}#reviews` };
    }
    case 'USER': {
      const u = await prisma.user.findUnique({ where: { id }, select: { id: true, fullName: true } });
      return u && { ownerId: u.id, label: u.fullName, link: `/u/${u.id}` };
    }
    case 'TRANSACTION': {
      const t = await prisma.transaction.findUnique({
        where: { id },
        select: {
          id: true,
          providerId: true,
          escrowStatus: true,
          amount: true,
          disputed: true,
          listing: { select: { title: true } },
        },
      });
      return (
        t && {
          ownerId: t.providerId,
          label: `${t.listing.title} — KES ${Number(t.amount)} (${t.escrowStatus})`,
          // Not linked: /orders/:id only opens for the two participants, not admins.
          link: null,
        }
      );
    }
    default:
      return null;
  }
}

// ── report (any signed-in user) ───────────────────────────────────────────
export async function createReport(reporterId, { targetType, targetId, reason, detail }) {
  const target = await loadTarget(targetType, targetId);
  if (!target) throw notFound('That content no longer exists');
  if (target.ownerId === reporterId) throw badRequest('You cannot report your own content');

  try {
    const report = await prisma.report.create({
      data: { reporterId, targetType, targetId, reason, detail: detail?.trim() || null },
    });
    return { id: report.id, status: report.status, createdAt: report.createdAt };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('You have already reported this — our team is on it');
    }
    throw err;
  }
}

export async function myReports(userId) {
  const rows = await prisma.report.findMany({
    where: { reporterId: userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    reason: r.reason,
    status: r.status,
    detail: r.detail,
    createdAt: r.createdAt,
  }));
}

// ── moderation ────────────────────────────────────────────────────────────
export async function listReports({ status, page, pageSize }) {
  const where = status ? { status } : {};
  const [total, rows] = await prisma.$transaction([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  const data = [];
  for (const r of rows) {
    const target = await loadTarget(r.targetType, r.targetId);
    data.push({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      reviewNote: r.reviewNote,
      reporter: r.reporter,
      reviewedBy: r.reviewedBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      target: target
        ? { label: target.label, link: target.link, exists: true }
        : { label: '(deleted)', link: null, exists: false },
    });
  }
  return { data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

export async function reportStats() {
  const rows = await prisma.report.groupBy({ by: ['status'], _count: true });
  const out = { OPEN: 0, REVIEWING: 0, ACTIONED: 0, DISMISSED: 0 };
  for (const r of rows) out[r.status] = r._count;
  return out;
}

export async function updateReport(moderatorId, id, { status, reviewNote }) {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) throw notFound('Report not found');

  // Dismissing a transaction dispute without releasing/refunding shouldn't
  // leave the order permanently locked — clear the flag so the normal
  // approve/decline flow is available again.
  if (report.targetType === 'TRANSACTION' && status === 'DISMISSED') {
    await prisma.transaction.update({ where: { id: report.targetId }, data: { disputed: false } });
  }

  return prisma.report.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(reviewNote !== undefined ? { reviewNote: reviewNote?.trim() || null } : {}),
      reviewedById: moderatorId,
    },
  });
}

// Delete the reported content, then close this + sibling reports for the same target.
export async function removeReportedContent(moderatorId, id, { reviewNote }) {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) throw notFound('Report not found');
  if (!REMOVABLE.includes(report.targetType)) {
    throw badRequest('Use a status update for reports about a user');
  }

  const target = await loadTarget(report.targetType, report.targetId);
  if (!target) {
    // Already gone — just close it out.
    await closeSiblings(report, moderatorId, reviewNote);
    return { removed: false };
  }

  if (report.targetType === 'LISTING') {
    await removeListing(report.targetId); // soft-delete (keeps transaction history)
  } else if (report.targetType === 'REVIEW') {
    const rev = await prisma.review.findUnique({ where: { id: report.targetId }, select: { providerId: true } });
    await prisma.review.delete({ where: { id: report.targetId } });
    if (rev) await recomputeProviderRating(rev.providerId);
  } else {
    await prisma.reviewReply.delete({ where: { id: report.targetId } });
  }

  await closeSiblings(report, moderatorId, reviewNote);
  return { removed: true };
}

async function closeSiblings(report, moderatorId, reviewNote) {
  await prisma.report.updateMany({
    where: { targetType: report.targetType, targetId: report.targetId, status: { in: ['OPEN', 'REVIEWING'] } },
    data: { status: 'ACTIONED', reviewedById: moderatorId, reviewNote: reviewNote?.trim() || null },
  });
}
