import { prisma } from '../../lib/prisma.js';

// Create an in-app notification. Module 4 will also push these over WebSocket.
export function notify(userId, type, title, body, transactionId = null) {
  return prisma.notification.create({
    data: { userId, type, title, body, transactionId },
  });
}

export async function listForUser(userId, { limit = 30 } = {}) {
  const [items, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unreadCount };
}

export async function markRead(userId, ids) {
  const where = { userId, readAt: null };
  if (Array.isArray(ids) && ids.length) where.id = { in: ids };
  const { count } = await prisma.notification.updateMany({
    where,
    data: { readAt: new Date() },
  });
  return { updated: count };
}
