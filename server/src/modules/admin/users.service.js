import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';

const SELECT = {
  id: true,
  fullName: true,
  phoneNumber: true,
  isAdmin: true,
  isSuspended: true,
  phoneVerified: true,
  ratingAvg: true,
  ratingCount: true,
  createdAt: true,
};

export async function listUsers({ q, page, pageSize }) {
  const where = q
    ? {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { phoneNumber: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: SELECT,
    }),
  ]);

  return {
    data: rows,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function setAdmin(targetId, actingUserId, isAdmin) {
  if (targetId === actingUserId && !isAdmin) {
    throw badRequest("You can't revoke your own admin access");
  }
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw notFound('User not found');
  const updated = await prisma.user.update({ where: { id: targetId }, data: { isAdmin }, select: SELECT });
  return updated;
}

export async function setSuspended(targetId, actingUserId, isSuspended) {
  if (targetId === actingUserId && isSuspended) {
    throw badRequest("You can't suspend your own account");
  }
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw notFound('User not found');
  const updated = await prisma.user.update({ where: { id: targetId }, data: { isSuspended }, select: SELECT });
  return updated;
}
