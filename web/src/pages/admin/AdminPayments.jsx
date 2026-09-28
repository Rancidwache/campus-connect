import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, tokenStore } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { KES } from '../../lib/format.js';
import Skeleton from '../../components/Skeleton.jsx';

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
const STATUSES = ['', 'PENDING_PAYMENT', 'HELD', 'RELEASED', 'REFUNDED', 'PAYMENT_FAILED', 'CANCELLED'];

export default function AdminPayments() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (search, st) => {
    setError(null);
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (search) params.set('q', search);
      if (st) params.set('status', st);
      const res = await api.get(`/admin/transactions?${params.toString()}`);
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load transactions');
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q, status), 250);
    return () => clearTimeout(t);
  }, [q, status, load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      const res = await fetch(`/api/admin/transactions/export.csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tokenStore.get()}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not export the CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="stack">
      <h1 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Payments</h1>

      <div className="admin-toolbar">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search by receipt or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="select" style={{ maxWidth: 200 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" disabled={exporting} onClick={exportCsv}>
          {exporting ? 'Exporting…' : '⬇ Export CSV'}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!rows && !error && <Skeleton h={220} />}
      {rows && rows.length === 0 && <div className="card"><p style={{ margin: 0 }}>No transactions match.</p></div>}

      {rows && rows.length > 0 && (
        <div className="admin-tablewrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tx</th>
                <th>Provider</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Receipt</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="muted">#{t.id}</td>
                  <td><Link to={`/u/${t.provider.id}`}>{t.provider.fullName}</Link></td>
                  <td className="muted">{t.client.fullName}</td>
                  <td>{KES.format(t.amount)}</td>
                  <td><span className={`badge badge-${STATUS_TONE[t.escrowStatus] || 'muted'}`}>{t.escrowStatus}</span></td>
                  <td className="muted">{t.mpesaReceipt || t.b2cReceipt || '—'}</td>
                  <td className="muted">{new Date(t.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
