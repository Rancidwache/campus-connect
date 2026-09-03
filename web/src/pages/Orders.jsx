import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import EscrowBadge from '../components/EscrowBadge.jsx';
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
    <div className="stack">
      <h1 style={{ margin: 0 }}>Orders</h1>

      <div className="row">
        {ROLES.map((r) => (
          <button
            key={r.value}
            className={`btn btn-sm ${role === r.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setParams(r.value === 'all' ? {} : { role: r.value })}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error-text">{error}</p>}

      {result && !loading && result.data.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>
            No orders yet. <Link to="/browse">Browse listings</Link> to hire something, or{' '}
            <Link to="/listings/new">post a listing</Link> to start earning.
          </p>
        </div>
      )}

      {result && result.data.length > 0 && (
        <div className="stack">
          {result.data.map((t) => (
            <Link
              key={t.id}
              to={`/orders/${t.id}`}
              className="card"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div className="row-between" style={{ marginBottom: 6 }}>
                <strong style={{ color: 'var(--cc-ink)' }}>{t.listing.title}</strong>
                <EscrowBadge status={t.escrowStatus} />
              </div>
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                {t.role === 'client'
                  ? `You hired ${t.provider.fullName}`
                  : `${t.client.fullName} hired you`}{' '}
                • {KES.format(t.amount)} • {timeAgo(t.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
