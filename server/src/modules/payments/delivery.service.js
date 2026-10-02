import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { storage, newKey } from '../../lib/storage.js';
import { notify } from '../notifications/notifications.service.js';

const PROOF_INCLUDE = { photos: { orderBy: { position: 'asc' } } };

function serializeProof(proof) {
  if (!proof) return null;
  return {
    note: proof.note,
    createdAt: proof.createdAt,
    updatedAt: proof.updatedAt,
    photos: proof.photos.map((p) => ({ id: p.id, url: p.url })),
  };
}

async function loadTx(txId) {
  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
    include: { listing: { select: { title: true } }, client: true, provider: true },
  });
  if (!tx) throw notFound('Order not found');
  return tx;
}

// ── Provider submits (or replaces) delivery proof — photos + a note ────────
export async function submitDeliveryProof(providerId, txId, files, note) {
  const tx = await loadTx(txId);
  if (tx.providerId !== providerId) throw forbidden('Only the provider can submit delivery proof');
  if (tx.escrowStatus !== 'HELD') {
    throw badRequest(`Cannot submit delivery proof for an order that is ${tx.escrowStatus}`);
  }
  if (!files?.length) throw badRequest('Add at least one photo');

  const uploaded = [];
  for (const file of files) {
    const key = newKey(`delivery-proof/${txId}`, file.mimetype);
    const { url } = await storage.put(key, file.buffer, file.mimetype);
    uploaded.push({ url, storageKey: key });
  }

  const existing = await prisma.deliveryProof.findUnique({ where: { transactionId: txId }, include: PROOF_INCLUDE });
  if (existing) {
    for (const p of existing.photos) storage.remove(p.storageKey);
    await prisma.deliveryProofPhoto.deleteMany({ where: { deliveryProofId: existing.id } });
  }

  const proof = await prisma.deliveryProof.upsert({
    where: { transactionId: txId },
    create: {
      transactionId: txId,
      note: note?.trim() || null,
      photos: { create: uploaded.map((u, i) => ({ ...u, position: i })) },
    },
    update: {
      note: note?.trim() || null,
      photos: { create: uploaded.map((u, i) => ({ ...u, position: i })) },
    },
    include: PROOF_INCLUDE,
  });

  await notify(
    tx.clientId,
    'DELIVERY_SUBMITTED',
    'Delivery proof submitted',
    `${tx.provider.userName} marked "${tx.listing.title}" as delivered with photo proof. Review it and release payment, or raise a dispute.`,
    tx.id,
  );

  return serializeProof(proof);
}

// ── Client disputes the delivery — opens a moderation case, does not move
//    money itself. An admin resolves it by force-releasing or refunding. ──
export async function disputeDelivery(clientId, txId, { reason, detail }) {
  const tx = await loadTx(txId);
  if (tx.clientId !== clientId) throw forbidden('Only the client can dispute this delivery');
  if (tx.escrowStatus !== 'HELD') {
    throw badRequest(`Cannot dispute an order that is ${tx.escrowStatus}`);
  }

  const existing = await prisma.report.findFirst({
    where: { targetType: 'TRANSACTION', targetId: txId, status: { in: ['OPEN', 'REVIEWING'] } },
  });
  if (existing) throw badRequest('This order already has an open dispute — a moderator is on it');

  await prisma.$transaction([
    prisma.report.create({
      data: {
        reporterId: clientId,
        targetType: 'TRANSACTION',
        targetId: txId,
        reason,
        detail: detail?.trim() || null,
      },
    }),
    prisma.transaction.update({ where: { id: txId }, data: { disputed: true } }),
  ]);

  await notify(
    tx.providerId,
    'DELIVERY_DISPUTED',
    'Delivery disputed',
    `${tx.client.userName} disputed "${tx.listing.title}". Funds stay in escrow until a moderator reviews it.`,
    tx.id,
  );

  return { disputed: true };
}
