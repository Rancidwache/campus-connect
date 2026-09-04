import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const REASONS = [
  ['SCAM_OR_FRAUD', 'Scam or fraud'],
  ['MISLEADING', 'Misleading or inaccurate'],
  ['PROHIBITED_ITEM', 'Prohibited item or service'],
  ['OFF_PLATFORM_PAYMENT', 'Asking to pay off-platform'],
  ['HARASSMENT_OR_HATE', 'Harassment or hate'],
  ['SPAM', 'Spam'],
  ['OTHER', 'Something else'],
];

// targetType: LISTING | REVIEW | REVIEW_REPLY | USER
export default function ReportButton({ targetType, targetId, label = 'Report', size = '0.8rem' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setState('busy');
    setMsg(null);
    try {
      await api.post('/reports', { targetType, targetId, reason, detail: detail.trim() || undefined });
      setState('done');
    } catch (err) {
      setState('error');
      setMsg(err instanceof ApiError ? err.message : 'Could not send the report');
    }
  };

  const start = () => {
    if (!user) return navigate('/login');
    setOpen(true);
  };

  return (
    <>
      <button className="linkbtn" style={{ fontSize: size, color: 'var(--cc-muted)' }} onClick={start}>
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setOpen(false)}
        >
          <div className="card stack" style={{ maxWidth: 440, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            {state === 'done' ? (
              <>
                <h3 style={{ margin: 0 }}>Thanks for the report</h3>
                <p style={{ margin: 0 }}>
                  A moderator will review this. You can track it under your account.
                </p>
                <button className="btn btn-primary" onClick={() => setOpen(false)}>Close</button>
              </>
            ) : (
              <form className="stack" onSubmit={submit}>
                <h3 style={{ margin: 0 }}>Report this {targetType.replace('_', ' ').toLowerCase()}</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Reports are private. See the{' '}
                  <Link to="/guidelines" target="_blank">Community Guidelines</Link>.
                </p>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="rpt-reason">Reason</label>
                  <select id="rpt-reason" className="select" value={reason} onChange={(e) => setReason(e.target.value)} required>
                    <option value="">Choose a reason…</option>
                    {REASONS.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="rpt-detail">Details (optional)</label>
                  <textarea
                    id="rpt-detail"
                    className="textarea"
                    style={{ minHeight: 70 }}
                    maxLength={2000}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="What happened?"
                  />
                </div>
                {msg && <p className="error-text">{msg}</p>}
                <div className="row">
                  <button className="btn btn-primary" disabled={state === 'busy' || !reason}>
                    {state === 'busy' ? 'Sending…' : 'Send report'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
