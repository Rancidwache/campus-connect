import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { timeAgo } from '../../lib/format.js';
import Skeleton from '../../components/Skeleton.jsx';

const TABS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'];
const STATUS_LABEL = { OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved', WONT_FIX: "Won't fix" };
const SEVERITY_BADGE = { LOW: 'badge-muted', MEDIUM: 'badge-warn', HIGH: 'badge-danger' };

export default function AdminBugs() {
  const [tab, setTab] = useState('OPEN');
  const [data, setData] = useState(null);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/admin/bug-reports?status=${tab}&pageSize=50`);
      setData(res.data);
      setCounts(res.counts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load bug reports');
    }
  }, [tab]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  return (
    <div className="stack">
      <h1 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Bug reports</h1>

      <div className="row" style={{ gap: 6 }}>
        {TABS.map((s) => (
          <button key={s} className={`btn btn-sm ${tab === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(s)}>
            {STATUS_LABEL[s]}
            {counts?.[s] ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <Skeleton h={160} />}
      {data && data.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>No {STATUS_LABEL[tab].toLowerCase()} bug reports.</p>
        </div>
      )}

      {data?.map((bug) => (
        <BugCard key={bug.id} bug={bug} onChanged={load} />
      ))}
    </div>
  );
}

function BugCard({ bug, onChanged }) {
  const toast = useToast();
  const [note, setNote] = useState(bug.adminNote || '');
  const [busy, setBusy] = useState(false);

  const patch = async (body, okMsg) => {
    setBusy(true);
    try {
      await api.patch(`/admin/bug-reports/${bug.id}`, body);
      toast.success(okMsg);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update the report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack-2">
      <div className="row-between" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div>
          <strong>{bug.title}</strong>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: 'var(--fs-xs)' }}>
            {bug.user ? (
              <>
                <Link to={`/u/${bug.user.id}`}>{bug.user.userName}</Link> · {bug.user.phoneNumber}
              </>
            ) : (
              <>Anonymous{bug.contact ? ` · ${bug.contact}` : ''}</>
            )}{' '}
            · {timeAgo(bug.createdAt)}
          </p>
        </div>
        <span className={`badge ${SEVERITY_BADGE[bug.severity]}`}>{bug.severity.toLowerCase()}</span>
      </div>

      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{bug.description}</p>

      {(bug.pageUrl || bug.userAgent) && (
        <p className="faint" style={{ margin: 0, fontSize: 'var(--fs-xs)', wordBreak: 'break-word' }}>
          {bug.pageUrl && <>Page: {bug.pageUrl}</>}
          {bug.pageUrl && bug.userAgent && ' · '}
          {bug.userAgent}
        </p>
      )}

      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={bug.status}
          disabled={busy}
          onChange={(e) => patch({ status: e.target.value }, `Marked ${STATUS_LABEL[e.target.value].toLowerCase()}`)}
          aria-label="Status"
        >
          {TABS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          className="input"
          style={{ flex: 1, minWidth: 140 }}
          placeholder="Internal note (optional)"
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Internal note"
        />
        <button
          className="btn btn-ghost btn-sm"
          disabled={busy || note.trim() === (bug.adminNote || '')}
          onClick={() => patch({ adminNote: note.trim() }, 'Note saved')}
        >
          Save note
        </button>
      </div>
    </div>
  );
}
