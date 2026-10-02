import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import EscrowBadge from '../components/EscrowBadge.jsx';
import Avatar from '../components/Avatar.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { Stagger, StaggerItem } from '../components/motion.jsx';
import { KES, timeAgo } from '../lib/format.js';

const ROLES = [
  { value: 'all', label: 'All' },
  { value: 'client', label: 'Things I hired' },
  { value: 'provider', label: 'Things I offer' },
];

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || 'all';
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.get(`/transactions?role=${role}&pageSize=50`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="stack-6">
      <h1 style={{ margin: 0 }}>Orders</h1>

      <div className="chip-row">
        {ROLES.map((r) => (
          <button
            key={r.value}
            className={`chip ${role === r.value ? 'is-active' : ''}`}
            aria-pressed={role === r.value}
            onClick={() => setParams(r.value === 'all' ? {} : { role: r.value })}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading && (
        <div className="stack">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={72} r="var(--r-lg)" />
          ))}
        </div>
      )}

      {result && !loading && result.data.length === 0 && (
        <div className="empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
          <p style={{ margin: 0 }}>No orders yet.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <Link to="/browse" className="btn btn-primary btn-sm">Browse listings</Link>
            <Link to="/listings/new" className="btn btn-ghost btn-sm">Post a listing</Link>
          </div>
        </div>
      )}

      {result && result.data.length > 0 && (
        <Stagger className="stack" gap={0.04} key={role}>
          {result.data.map((t) => (
            <StaggerItem key={t.id}>
              <Link to={`/orders/${t.id}`} className="card card-hover row-between" style={{ textDecoration: 'none', gap: 12 }}>
                <div className="row" style={{ gap: 10, flexWrap: 'nowrap', minWidth: 0 }}>
                  <Avatar
                    src={(t.role === 'client' ? t.provider : t.client)?.avatarUrl}
                    name={(t.role === 'client' ? t.provider : t.client)?.userName}
                    size={38}
                  />
                  <span className="stack" style={{ gap: 2, minWidth: 0 }}>
                    <strong style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.listing.title}
                    </strong>
                    <span className="faint" style={{ fontSize: 'var(--fs-xs)' }}>
                      {t.role === 'client' ? `You hired ${t.provider.userName}` : `${t.client.userName} hired you`}
                      {' · '}
                      {KES.format(t.amount)} · {timeAgo(t.createdAt)}
                    </span>
                  </span>
                </div>
                <span className="row" style={{ gap: 6 }}>
                  {t.disputed && <span className="badge badge-warn">Disputed</span>}
                  <EscrowBadge status={t.escrowStatus} />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
