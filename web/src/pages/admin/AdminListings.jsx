import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { KES } from '../../lib/format.js';
import Skeleton from '../../components/Skeleton.jsx';

const STATUS_TONE = { ACTIVE: 'ok', PAUSED: 'warn', HIRED: 'info', REMOVED: 'danger' };
const STATUSES = ['', 'ACTIVE', 'PAUSED', 'HIRED', 'REMOVED'];

export default function AdminListings() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (search, st) => {
    setError(null);
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (search) params.set('q', search);
      if (st) params.set('status', st);
      const res = await api.get(`/admin/listings?${params.toString()}`);
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load listings');
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q, status), 250);
    return () => clearTimeout(t);
  }, [q, status, load]);

  const act = async (listing, fn, successMsg) => {
    setBusyId(listing.id);
    try {
      await fn();
      toast.success(successMsg);
      load(q, status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack">
      <h1 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Listings</h1>

      <div className="admin-toolbar">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search listings…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="select" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? s[0] + s.slice(1).toLowerCase() : 'All statuses'}</option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!rows && !error && <Skeleton h={220} />}
      {rows && rows.length === 0 && <div className="card"><p style={{ margin: 0 }}>No listings match.</p></div>}

      {rows && rows.length > 0 && (
        <div className="admin-tablewrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Owner</th>
                <th>Category</th>
                <th>Status</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td style={{ maxWidth: 240 }}>
                    {l.status === 'REMOVED' ? (
                      <span className="muted">{l.title}</span>
                    ) : (
                      <Link to={`/listings/${l.id}`} target="_blank" style={{ color: 'var(--text)', fontWeight: 600 }}>{l.title}</Link>
                    )}
                  </td>
                  <td className="muted"><Link to={`/u/${l.owner.id}`}>{l.owner.fullName}</Link></td>
                  <td className="muted">{l.category}</td>
                  <td><span className={`badge badge-${STATUS_TONE[l.status]}`}>{l.status}</span></td>
                  <td>{KES.format(l.price)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      {l.status === 'ACTIVE' && (
                        <button className="btn btn-ghost btn-sm" disabled={busyId === l.id} onClick={() => act(l, () => api.post(`/admin/listings/${l.id}/pause`), 'Listing paused')}>
                          Pause
                        </button>
                      )}
                      {l.status === 'PAUSED' && (
                        <button className="btn btn-ghost btn-sm" disabled={busyId === l.id} onClick={() => act(l, () => api.post(`/admin/listings/${l.id}/reactivate`), 'Listing reactivated')}>
                          Reactivate
                        </button>
                      )}
                      {l.status !== 'REMOVED' && (
                        <button className="btn btn-ghost btn-sm" disabled={busyId === l.id} onClick={() => act(l, () => api.post(`/admin/listings/${l.id}/remove`), 'Listing removed')}>
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
