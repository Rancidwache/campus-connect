import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from './Modal.jsx';

const SEVERITIES = [
  ['LOW', 'Minor — annoying, but I can carry on'],
  ['MEDIUM', 'Something is broken or confusing'],
  ['HIGH', "I can't do what I came to do"],
];

// "Report a bug" — for problems with the app itself (use <ReportButton> for
// listings, reviews, users and orders). Works signed out as well.
export default function BugReportButton({ label = 'Report a bug' }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [contact, setContact] = useState('');
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const [msg, setMsg] = useState(null);

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setState('idle');
      setTitle('');
      setDescription('');
      setSeverity('MEDIUM');
      setContact('');
      setMsg(null);
    }, 250);
  };

  const submit = async (e) => {
    e.preventDefault();
    setState('busy');
    setMsg(null);
    try {
      await api.post('/bug-reports', {
        title: title.trim(),
        description: description.trim(),
        severity,
        // Path only — no query string or hash, which can carry personal data.
        pageUrl: pathname,
        contact: !user && contact.trim() ? contact.trim() : undefined,
      });
      setState('done');
    } catch (err) {
      setState('error');
      setMsg(err instanceof ApiError ? err.message : 'Could not send the bug report');
    }
  };

  return (
    <>
      <button type="button" className="linkbtn" onClick={() => setOpen(true)}>
        {label}
      </button>

      <Modal open={open} onClose={close} title={state === 'done' ? 'Thanks for letting us know' : undefined}>
        {state === 'done' ? (
          <>
            <p style={{ margin: 0 }}>Your report has been sent to the team. Thank you for helping us improve Campus Connect.</p>
            <button className="btn btn-primary" onClick={close}>
              Close
            </button>
          </>
        ) : (
          <form className="stack" onSubmit={submit}>
            <h3 style={{ margin: 0 }}>Report a bug</h3>
            <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-xs)' }}>
              Something not working? Tell us what happened. We include the page you are on ({pathname}) and your
              browser type to help us reproduce it.
            </p>

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="bug-title" className="field-label">What went wrong?</label>
              <input
                id="bug-title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={3}
                maxLength={120}
                placeholder="e.g. The pay button does nothing"
                required
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="bug-desc" className="field-label">Details</label>
              <textarea
                id="bug-desc"
                className="textarea"
                style={{ minHeight: 90 }}
                minLength={10}
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you do, what did you expect, and what happened instead?"
                required
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="bug-sev" className="field-label">How bad is it?</label>
              <select id="bug-sev" className="select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {!user && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="bug-contact" className="field-label">Email or phone (optional)</label>
                <input
                  id="bug-contact"
                  className="input"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={120}
                  placeholder="So we can follow up if we need more detail"
                />
              </div>
            )}

            {msg && <p className="error-text">{msg}</p>}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" disabled={state === 'busy'}>
                {state === 'busy' ? <span className="spinner" /> : 'Send report'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
