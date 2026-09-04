import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { hasLocalKeypair, encryptMessage, decryptMessage } from '../lib/e2ee.js';

export default function Thread() {
  const { userId } = useParams();
  const peerId = Number(userId);
  const { user } = useAuth();
  const { on, emit } = useRealtime();
  const { refresh: refreshChatUnread } = useChat();

  const [partner, setPartner] = useState(null);
  const [rows, setRows] = useState([]); // { id, senderId, text, createdAt, deliveredAt }
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);

  const decryptRow = useCallback(
    async (m, peerKey) => ({
      id: m.id,
      senderId: m.senderId,
      createdAt: m.createdAt,
      deliveredAt: m.deliveredAt,
      text: (await decryptMessage(peerKey, m.encryptedPayload)) ?? null,
    }),
    [],
  );

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    setRows([]);
    setPartner(null);
    setError(null);
    api
      .get(`/messages/thread/${peerId}?limit=100`)
      .then(async ({ partner: p, messages }) => {
        if (cancelled) return;
        setPartner(p);
        if (p.publicKey && hasLocalKeypair()) {
          setRows(await Promise.all(messages.map((m) => decryptRow(m, p.publicKey))));
        } else {
          setRows(messages.map((m) => ({ id: m.id, senderId: m.senderId, createdAt: m.createdAt, deliveredAt: m.deliveredAt, text: null })));
        }
        refreshChatUnread();
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not open this conversation'));
    return () => {
      cancelled = true;
    };
  }, [peerId, decryptRow, refreshChatUnread]);

  // Live: incoming messages + delivery receipts.
  useEffect(() => {
    if (!partner) return undefined;
    const offNew = on('message:new', async (m) => {
      if (m.senderId !== peerId) return;
      const row = partner.publicKey && hasLocalKeypair() ? await decryptRow(m, partner.publicKey) : { id: m.id, senderId: m.senderId, createdAt: m.createdAt, text: null };
      setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]));
      api.post('/messages/delivered', { messageIds: [m.id] }).then(refreshChatUnread).catch(() => {});
    });
    const offDelivered = on('message:delivered', ({ byUserId, messageIds, at }) => {
      if (byUserId !== peerId) return;
      const ids = new Set(messageIds);
      setRows((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, deliveredAt: at } : r)));
    });
    emit('thread:open', { withUserId: peerId });
    return () => {
      offNew();
      offDelivered();
    };
  }, [partner, peerId, on, emit, decryptRow, refreshChatUnread]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rows.length]);

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !partner?.publicKey) return;
    setSending(true);
    setError(null);
    try {
      const encryptedPayload = await encryptMessage(partner.publicKey, text);
      const { message } = await api.post('/messages', { toUserId: peerId, encryptedPayload });
      setRows((prev) => [...prev, { id: message.id, senderId: user.id, text, createdAt: message.createdAt, deliveredAt: null }]);
      setDraft('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Message not sent');
    } finally {
      setSending(false);
    }
  };

  if (error && !partner) return <p className="error-text">{error}</p>;
  if (!partner) return <p className="muted">Loading…</p>;

  const canChat = hasLocalKeypair() && partner.publicKey;

  return (
    <div className="stack" style={{ maxWidth: 620 }}>
      <Link to="/messages" className="muted" style={{ fontSize: '0.9rem' }}>
        ← All messages
      </Link>

      <div className="row-between">
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>
          <Link to={`/u/${partner.id}`} style={{ color: 'var(--cc-ink)' }}>
            {partner.fullName}
          </Link>
        </h1>
        <span className="badge badge-ok">🔒 End-to-end encrypted</span>
      </div>

      {!hasLocalKeypair() && (
        <div className="card">
          <p style={{ marginTop: 0 }}>Set up your encryption key to read and send messages here.</p>
          <Link to="/profile" className="btn btn-primary">Set up encrypted chat</Link>
        </div>
      )}
      {hasLocalKeypair() && !partner.publicKey && (
        <div className="card">
          <p style={{ margin: 0 }}>{partner.fullName} hasn't set up encrypted chat yet. You can't message them until they do.</p>
        </div>
      )}

      <div
        className="card"
        style={{ minHeight: 240, maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {rows.length === 0 && <p className="muted" style={{ margin: 'auto' }}>No messages yet. Say hello 👋</p>}
        {rows.map((r) => {
          const mine = r.senderId === user.id;
          return (
            <div
              key={r.id}
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                background: mine ? 'var(--cc-teal-700)' : 'var(--cc-bg)',
                color: mine ? '#fff' : 'var(--cc-ink)',
                border: mine ? 'none' : '1px solid var(--cc-line)',
                borderRadius: 12,
                padding: '8px 12px',
                fontSize: '0.92rem',
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {r.text ?? <em style={{ opacity: 0.7 }}>🔒 can't decrypt (different device key)</em>}
              </div>
              <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: 3, textAlign: 'right' }}>
                {new Date(r.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                {mine && (r.deliveredAt ? ' ✓✓' : ' ✓')}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {error && <p className="error-text">{error}</p>}

      <form onSubmit={send} className="row" style={{ gap: 8 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder={canChat ? 'Write a message…' : 'Encrypted chat unavailable'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!canChat || sending}
        />
        <button className="btn btn-primary" disabled={!canChat || sending || !draft.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
