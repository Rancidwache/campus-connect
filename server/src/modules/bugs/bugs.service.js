import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { STATUSES } from './bugs.validation.js';

const WITH_REPORTER = { user: { select: { id: true, userName: true, phoneNumber: true } } };

// userId is null for anonymous reports (e.g. a bug on the sign-in screen).
export async function createBugReport(userId, { title, description, severity, pageUrl, contact }, userAgent) {
  const report = await prisma.bugReport.create({
    data: {
      userId: userId ?? null,
      title,
      description,
      severity,
      pageUrl: pageUrl || null,
      userAgent: userAgent ? userAgent.slice(0, 500) : null,
      // A contact is only needed when there is no account to follow up with.
      contact: userId ? null : contact || null,
    },
  });
  return { id: report.id, status: report.status };
}

export async function listBugReports({ status, page, pageSize }) {
  const where = status ? { status } : {};
  const [total, rows, grouped] = await prisma.$transaction([
    prisma.bugReport.count({ where }),
    prisma.bugReport.findMany({
      where,
      include: WITH_REPORTER,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bugReport.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const g of grouped) counts[g.status] = g._count._all;

  return {
    data: rows,
    counts,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function updateBugReport(id, { status, adminNote }) {
  const existing = await prisma.bugReport.findUnique({ where: { id } });
  if (!existing) throw notFound('Bug report not found');
  return prisma.bugReport.update({
    where: { id },
    data: { ...(status !== undefined && { status }), ...(adminNote !== undefined && { adminNote }) },
    include: WITH_REPORTER,
  });
}
