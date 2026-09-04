import { prisma } from '../../lib/prisma.js';
import { emitToUser } from '../../realtime/emit.js';

// Create an in-app notification and push it to the user in real time if they
// have a socket connected (falls back to the 25s poll otherwise).
export async function notify(userId, type, title, body, transactionId = null) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, transactionId },
  });
  emitToUser(userId, 'notification:new', notification);
  return notification;
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
