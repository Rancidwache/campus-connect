import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { toKes } from '../../lib/money.js';
import { adminForceRelease, adminForceRefund } from '../payments/escrow.service.js';

const INCLUDE = {
  client: { select: { id: true, fullName: true } },
  provider: { select: { id: true, fullName: true } },
  listing: { select: { id: true, title: true } },
};

const DETAIL_INCLUDE = {
  ...INCLUDE,
  deliveryProof: { include: { photos: { orderBy: { position: 'asc' } } } },
};

function serialize(tx) {
  return {
    id: tx.id,
    listing: tx.listing,
    client: tx.client,
    provider: tx.provider,
    amount: toKes(tx.amount),
    feeAmount: toKes(tx.feeAmount),
    platformFee: toKes(tx.platformFee),
    escrowStatus: tx.escrowStatus,
    disputed: tx.disputed,
    mpesaReceipt: tx.mpesaReceipt,
    b2cReceipt: tx.b2cReceipt,
    createdAt: tx.createdAt,
  };
}

function serializeDetail(tx) {
  return {
    ...serialize(tx),
    deliveryProof: tx.deliveryProof
      ? {
          note: tx.deliveryProof.note,
          createdAt: tx.deliveryProof.createdAt,
          photos: tx.deliveryProof.photos.map((p) => ({ id: p.id, url: p.url })),
        }
      : null,
  };
}

export async function getTransactionDetail(id) {
  const tx = await prisma.transaction.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  if (!tx) throw notFound('Order not found');
  return serializeDetail(tx);
}

export async function resolveDispute(moderatorId, id, action, reviewNote) {
  if (action === 'release') await adminForceRelease(moderatorId, id, reviewNote);
  else await adminForceRefund(moderatorId, id, reviewNote);
  return getTransactionDetail(id);
}

function buildWhere({ q, status }) {
  const where = {};
  if (status) where.escrowStatus = status;
  if (q) {
    where.OR = [
      { mpesaReceipt: { contains: q, mode: 'insensitive' } },
      { b2cReceipt: { contains: q, mode: 'insensitive' } },
      { client: { fullName: { contains: q, mode: 'insensitive' } } },
      { provider: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }
  return where;
}

export async function listTransactions({ q, status, page, pageSize }) {
  const where = buildWhere({ q, status });
  const [total, rows] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: INCLUDE,
    }),
  ]);
  return {
    data: rows.map(serialize),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

const CSV_HEADER = [
  'Transaction ID',
  'Date',
  'Listing',
  'Client',
  'Provider',
  'Amount (KES)',
  'Platform fee (KES)',
  'Status',
  'M-Pesa receipt',
  'Payout receipt',
];

function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportTransactionsCsv({ q, status }) {
  const where = buildWhere({ q, status });
  const rows = await prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, include: INCLUDE });
  const lines = [CSV_HEADER.join(',')];
  for (const tx of rows.map(serialize)) {
    lines.push(
      [
        tx.id,
        new Date(tx.createdAt).toISOString(),
        tx.listing?.title ?? '',
        tx.client?.fullName ?? '',
        tx.provider?.fullName ?? '',
        tx.amount,
        tx.platformFee,
        tx.escrowStatus,
        tx.mpesaReceipt ?? '',
        tx.b2cReceipt ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\n');
}
