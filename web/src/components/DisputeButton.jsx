import { useState } from 'react';
import { api, ApiError } from '../api/client.js';
import Modal from './Modal.jsx';

const REASONS = [
  ['NOT_DELIVERED', "It wasn't delivered"],
  ['ITEM_NOT_AS_DESCRIBED', "It doesn't match what was listed"],
  ['OFF_PLATFORM_PAYMENT', 'Asked to pay off-platform'],
  ['OTHER', 'Something else'],
];

// Client-side: dispute a delivery instead of unilaterally approving or
// walking away. Opens a moderation case — funds stay in escrow until an
// admin resolves it (release or refund).
export default function DisputeButton({ txId, onDone }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setReason('');
      setDetail('');
      setError(null);
    }, 250);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const { transaction } = await api.post(`/transactions/${txId}/dispute`, { reason, detail: detail.trim() || undefined });
      onDone(transaction);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the dispute');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        Dispute this delivery
      </button>

      <Modal open={open} onClose={close} title="Dispute this delivery" maxWidth={440}>
        <form className="stack" onSubmit={submit}>
          <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
            Funds stay held in escrow. A moderator will review this and either release
            payment to the provider or refund you.
          </p>

          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="dispute-reason" className="field-label">Reason</label>
            <select id="dispute-reason" className="select" value={reason} onChange={(e) => setReason(e.target.value)} required>
              <option value="">Choose a reason…</option>
              {REASONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="dispute-detail" className="field-label">Details</label>
            <textarea
              id="dispute-detail"
              className="textarea"
              style={{ minHeight: 80 }}
              maxLength={2000}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="What went wrong?"
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" disabled={busy || !reason}>
              {busy ? <span className="spinner" /> : 'Submit dispute'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
