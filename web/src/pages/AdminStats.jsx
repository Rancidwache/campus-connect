import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { KES } from '../lib/format.js';
import { FadeIn, Stagger, StaggerItem } from '../components/motion.jsx';
import Avatar from '../components/Avatar.jsx';
import Skeleton from '../components/Skeleton.jsx';

const twoCol = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 'var(--sp-6)',
  alignItems: 'start',
};

const STATUS_TONE = {
  RELEASED: 'ok',
  REFUNDED: 'info',
  HELD: 'brand',
  PENDING_PAYMENT: 'warn',
  RELEASING: 'brand',
  REFUNDING: 'warn',
  PAYMENT_FAILED: 'danger',
  CANCELLED: 'danger',
};

const STATUS_LABEL = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAYMENT_FAILED: 'Payment failed',
  HELD: 'Funds secured',
  RELEASING: 'Releasing',
  RELEASED: 'Released',
  REFUNDING: 'Refunding',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

export default function AdminStats() {
  const { user, loading } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.isAdmin) return;
    api
      .get('/admin/stats')
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load stats'));
  }, [user]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="stack" style={{ gap: 'var(--sp-6)' }}>
      <div>
        <h1 style={{ margin: 0 }}>Platform stats</h1>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Live from the database — users, listings, escrow volume and payouts.
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <StatsSkeleton />}

      {data && (
        <>
          <KpiGrid overview={data.overview} />

          <div style={twoCol}>
            <FadeIn className="card">
              <h2 style={{ marginTop: 0, fontSize: 'var(--fs-md)' }}>Order volume — last 14 days</h2>
              <VolumeChart rows={data.volumeByDay} />
            </FadeIn>
            <FadeIn delay={0.05} className="card">
              <h2 style={{ marginTop: 0, fontSize: 'var(--fs-md)' }}>New sign-ups — last 14 days</h2>
              <SignupChart rows={data.signupsByDay} />
            </FadeIn>
          </div>

          <div style={twoCol}>
            <FadeIn className="card">
              <h2 style={{ marginTop: 0, fontSize: 'var(--fs-md)' }}>Transactions by status</h2>
              <StatusBreakdown rows={data.transactionsByStatus} />
            </FadeIn>
            <FadeIn delay={0.05} className="card">
              <h2 style={{ marginTop: 0, fontSize: 'var(--fs-md)' }}>Listings by category</h2>
              <CategoryBreakdown rows={data.topCategories} />
            </FadeIn>
          </div>

          <FadeIn className="card">
            <h2 style={{ marginTop: 0, fontSize: 'var(--fs-md)' }}>Top earning providers</h2>
            <TopProviders rows={data.topProviders} />
          </FadeIn>
        </>
      )}
    </div>
  );
}

function KpiGrid({ overview }) {
  const tiles = [
    { label: 'Total users', value: overview.totalUsers, hint: `+${overview.newUsers7d} in 7d` },
    { label: 'Active listings', value: overview.activeListings, hint: `+${overview.newListings7d} in 7d` },
    { label: 'Completed orders', value: overview.completedOrders, hint: `${overview.totalTransactions} total` },
    { label: 'Gross volume', value: KES.format(overview.gmv), hint: 'money moved through escrow' },
    { label: 'Currently in escrow', value: KES.format(overview.escrowHeld), hint: 'held, not yet released' },
    { label: 'Platform revenue', value: KES.format(overview.platformRevenue), hint: 'commission on released orders' },
  ];
  return (
    <Stagger
      className="stat-grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-4)' }}
    >
      {tiles.map((t) => (
        <StaggerItem key={t.label} className="card">
          <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.label}
          </p>
          <p style={{ margin: '6px 0 2px', fontSize: '1.5rem', fontWeight: 800 }}>{t.value}</p>
          <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-xs)' }}>{t.hint}</p>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function VolumeChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
        {rows.map((r) => (
          <div
            key={r.date}
            title={`${dayLabel(r.date)}: ${KES.format(r.amount)} across ${r.count} order${r.count === 1 ? '' : 's'}`}
            style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}
          >
            <div
              style={{
                width: '100%',
                minHeight: r.amount > 0 ? 3 : 1,
                height: `${(r.amount / max) * 100}%`,
                background: r.amount > 0 ? 'var(--brand)' : 'var(--border)',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s ease',
              }}
            />
          </div>
        ))}
      </div>
      <div className="row-between" style={{ marginTop: 6 }}>
        <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{dayLabel(rows[0]?.date)}</span>
        <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{dayLabel(rows[rows.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function SignupChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
        {rows.map((r) => (
          <div
            key={r.date}
            title={`${dayLabel(r.date)}: ${r.count} sign-up${r.count === 1 ? '' : 's'}`}
            style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}
          >
            <div
              style={{
                width: '100%',
                minHeight: r.count > 0 ? 3 : 1,
                height: `${(r.count / max) * 100}%`,
                background: r.count > 0 ? 'var(--info)' : 'var(--border)',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s ease',
              }}
            />
          </div>
        ))}
      </div>
      <div className="row-between" style={{ marginTop: 6 }}>
        <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{dayLabel(rows[0]?.date)}</span>
        <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{dayLabel(rows[rows.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function StatusBreakdown({ rows }) {
  if (!rows.length) return <p className="muted">No transactions yet.</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <div className="stack" style={{ gap: 10 }}>
      {rows.map((r) => (
        <div key={r.status} className="row" style={{ gap: 10, alignItems: 'center' }}>
          <span className={`badge badge-${STATUS_TONE[r.status] || 'muted'}`} style={{ width: 132, flexShrink: 0 }}>
            {STATUS_LABEL[r.status] || r.status}
          </span>
          <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4 }}>
            <div
              style={{
                width: `${(r.count / max) * 100}%`,
                height: '100%',
                background: `var(--${STATUS_TONE[r.status] || 'text-dim'})`,
                borderRadius: 4,
              }}
            />
          </div>
          <span className="muted" style={{ fontSize: 'var(--fs-sm)', width: 96, textAlign: 'right' }}>
            {r.count} · {KES.format(r.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoryBreakdown({ rows }) {
  if (!rows.length) return <p className="muted">No listings yet.</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <div className="stack" style={{ gap: 10 }}>
      {rows.map((r) => (
        <div key={r.category} className="row" style={{ gap: 10, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 'var(--fs-sm)', width: 120, flexShrink: 0 }}>
            {r.category}
          </span>
          <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4 }}>
            <div style={{ width: `${(r.count / max) * 100}%`, height: '100%', background: 'var(--brand)', borderRadius: 4 }} />
          </div>
          <span className="muted" style={{ fontSize: 'var(--fs-sm)', width: 24, textAlign: 'right' }}>{r.count}</span>
        </div>
      ))}
    </div>
  );
}

function TopProviders({ rows }) {
  if (!rows.length) return <p className="muted">No completed orders yet.</p>;
  return (
    <div className="stack" style={{ gap: 4 }}>
      {rows.map(({ provider, completedOrders, earnings }, i) => (
        <Link
          key={provider.id}
          to={`/u/${provider.id}`}
          className="row-between"
          style={{ padding: '10px 4px', borderTop: i ? '1px solid var(--border)' : 'none', color: 'inherit', textDecoration: 'none' }}
        >
          <span className="row" style={{ gap: 10, alignItems: 'center' }}>
            <span className="muted" style={{ width: 18, fontSize: 'var(--fs-sm)' }}>{i + 1}</span>
            <Avatar src={provider.avatarUrl} name={provider.fullName} size={32} />
            <span style={{ fontWeight: 600 }}>{provider.fullName}</span>
          </span>
          <span className="row" style={{ gap: 16, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{completedOrders} order{completedOrders === 1 ? '' : 's'}</span>
            <strong>{KES.format(earnings)}</strong>
          </span>
        </Link>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="stack" style={{ gap: 'var(--sp-6)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-4)' }}>
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={86} />)}
      </div>
      <Skeleton h={180} />
    </div>
  );
}

function dayLabel(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}
