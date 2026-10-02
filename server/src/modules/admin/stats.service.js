import { prisma } from '../../lib/prisma.js';
import { toKes } from '../../lib/money.js';

const DAYS = 14;
const PAID_STATUSES = ['HELD', 'RELEASING', 'RELEASED', 'REFUNDING', 'REFUNDED'];

// Build a `[{ date: 'YYYY-MM-DD', ... }]` series with every day present, even
// ones the DB returned nothing for (a raw GROUP BY only returns days that
// happened).
function fillDays(rows, days, valueKeys) {
  const byDay = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), r]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = byDay.get(key);
    const entry = { date: key };
    for (const k of valueKeys) entry[k] = row ? Number(row[k]) || 0 : 0;
    out.push(entry);
  }
  return out;
}

export async function getStats() {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - DAYS);

  const [
    totalUsers,
    newUsers7d,
    activeListings,
    newListings7d,
    byStatusRaw,
    escrowHeldAgg,
    platformRevenueAgg,
    categoryRows,
    topProvidersRaw,
    volumeRows,
    signupRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo() } } }),
    prisma.listing.count({ where: { status: 'ACTIVE' } }),
    prisma.listing.count({ where: { createdAt: { gte: sevenDaysAgo() } } }),
    prisma.transaction.groupBy({ by: ['escrowStatus'], _count: { _all: true }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { escrowStatus: 'HELD' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { escrowStatus: 'RELEASED' }, _sum: { platformFee: true } }),
    prisma.listing.groupBy({ by: ['category'], where: { status: { not: 'REMOVED' } }, _count: { _all: true } }),
    prisma.transaction.groupBy({
      by: ['providerId'],
      where: { escrowStatus: 'RELEASED' },
      _sum: { feeAmount: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw`
      SELECT date_trunc('day', paid_at) AS day,
             COUNT(*)::int AS count,
             COALESCE(SUM(amount), 0)::float8 AS amount
      FROM transactions
      WHERE paid_at >= ${since}
      GROUP BY 1 ORDER BY 1
    `,
    prisma.$queryRaw`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= ${since}
      GROUP BY 1 ORDER BY 1
    `,
  ]);

  const totalTransactions = byStatusRaw.reduce((n, r) => n + r._count._all, 0);
  const completedOrders = byStatusRaw.find((r) => r.escrowStatus === 'RELEASED')?._count._all ?? 0;
  const gmv = byStatusRaw
    .filter((r) => PAID_STATUSES.includes(r.escrowStatus))
    .reduce((sum, r) => sum + toKes(r._sum.amount), 0);

  const topProviderIds = topProvidersRaw.map((r) => r.providerId);
  const providers = topProviderIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topProviderIds } },
        select: { id: true, userName: true, avatarUrl: true },
      })
    : [];
  const providerById = new Map(providers.map((p) => [p.id, p]));

  return {
    overview: {
      totalUsers,
      newUsers7d,
      activeListings,
      newListings7d,
      totalTransactions,
      completedOrders,
      gmv,
      escrowHeld: toKes(escrowHeldAgg._sum.amount),
      platformRevenue: toKes(platformRevenueAgg._sum.platformFee),
    },
    transactionsByStatus: byStatusRaw
      .map((r) => ({ status: r.escrowStatus, count: r._count._all, amount: toKes(r._sum.amount) }))
      .sort((a, b) => b.count - a.count),
    topCategories: categoryRows
      .map((r) => ({ category: r.category, count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topProviders: topProvidersRaw
      .map((r) => ({
        provider: providerById.get(r.providerId) ?? { id: r.providerId, userName: 'Unknown', avatarUrl: null },
        completedOrders: r._count._all,
        earnings: toKes(r._sum.feeAmount),
      }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5),
    volumeByDay: fillDays(volumeRows, DAYS, ['count', 'amount']),
    signupsByDay: fillDays(signupRows, DAYS, ['count']),
  };
}

function sevenDaysAgo() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d;
}
