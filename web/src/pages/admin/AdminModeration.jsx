import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { timeAgo, KES } from '../../lib/format.js';

const TABS = ['OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED'];
const REASON_LABEL = {
  SCAM_OR_FRAUD: 'Scam / fraud',
  MISLEADING: 'Misleading',
  PROHIBITED_ITEM: 'Prohibited item',
  OFF_PLATFORM_PAYMENT: 'Off-platform payment',
  HARASSMENT_OR_HATE: 'Harassment / hate',
  SPAM: 'Spam',
  OTHER: 'Other',
  NOT_DELIVERED: "Wasn't delivered",
  ITEM_NOT_AS_DESCRIBED: 'Not as described',
};

export default function AdminModeration() {
  const [tab, setTab] = useState('OPEN');
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [q, s] = await Promise.all([
        api.get(`/admin/reports?status=${tab}&pageSize=50`),
        api.get('/admin/reports/stats'),
      ]);
      setData(q.data);
      setStats(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the queue');
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="stack">
      <h1 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Moderation</h1>

      <div className="row" style={{ gap: 6 }}>
        {TABS.map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${tab === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(s)}
          >
            {s[0] + s.slice(1).toLowerCase()}
            {stats?.[s] ? ` (${stats[s]})` : ''}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && data.length === 0 && (
        <div className="card"><p style={{ margin: 0 }}>Nothing here.</p></div>
      )}

      <div className="stack">
        {data?.map((r) => (
          <ReportCard key={r.id} report={r} onDone={load} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ report, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const isTransaction = report.targetType === 'TRANSACTION';
  const open = report.status !== 'ACTIONED' && report.status !== 'DISMISSED';

  const act = async (fn) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Action failed');
      setBusy(false);
    }
  };

  const setStatus = (status) => act(() => api.patch(`/admin/reports/${report.id}`, { status, reviewNote: note.trim() || undefined }));
  const removeContent = () => act(() => api.post(`/admin/reports/${report.id}/remove`, { reviewNote: note.trim() || undefined }));
  const resolve = (action) => act(() => api.post(`/admin/transactions/${report.targetId}/resolve`, { action, reviewNote: note.trim() || undefined }));

  const removable = ['LISTING', 'REVIEW', 'REVIEW_REPLY'].includes(report.targetType) && report.target.exists;

  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <span className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className={`badge ${isTransaction ? 'badge-danger' : 'badge-warn'}`}>
            {isTransaction ? 'Delivery dispute' : report.targetType.replace('_', ' ')}
          </span>
          <strong>{REASON_LABEL[report.reason] || report.reason}</strong>
          <span className={`badge ${report.status === 'OPEN' ? 'badge-info' : 'badge-muted'}`}>{report.status}</span>
        </span>
        <span className="muted" style={{ fontSize: '0.8rem' }}>{timeAgo(report.createdAt)}</span>
      </div>

      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        {isTransaction ? 'Disputed by' : 'Reported by'}{' '}
        <Link to={`/u/${report.reporter.id}`}>{report.reporter.userName}</Link>
        {report.reviewedBy && <> · handled by {report.reviewedBy.userName}</>}
      </p>

      {report.detail && <p style={{ margin: 0 }}>“{report.detail}”</p>}

      {isTransaction ? (
        <TransactionPanel targetId={report.targetId} fallbackLabel={report.target.label} />
      ) : (
        <div className="card-inset">
          <span className="muted" style={{ fontSize: '0.8rem' }}>Target: </span>
          {report.target.link ? (
            <Link to={report.target.link} target="_blank">{report.target.label}</Link>
          ) : (
            <span className="muted">{report.target.label}</span>
          )}
        </div>
      )}

      {report.reviewNote && (
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Note: {report.reviewNote}</p>
      )}

      {err && <p className="error-text">{err}</p>}

      {open && (
        <>
          <input
            className="input"
            placeholder="Optional note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="row" style={{ gap: 6 }}>
            {report.status === 'OPEN' && (
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus('REVIEWING')}>
                Mark reviewing
              </button>
            )}
            {isTransaction ? (
              <>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => resolve('release')}>
                  Release to provider
                </button>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => resolve('refund')}>
                  Refund client
                </button>
              </>
            ) : (
              <>
                {removable && (
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={removeContent}>
                    Remove content
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus('ACTIONED')}>
                  Mark actioned
                </button>
              </>
            )}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus('DISMISSED')}>
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Fetches the full order — amount, parties, escrow status, and the
// provider's delivery-proof photos — so a moderator can actually judge the
// dispute instead of just reading a one-line label.
function TransactionPanel({ targetId, fallbackLabel }) {
  const [tx, setTx] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/admin/transactions/${targetId}`)
      .then((r) => setTx(r.transaction))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this order'));
  }, [targetId]);

  if (error) return <div className="card-inset"><span className="muted">{fallbackLabel}</span></div>;
  if (!tx) return <div className="card-inset"><span className="muted">Loading order…</span></div>;

  return (
    <div className="card-inset stack-2">
      <div className="row-between" style={{ fontSize: 'var(--fs-sm)' }}>
        <span>
          <strong>{tx.listing.title}</strong> — {KES.format(tx.amount)}
        </span>
        <span className="badge badge-muted">{tx.escrowStatus}</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-xs)' }}>
        Client: <Link to={`/u/${tx.client.id}`}>{tx.client.userName}</Link> · Provider:{' '}
        <Link to={`/u/${tx.provider.id}`}>{tx.provider.userName}</Link>
      </p>

      {tx.deliveryProof ? (
        <div className="stack-2">
          <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
            Provider's delivery proof, {timeAgo(tx.deliveryProof.createdAt)}:
          </span>
          <div className="row" style={{ gap: 8 }}>
            {tx.deliveryProof.photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                <img
                  src={p.url}
                  alt="Delivery proof"
                  style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}
                />
              </a>
            ))}
          </div>
          {tx.deliveryProof.note && <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>{tx.deliveryProof.note}</p>}
        </div>
      ) : (
        <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
          The provider hasn't submitted any delivery photos.
        </p>
      )}
    </div>
  );
}
