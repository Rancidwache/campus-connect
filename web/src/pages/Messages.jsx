import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { hasLocalKeypair, decryptMessage } from '../lib/e2ee.js';
import { timeAgo } from '../lib/format.js';

export default function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState(null);
  const [previews, setPreviews] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/messages/threads')
      .then((res) => setThreads(res.threads))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load messages'));
  }, []);

  // Decrypt each thread's last message for the preview line.
  useEffect(() => {
    if (!threads || !hasLocalKeypair()) return;
    let cancelled = false;
    (async () => {
      const out = {};
      for (const t of threads) {
        if (t.lastMessage && t.user.publicKey) {
          out[t.user.id] = (await decryptMessage(t.user.publicKey, t.lastMessage.encryptedPayload)) || '🔒 Encrypted message';
        }
      }
      if (!cancelled) setPreviews(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [threads]);

  return (
    <div className="stack" style={{ maxWidth: 620 }}>
      <h1 style={{ margin: 0 }}>Messages</h1>
      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        🔒 Every conversation is end-to-end encrypted. Campus Connect cannot read them.
      </p>

      {!hasLocalKeypair() && (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            Set up your encryption key to send and read messages.
          </p>
          <Link to="/profile" className="btn btn-primary">
            Set up encrypted chat
          </Link>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      {!threads && !error && <p className="muted">Loading…</p>}

      {threads && threads.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>
            No conversations yet. Open a listing and choose <strong>Message the provider</strong>,
            or message the other party from an order.
          </p>
        </div>
      )}

      <div className="stack">
        {threads?.map((t) => (
          <Link
            key={t.user.id}
            to={`/messages/${t.user.id}`}
            className="card"
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div className="row-between" style={{ marginBottom: 2 }}>
              <strong style={{ color: 'var(--cc-ink)' }}>{t.user.fullName}</strong>
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                {timeAgo(t.lastMessage?.createdAt)}
              </span>
            </div>
            <div className="row-between">
              <span className="muted" style={{ fontSize: '0.9rem' }}>
                {t.lastMessage?.senderId === user.id ? 'You: ' : ''}
                {previews[t.user.id] || '🔒 …'}
              </span>
              {t.unread > 0 && (
                <span
                  style={{
                    background: 'var(--cc-teal-700)',
                    color: '#fff',
                    borderRadius: 999,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 7px',
                  }}
                >
                  {t.unread}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
