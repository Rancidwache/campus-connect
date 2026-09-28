import { useState } from 'react';
import { api, ApiError } from '../api/client.js';
import Modal from './Modal.jsx';

const MAX_PHOTOS = 5;

// Provider-side: upload delivery-proof photos + a note before the client
// approves. DoorDash-style "here's proof I dropped it off."
export default function DeliveryProofButton({ txId, hasExisting, onDone }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setFiles([]);
      setNote('');
      setError(null);
    }, 250);
  };

  const pickFiles = (e) => {
    const picked = [...(e.target.files || [])].slice(0, MAX_PHOTOS);
    setFiles(picked);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setError('Add at least one photo');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      if (note.trim()) fd.append('note', note.trim());
      const { transaction } = await api.postForm(`/transactions/${txId}/delivery-proof`, fd);
      onDone(transaction);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit delivery proof');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        {hasExisting ? 'Update delivery photos' : '📸 Mark as delivered'}
      </button>

      <Modal open={open} onClose={close} title="Submit delivery proof" maxWidth={480}>
        <form className="stack" onSubmit={submit}>
          <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
            Add photos showing the item or work delivered. The client sees these before
            releasing payment.
          </p>

          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="proof-photos" className="field-label">Photos (up to {MAX_PHOTOS})</label>
            <input id="proof-photos" type="file" accept="image/*" multiple onChange={pickFiles} className="input" />
            {files.length > 0 && (
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                {files.map((f, i) => (
                  <img
                    key={i}
                    src={URL.createObjectURL(f)}
                    alt=""
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="proof-note" className="field-label">Note (optional)</label>
            <textarea
              id="proof-note"
              className="textarea"
              style={{ minHeight: 70 }}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Left with the front desk, or handed to the client directly"
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" disabled={busy || !files.length}>
              {busy ? <span className="spinner" /> : 'Submit proof'}
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
