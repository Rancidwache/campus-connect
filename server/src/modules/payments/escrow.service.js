import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { normalizeKePhone } from '../../lib/phone.js';
import { quote as priceQuote, toKes } from '../../lib/money.js';
import { daraja } from './daraja.client.js';
import { notify } from '../notifications/notifications.service.js';

const OPEN_STATES = ['PENDING_PAYMENT', 'HELD', 'RELEASING', 'REFUNDING'];

const TX_INCLUDE = {
  listing: { select: { id: true, title: true, categoryType: true, category: true } },
  client: { select: { id: true, fullName: true } },
  provider: { select: { id: true, fullName: true } },
};

function serialize(tx, viewerId) {
  return {
    id: tx.id,
    role: tx.clientId === viewerId ? 'client' : 'provider',
    escrowStatus: tx.escrowStatus,
    currency: tx.currency,
    feeAmount: Number(tx.feeAmount),
    platformFee: Number(tx.platformFee),
    amount: Number(tx.amount),
    listing: tx.listing,
    client: tx.client,
    provider: tx.provider,
    clientPhone: tx.clientPhone,
    providerPhone: tx.providerPhone,
    mpesaReceipt: tx.mpesaReceipt,
    b2cReceipt: tx.b2cReceipt,
    stkResultDesc: tx.stkResultDesc,
    b2cResultDesc: tx.b2cResultDesc,
    paidAt: tx.paidAt,
    releasedAt: tx.releasedAt,
    refundedAt: tx.refundedAt,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

function logEvent(kind, ref, payload, transactionId = null, resultCode = null) {
  return prisma.mpesaEvent.create({
    data: { kind, ref: ref ?? null, payload, transactionId, resultCode },
  });
}

// ── Quote ───────────────────────────────────────────────────────────────────
export async function getQuote(listingId) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw notFound('Listing not found');
  const q = priceQuote(listing.price, env.mpesa.platformFeeRate);
  return { listingId, currency: 'KES', ...q, feeRatePct: Math.round(env.mpesa.platformFeeRate * 100) };
}

// ── Hire a listing → open escrow → STK Push ─────────────────────────────────
export async function hire(clientUser, { listingId, phone }) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { owner: true },
  });
  if (!listing) throw notFound('Listing not found');
  if (listing.userId === clientUser.id) throw badRequest('You cannot hire your own listing');
  if (listing.status !== 'ACTIVE') throw conflict('This listing is not currently available');

  const existing = await prisma.transaction.findFirst({
    where: { listingId, clientId: clientUser.id, escrowStatus: { in: OPEN_STATES } },
  });
  if (existing) throw conflict('You already have an open order for this listing');

  const clientPhone = phone ? normalizeKePhone(phone) : clientUser.phoneNumber;
  const providerPhone = listing.owner.phoneNumber;
  const q = priceQuote(listing.price, env.mpesa.platformFeeRate);

  const tx = await prisma.transaction.create({
    data: {
      listingId,
      clientId: clientUser.id,
      providerId: listing.userId,
      currency: 'KES',
      feeAmount: q.feeAmount,
      platformFee: q.platformFee,
      amount: q.amount,
      escrowStatus: 'PENDING_PAYMENT',
      clientPhone,
      providerPhone,
    },
    include: TX_INCLUDE,
  });

  try {
    const stk = await daraja.stkPush({
      amount: toKes(q.amount),
      phone: clientPhone,
      accountRef: `CC-${tx.id}`,
      description: `Escrow ${tx.id}`,
    });
    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        stkCheckoutRequestId: stk.checkoutRequestId,
        stkMerchantRequestId: stk.merchantRequestId,
      },
      include: TX_INCLUDE,
    });
    await logEvent('STK_PUSH_REQUEST', stk.checkoutRequestId, stk, tx.id);
    return { transaction: serialize(updated, clientUser.id), customerMessage: stk.customerMessage };
  } catch (err) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { escrowStatus: 'PAYMENT_FAILED', stkResultDesc: `STK Push request failed: ${err.message}` },
    });
    throw badRequest('Could not start the M-Pesa payment. Please try again.');
  }
}

// ── STK Push callback — deposit collected (or not) ──────────────────────────
export async function handleStkCallback(body) {
  const stk = body?.Body?.stkCallback;
  if (!stk?.CheckoutRequestID) {
    await logEvent('STK_CALLBACK', null, body ?? {});
    return { ok: true };
  }

  const tx = await prisma.transaction.findUnique({
    where: { stkCheckoutRequestId: stk.CheckoutRequestID },
    include: TX_INCLUDE,
  });
  await logEvent('STK_CALLBACK', stk.CheckoutRequestID, body, tx?.id ?? null, stk.ResultCode);

  if (!tx) return { ok: true }; // unknown / already-GC'd reference
  if (tx.escrowStatus !== 'PENDING_PAYMENT') return { ok: true }; // idempotent

  if (stk.ResultCode === 0) {
    const meta = Object.fromEntries(
      (stk.CallbackMetadata?.Item || []).map((i) => [i.Name, i.Value]),
    );
    const done = await prisma.transaction.updateMany({
      where: { id: tx.id, escrowStatus: 'PENDING_PAYMENT' },
      data: {
        escrowStatus: 'HELD',
        stkResultCode: 0,
        stkResultDesc: stk.ResultDesc,
        mpesaReceipt: meta.MpesaReceiptNumber ? String(meta.MpesaReceiptNumber) : null,
        paidAt: new Date(),
      },
    });
    if (done.count === 1) {
      await notify(
        tx.providerId,
        'ESCROW_FUNDED',
        'Funds secured — you can start the job',
        `${tx.client.fullName} paid ${tx.currency} ${Number(tx.amount)} into escrow for "${tx.listing.title}".`,
        tx.id,
      );
      await notify(
        tx.clientId,
        'ESCROW_FUNDED',
        'Payment secured in escrow',
        `Your payment for "${tx.listing.title}" is held safely. Release it once the job is done.`,
        tx.id,
      );
    }
  } else {
    const done = await prisma.transaction.updateMany({
      where: { id: tx.id, escrowStatus: 'PENDING_PAYMENT' },
      data: { escrowStatus: 'PAYMENT_FAILED', stkResultCode: stk.ResultCode, stkResultDesc: stk.ResultDesc },
    });
    if (done.count === 1) {
      await notify(
        tx.clientId,
        'PAYMENT_FAILED',
        'M-Pesa payment not completed',
        `The payment for "${tx.listing.title}" did not go through (${stk.ResultDesc}). You can try again.`,
        tx.id,
      );
    }
  }
  return { ok: true };
}

// ── Client approves delivery → B2C payout to the provider ───────────────────
export async function approveDelivery(userId, txId) {
  const tx = await loadParticipant(txId, userId);
  if (tx.clientId !== userId) throw forbidden('Only the client can approve delivery');
  if (tx.escrowStatus !== 'HELD') throw conflict(`Cannot approve an order that is ${tx.escrowStatus}`);

  const moved = await prisma.transaction.updateMany({
    where: { id: tx.id, escrowStatus: 'HELD' },
    data: { escrowStatus: 'RELEASING' },
  });
  if (moved.count !== 1) throw conflict('Order state changed — refresh and try again');

  await notify(tx.providerId, 'DELIVERY_APPROVED', 'Delivery approved', `${tx.client.fullName} approved "${tx.listing.title}". Your payout is on the way.`, tx.id);
  await startB2c(tx, {
    to: tx.providerPhone,
    amount: toKes(tx.feeAmount),
    remarks: `Campus Connect payout for order ${tx.id}`,
    occasion: tx.listing.title.slice(0, 90),
  });

  return getTransaction(userId, txId);
}

// ── Provider declines the job → B2C refund to the client ────────────────────
export async function declineJob(userId, txId) {
  const tx = await loadParticipant(txId, userId);
  if (tx.providerId !== userId) throw forbidden('Only the provider can decline the job');
  if (tx.escrowStatus !== 'HELD') throw conflict(`Cannot decline an order that is ${tx.escrowStatus}`);

  const moved = await prisma.transaction.updateMany({
    where: { id: tx.id, escrowStatus: 'HELD' },
    data: { escrowStatus: 'REFUNDING' },
  });
  if (moved.count !== 1) throw conflict('Order state changed — refresh and try again');

  await notify(tx.clientId, 'JOB_DECLINED', 'Provider declined — you are being refunded', `${tx.provider.fullName} declined "${tx.listing.title}". Your full payment is being returned.`, tx.id);
  await startB2c(tx, {
    to: tx.clientPhone,
    amount: toKes(tx.amount),
    remarks: `Campus Connect refund for order ${tx.id}`,
    occasion: `Refund: ${tx.listing.title}`.slice(0, 90),
  });

  return getTransaction(userId, txId);
}

// ── Client cancels before paying ───────────────────────────────────────────
export async function cancel(userId, txId) {
  const tx = await loadParticipant(txId, userId);
  if (tx.clientId !== userId) throw forbidden('Only the client can cancel this order');
  if (!['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(tx.escrowStatus)) {
    throw conflict('This order can no longer be cancelled');
  }
  await prisma.transaction.updateMany({
    where: { id: tx.id, escrowStatus: { in: ['PENDING_PAYMENT', 'PAYMENT_FAILED'] } },
    data: { escrowStatus: 'CANCELLED' },
  });
  return getTransaction(userId, txId);
}

async function startB2c(tx, { to, amount, remarks, occasion }) {
  try {
    const res = await daraja.b2cPayment({ amount, phone: to, remarks, occasion });
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { b2cConversationId: res.conversationId },
    });
    await logEvent('B2C_REQUEST', res.conversationId, res, tx.id);
  } catch (err) {
    // Roll back to HELD so the action can be retried.
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { escrowStatus: 'HELD', b2cResultDesc: `B2C request failed: ${err.message}` },
    });
    throw badRequest('Could not reach M-Pesa for the payout. Please try again.');
  }
}

// ── B2C result — payout / refund settled (or failed) ───────────────────────
export async function handleB2cResult(body) {
  const r = body?.Result;
  if (!r?.ConversationID) {
    await logEvent('B2C_RESULT', null, body ?? {});
    return { ok: true };
  }

  const tx = await prisma.transaction.findUnique({
    where: { b2cConversationId: r.ConversationID },
    include: TX_INCLUDE,
  });
  await logEvent('B2C_RESULT', r.ConversationID, body, tx?.id ?? null, r.ResultCode);
  if (!tx) return { ok: true };
  if (!['RELEASING', 'REFUNDING'].includes(tx.escrowStatus)) return { ok: true }; // idempotent

  const params = Object.fromEntries(
    (r.ResultParameters?.ResultParameter || []).map((p) => [p.Key, p.Value]),
  );
  const receipt = params.TransactionReceipt ? String(params.TransactionReceipt) : null;
  const success = r.ResultCode === 0;

  if (!success) {
    await prisma.transaction.updateMany({
      where: { id: tx.id, escrowStatus: { in: ['RELEASING', 'REFUNDING'] } },
      data: { escrowStatus: 'HELD', b2cResultCode: r.ResultCode, b2cResultDesc: r.ResultDesc },
    });
    const who = tx.escrowStatus === 'RELEASING' ? tx.clientId : tx.providerId;
    await notify(who, 'PAYMENT_FAILED', 'M-Pesa payout failed', `The transfer for "${tx.listing.title}" failed (${r.ResultDesc}). Funds are still safe in escrow — you can retry.`, tx.id);
    return { ok: true };
  }

  if (tx.escrowStatus === 'RELEASING') {
    const done = await prisma.transaction.updateMany({
      where: { id: tx.id, escrowStatus: 'RELEASING' },
      data: { escrowStatus: 'RELEASED', b2cResultCode: 0, b2cResultDesc: r.ResultDesc, b2cReceipt: receipt, releasedAt: new Date() },
    });
    if (done.count === 1) {
      await notify(tx.providerId, 'ESCROW_RELEASED', 'You have been paid', `${tx.currency} ${Number(tx.feeAmount)} for "${tx.listing.title}" has been sent to ${tx.providerPhone}.`, tx.id);
      await notify(tx.clientId, 'ESCROW_RELEASED', 'Order complete', `Funds for "${tx.listing.title}" have been released to ${tx.provider.fullName}.`, tx.id);
    }
  } else {
    const done = await prisma.transaction.updateMany({
      where: { id: tx.id, escrowStatus: 'REFUNDING' },
      data: { escrowStatus: 'REFUNDED', b2cResultCode: 0, b2cResultDesc: r.ResultDesc, b2cReceipt: receipt, refundedAt: new Date() },
    });
    if (done.count === 1) {
      await notify(tx.clientId, 'ESCROW_REFUNDED', 'Refund sent', `${tx.currency} ${Number(tx.amount)} for "${tx.listing.title}" has been refunded to ${tx.clientPhone}.`, tx.id);
    }
  }
  return { ok: true };
}

export async function handleB2cTimeout(body) {
  const ref = body?.Result?.ConversationID || null;
  const tx = ref
    ? await prisma.transaction.findUnique({ where: { b2cConversationId: ref } })
    : null;
  await logEvent('B2C_TIMEOUT', ref, body ?? {}, tx?.id ?? null);
  if (tx && ['RELEASING', 'REFUNDING'].includes(tx.escrowStatus)) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { escrowStatus: 'HELD', b2cResultDesc: 'B2C request timed out at Safaricom — retry.' },
    });
  }
  return { ok: true };
}

// ── Reads ─────────────────────────────────────────────────────────────────
async function loadParticipant(txId, userId) {
  const tx = await prisma.transaction.findUnique({ where: { id: txId }, include: TX_INCLUDE });
  if (!tx) throw notFound('Order not found');
  if (tx.clientId !== userId && tx.providerId !== userId) throw forbidden('Not your order');
  return tx;
}

export async function getTransaction(userId, txId) {
  const tx = await loadParticipant(txId, userId);
  return { transaction: serialize(tx, userId) };
}

export async function listTransactions(userId, { role, status, page, pageSize }) {
  const where = {};
  if (role === 'client') where.clientId = userId;
  else if (role === 'provider') where.providerId = userId;
  else where.OR = [{ clientId: userId }, { providerId: userId }];
  if (status) where.escrowStatus = status;

  const [total, rows] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: TX_INCLUDE,
    }),
  ]);
  return {
    data: rows.map((r) => serialize(r, userId)),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
