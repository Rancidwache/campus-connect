import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo } from '../lib/format.js';

const TABS = ['OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED'];
const REASON_LABEL = {
  SCAM_OR_FRAUD: 'Scam / fraud',
  MISLEADING: 'Misleading',
  PROHIBITED_ITEM: 'Prohibited item',
  OFF_PLATFORM_PAYMENT: 'Off-platform payment',
  HARASSMENT_OR_HATE: 'Harassment / hate',
  SPAM: 'Spam',
  OTHER: 'Other',
};

export default function AdminReports() {
  const { user, loading } = useAuth();
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
    if (user?.isAdmin) load();
  }, [user, load]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Moderation queue</h1>

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

  const removable = ['LISTING', 'REVIEW', 'REVIEW_REPLY'].includes(report.targetType) && report.target.exists;

  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <span className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="badge badge-warn">{report.targetType.replace('_', ' ')}</span>
          <strong>{REASON_LABEL[report.reason] || report.reason}</strong>
          <span className={`badge ${report.status === 'OPEN' ? 'badge-info' : 'badge-muted'}`}>{report.status}</span>
        </span>
        <span className="muted" style={{ fontSize: '0.8rem' }}>{timeAgo(report.createdAt)}</span>
      </div>

      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        Reported by{' '}
        <Link to={`/u/${report.reporter.id}`}>{report.reporter.fullName}</Link>
        {report.reviewedBy && <> · handled by {report.reviewedBy.fullName}</>}
      </p>

      {report.detail && <p style={{ margin: 0 }}>“{report.detail}”</p>}

      <div className="card" style={{ background: 'var(--cc-bg)', boxShadow: 'none', padding: 'var(--cc-s3) var(--cc-s4)' }}>
        <span className="muted" style={{ fontSize: '0.8rem' }}>Target: </span>
        {report.target.link ? (
          <Link to={report.target.link} target="_blank">{report.target.label}</Link>
        ) : (
          <span className="muted">{report.target.label}</span>
        )}
      </div>

      {report.reviewNote && (
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Note: {report.reviewNote}</p>
      )}

      {err && <p className="error-text">{err}</p>}

      {report.status !== 'ACTIONED' && report.status !== 'DISMISSED' && (
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
            {removable && (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={removeContent}>
                Remove content
              </button>
            )}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus('ACTIONED')}>
              Mark actioned
            </button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus('DISMISSED')}>
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  );
}
