import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import Stars from './Stars.jsx';
import RoleBadge, { roleColor } from './RoleBadge.jsx';
import ReportButton from './ReportButton.jsx';
import { timeAgo } from '../lib/format.js';

export default function ReviewsSection({ providerId, providerName = 'this provider' }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/reviews/provider/${providerId}?pageSize=50`, { auth: Boolean(user) });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load reviews');
    }
    if (user) {
      try {
        const { pending: p } = await api.get('/reviews/pending');
        setPending(p.filter((x) => x.provider.id === Number(providerId)));
      } catch {
        setPending([]);
      }
    }
  }, [providerId, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !data) return <p className="error-text">{error}</p>;
  if (!data) return <p className="muted">Loading reviews…</p>;

  const { summary, data: reviews } = data;

  return (
    <div className="stack" id="reviews">
      <h2 style={{ margin: 0 }}>Reviews</h2>

      <div className="card row" style={{ gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--cc-ink)' }}>
            {summary.count ? summary.average.toFixed(1) : '—'}
          </div>
          <Stars value={summary.average} size={16} />
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
            {summary.count} review{summary.count === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          {[5, 4, 3, 2, 1].map((n) => {
            const c = summary.distribution[n] || 0;
            const pct = summary.count ? (c / summary.count) * 100 : 0;
            return (
              <div key={n} className="row" style={{ gap: 8, alignItems: 'center', fontSize: '0.8rem' }}>
                <span className="muted" style={{ width: 12 }}>{n}</span>
                <div style={{ flex: 1, height: 7, background: 'var(--cc-line)', borderRadius: 4 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--cc-warn)', borderRadius: 4 }} />
                </div>
                <span className="muted" style={{ width: 20, textAlign: 'right' }}>{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {pending.length > 0 && (
        <WriteReview
          pending={pending}
          providerName={providerName}
          onDone={() => {
            load();
          }}
        />
      )}
      {!user && (
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          <Link to="/login">Sign in</Link> to reply or react. Star ratings come from people who
          completed an order.
        </p>
      )}

      {reviews.length === 0 && (
        <div className="card"><p style={{ margin: 0 }}>No reviews yet.</p></div>
      )}

      <div className="stack">
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} providerId={providerId} onChange={load} />
        ))}
      </div>
    </div>
  );
}

function WriteReview({ pending, providerName, onDone }) {
  const [txId, setTxId] = useState(pending[0].transactionId);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Pick a star rating');
    setBusy(true);
    setError(null);
    try {
      await api.post('/reviews', { transactionId: txId, rating, body });
      setBody('');
      setRating(0);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post your review');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit} style={{ background: 'var(--cc-teal-50)', borderColor: 'var(--cc-teal-500)' }}>
      <strong>Review your experience with {providerName}</strong>
      {pending.length > 1 && (
        <select className="select" value={txId} onChange={(e) => setTxId(Number(e.target.value))}>
          {pending.map((p) => (
            <option key={p.transactionId} value={p.transactionId}>
              {p.listing.title}
            </option>
          ))}
        </select>
      )}
      <Stars value={rating} size={26} onChange={setRating} />
      <textarea
        className="textarea"
        style={{ minHeight: 70 }}
        placeholder="How did it go? Anything future clients should know."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        required
      />
      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Posting…' : 'Post review'}
      </button>
    </form>
  );
}

function ReviewCard({ review, providerId, onChange }) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);

  const like = async () => {
    if (!user) return;
    await api.post(`/reviews/${review.id}/like`);
    onChange();
  };
  const del = async () => {
    if (!confirm('Delete your review?')) return;
    await api.del(`/reviews/${review.id}`);
    onChange();
  };

  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <Avatar src={review.author.avatarUrl} name={review.author.userName} size={36} />
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to={`/u/${review.author.id}`} style={{ fontWeight: 700, color: roleColor(review.authorRole) }}>
              {review.author.userName}
            </Link>
            <RoleBadge role={review.authorRole} />
            <span className="muted" style={{ fontSize: '0.8rem' }}>{timeAgo(review.createdAt)}</span>
          </div>
          <Stars value={review.rating} size={14} />
        </div>
      </div>

      {editing ? (
        <EditReview review={review} onDone={() => { setEditing(false); onChange(); }} onCancel={() => setEditing(false)} />
      ) : (
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{review.body}</p>
      )}

      <div className="row" style={{ gap: 12, fontSize: '0.85rem' }}>
        <button className="linkbtn" onClick={like} disabled={!user}>
          {review.likedByMe ? '♥' : '♡'} {review.likeCount || ''}
        </button>
        {user && (
          <button className="linkbtn" onClick={() => setReplying((v) => !v)}>Reply</button>
        )}
        {review.mine && !editing && (
          <>
            <button className="linkbtn" onClick={() => setEditing(true)}>Edit</button>
            <button className="linkbtn" onClick={del}>Delete</button>
          </>
        )}
        {!review.mine && <ReportButton targetType="REVIEW" targetId={review.id} />}
      </div>

      {(review.replies.length > 0 || replying) && (
        <div className="stack" style={{ gap: 8, marginLeft: 46, borderLeft: '2px solid var(--cc-line)', paddingLeft: 12 }}>
          {review.replies.map((rep) => (
            <ReplyRow key={rep.id} reply={rep} onChange={onChange} />
          ))}
          {replying && (
            <ReplyComposer
              onSubmit={async (text) => {
                await api.post(`/reviews/${review.id}/replies`, { body: text });
                setReplying(false);
                onChange();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReplyRow({ reply, onChange }) {
  const { user } = useAuth();
  const like = async () => {
    if (!user) return;
    await api.post(`/reviews/replies/${reply.id}/like`);
    onChange();
  };
  const del = async () => {
    await api.del(`/reviews/replies/${reply.id}`);
    onChange();
  };
  return (
    <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
      <Avatar src={reply.author.avatarUrl} name={reply.author.userName} size={26} />
      <div style={{ flex: 1 }}>
        <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to={`/u/${reply.author.id}`} style={{ fontWeight: 600, fontSize: '0.85rem', color: roleColor(reply.authorRole) }}>
            {reply.author.userName}
          </Link>
          <RoleBadge role={reply.authorRole} />
          <span className="muted" style={{ fontSize: '0.75rem' }}>{timeAgo(reply.createdAt)}</span>
        </div>
        <p style={{ margin: '2px 0', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{reply.body}</p>
        <div className="row" style={{ gap: 10, fontSize: '0.8rem' }}>
          <button className="linkbtn" onClick={like} disabled={!user}>
            {reply.likedByMe ? '♥' : '♡'} {reply.likeCount || ''}
          </button>
          {reply.mine && <button className="linkbtn" onClick={del}>Delete</button>}
          {!reply.mine && <ReportButton targetType="REVIEW_REPLY" targetId={reply.id} />}
        </div>
      </div>
    </div>
  );
}

function ReplyComposer({ onSubmit }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="row"
      style={{ gap: 6 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        try {
          await onSubmit(text.trim());
          setText('');
        } finally {
          setBusy(false);
        }
      }}
    >
      <input className="input" style={{ flex: 1 }} placeholder="Write a reply…" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>Reply</button>
    </form>
  );
}

function EditReview({ review, onDone, onCancel }) {
  const [rating, setRating] = useState(review.rating);
  const [body, setBody] = useState(review.body);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      style={{ gap: 6 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api.patch(`/reviews/${review.id}`, { rating, body });
          onDone();
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stars value={rating} size={22} onChange={setRating} />
      <textarea className="textarea" style={{ minHeight: 60 }} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
      <div className="row" style={{ gap: 6 }}>
        <button className="btn btn-primary btn-sm" disabled={busy}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
