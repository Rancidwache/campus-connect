import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { emitToUser } from '../../realtime/emit.js';

// The server is a blind relay: `encryptedPayload` is opaque ciphertext produced
// on the sender's device (ECDH-derived AES-GCM). It is never decrypted here.

const MAX_PAYLOAD = 8 * 1024; // ciphertext of a generously long message

function serialize(m) {
  return {
    id: m.id,
    senderId: m.senderId,
    receiverId: m.receiverId,
    encryptedPayload: m.encryptedPayload,
    deliveredAt: m.deliveredAt,
    createdAt: m.createdAt,
  };
}

async function requireChatReady(meId, otherId) {
  if (meId === otherId) throw badRequest('You cannot message yourself');
  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { id: meId }, select: { publicKey: true } }),
    prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true, userName: true, publicKey: true },
    }),
  ]);
  if (!other) throw notFound('User not found');
  if (!me?.publicKey) {
    throw badRequest('Set up your encryption key first (Profile → encrypted chat).');
  }
  if (!other.publicKey) {
    throw badRequest(`${other.userName} has not set up encrypted chat yet.`);
  }
  return other;
}

export async function sendMessage(meId, { toUserId, encryptedPayload }) {
  if (typeof encryptedPayload !== 'string' || encryptedPayload.length === 0) {
    throw badRequest('Message payload is required');
  }
  if (encryptedPayload.length > MAX_PAYLOAD) throw badRequest('Message is too large');

  const other = await requireChatReady(meId, toUserId);

  const message = await prisma.message.create({
    data: { senderId: meId, receiverId: toUserId, encryptedPayload },
  });

  const dto = serialize(message);
  emitToUser(toUserId, 'message:new', dto);
  emitToUser(meId, 'message:sent', dto); // echo to the sender's other tabs
  return dto;
}

export async function getThread(meId, otherId, { before, limit }) {
  // Reading history only needs the peer to exist — the caller (controller)
  // already loads the partner and 404s if not. No key requirement to read.
  const where = {
    OR: [
      { senderId: meId, receiverId: otherId },
      { senderId: otherId, receiverId: meId },
    ],
  };
  if (before) where.id = { lt: before };

  const rows = await prisma.message.findMany({
    where,
    orderBy: { id: 'desc' },
    take: Math.min(limit, 100),
  });

  // Mark the ones I just received as delivered, and tell the sender.
  const toDeliver = rows.filter((m) => m.receiverId === meId && !m.deliveredAt).map((m) => m.id);
  if (toDeliver.length) {
    const at = new Date();
    await prisma.message.updateMany({
      where: { id: { in: toDeliver } },
      data: { deliveredAt: at },
    });
    emitToUser(otherId, 'message:delivered', { byUserId: meId, messageIds: toDeliver, at });
  }

  return rows.reverse().map(serialize);
}

export async function markDelivered(meId, messageIds) {
  if (!Array.isArray(messageIds) || messageIds.length === 0) return { updated: 0 };
  const rows = await prisma.message.findMany({
    where: { id: { in: messageIds }, receiverId: meId, deliveredAt: null },
    select: { id: true, senderId: true },
  });
  if (!rows.length) return { updated: 0 };
  const at = new Date();
  await prisma.message.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { deliveredAt: at } });

  const bySender = new Map();
  for (const r of rows) bySender.set(r.senderId, [...(bySender.get(r.senderId) || []), r.id]);
  for (const [senderId, ids] of bySender) {
    emitToUser(senderId, 'message:delivered', { byUserId: meId, messageIds: ids, at });
  }
  return { updated: rows.length };
}

export async function listThreads(meId) {
  // Latest message id per conversation partner.
  // (Table/columns are @map()'d, so raw SQL uses the DB names: message_id, sender_id, …)
  const lastPerThread = await prisma.$queryRaw(Prisma.sql`
    SELECT DISTINCT ON (other_id) other_id, message_id AS last_message_id
    FROM (
      SELECT message_id, created_at,
        CASE WHEN sender_id = ${meId} THEN receiver_id ELSE sender_id END AS other_id
      FROM messages
      WHERE sender_id = ${meId} OR receiver_id = ${meId}
    ) t
    ORDER BY other_id, created_at DESC
  `);

  if (lastPerThread.length === 0) return [];

  const otherIds = lastPerThread.map((r) => Number(r.other_id));
  const lastIds = lastPerThread.map((r) => Number(r.last_message_id));

  const unreadRows = await prisma.$queryRaw(Prisma.sql`
    SELECT sender_id AS other_id, COUNT(*)::int AS unread
    FROM messages
    WHERE receiver_id = ${meId} AND delivered_at IS NULL
    GROUP BY sender_id
  `);
  const unreadBy = new Map(unreadRows.map((r) => [Number(r.other_id), Number(r.unread)]));

  const [users, lastMessages] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, userName: true, publicKey: true },
    }),
    prisma.message.findMany({ where: { id: { in: lastIds } } }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const msgById = new Map(lastMessages.map((m) => [m.id, m]));

  return lastPerThread
    .map((r) => {
      const otherId = Number(r.other_id);
      const u = userById.get(otherId);
      const last = msgById.get(Number(r.last_message_id));
      return {
        user: {
          id: otherId,
          userName: u?.userName || 'Unknown',
          publicKey: u?.publicKey || null,
        },
        unread: unreadBy.get(otherId) || 0,
        lastMessage: last ? serialize(last) : null,
      };
    })
    .sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
}

export async function unreadCount(meId) {
  const n = await prisma.message.count({ where: { receiverId: meId, deliveredAt: null } });
  return { unread: n };
}

// Public key + name for the person you're about to chat with.
export async function getChatPartner(meId, otherId) {
  if (meId === otherId) throw badRequest('You cannot message yourself');
  const u = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, userName: true, publicKey: true, createdAt: true },
  });
  if (!u) throw notFound('User not found');
  return { id: u.id, userName: u.userName, publicKey: u.publicKey, createdAt: u.createdAt };
}
