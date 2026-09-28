import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { KES } from '../../lib/format.js';
import { FadeIn, Stagger, StaggerItem } from '../../components/motion.jsx';
import Avatar from '../../components/Avatar.jsx';
import Skeleton from '../../components/Skeleton.jsx';

const twoCol = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/admin/stats')
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load stats'));
  }, []);

  return (
    <div className="stack" style={{ gap: 'var(--sp-6)' }}>
      <div className="row-between">
        <h1 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Overview</h1>
        <span className="badge badge-brand">Live · mock M-Pesa</span>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <StatsSkeleton />}

      {data && (
        <>
          <KpiGrid overview={data.overview} volumeByDay={data.volumeByDay} signupsByDay={data.signupsByDay} />

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
              <DonutChart rows={data.topCategories} />
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

function KpiGrid({ overview, volumeByDay, signupsByDay }) {
  const tiles = [
    { label: 'Total users', value: overview.totalUsers, hint: `+${overview.newUsers7d} in 7d`, spark: signupsByDay.map((r) => r.count), sparkColor: 'var(--info)' },
    { label: 'Active listings', value: overview.activeListings, hint: `+${overview.newListings7d} in 7d` },
    { label: 'Completed orders', value: overview.completedOrders, hint: `${overview.totalTransactions} total` },
    { label: 'Gross volume', value: KES.format(overview.gmv), hint: 'money moved through escrow', spark: volumeByDay.map((r) => r.amount), sparkColor: 'var(--brand)' },
    { label: 'Currently in escrow', value: KES.format(overview.escrowHeld), hint: 'held, not yet released' },
    { label: 'Platform revenue', value: KES.format(overview.platformRevenue), hint: 'commission on released orders' },
  ];
  return (
    <Stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--sp-4)' }}>
      {tiles.map((t) => (
        <StaggerItem key={t.label} className="card">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.label}
            </p>
            {t.spark && <Sparkline values={t.spark} color={t.sparkColor} />}
          </div>
          <p style={{ margin: '6px 0 2px', fontSize: '1.4rem', fontWeight: 800 }}>{t.value}</p>
          <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-xs)' }}>{t.hint}</p>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

// Tiny trend line — last-14-days shape, not exact values (no axes/labels; the
// KPI number + hint already say the number that matters).
function Sparkline({ values, color = 'var(--brand)' }) {
  const w = 60;
  const h = 24;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  const lastY = h - ((values[values.length - 1] - min) / range) * h;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0, overflow: 'visible' }} aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx={w} cy={lastY} r="2.25" fill={color} />
    </svg>
  );
}

function VolumeChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
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
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
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

const DONUT_COLORS = ['var(--brand)', 'var(--info)', 'var(--ok)', 'var(--warn)', 'var(--danger)', 'var(--brand-strong)'];

function DonutChart({ rows }) {
  if (!rows.length) return <p className="muted">No listings yet.</p>;
  const total = rows.reduce((s, r) => s + r.count, 0);
  const size = 128;
  const r = 50;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = rows.map((row, i) => {
    const len = (row.count / total) * circumference;
    const slice = { ...row, color: DONUT_COLORS[i % DONUT_COLORS.length], len, dashoffset: -offset };
    offset += len;
    return slice;
  });

  return (
    <div className="row" style={{ gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="15" />
          {slices.map((s) => (
            <circle
              key={s.category}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="15"
              strokeDasharray={`${s.len} ${circumference - s.len}`}
              strokeDashoffset={s.dashoffset}
            />
          ))}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <strong style={{ fontSize: '1.3rem', lineHeight: 1 }}>{total}</strong>
          <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>listings</span>
        </div>
      </div>
      <div className="stack-2" style={{ flex: 1, minWidth: 140 }}>
        {slices.map((s) => (
          <div key={s.category} className="row-between" style={{ fontSize: 'var(--fs-sm)' }}>
            <span className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              {s.category}
            </span>
            <span className="muted">{s.count}</span>
          </div>
        ))}
      </div>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--sp-4)' }}>
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
