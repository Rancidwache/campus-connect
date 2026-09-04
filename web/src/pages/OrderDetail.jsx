import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import EscrowBadge, { escrowHint } from '../components/EscrowBadge.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { KES } from '../lib/format.js';

const TRANSITIONAL = ['PENDING_PAYMENT', 'RELEASING', 'REFUNDING'];

export default function OrderDetail() {
  const { id } = useParams();
  const { refresh: refreshNotifs } = useNotifications();
  const [tx, setTx] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const poll = useRef(null);

  const load = useCallback(async () => {
    try {
      const { transaction } = await api.get(`/transactions/${id}`);
      setTx(transaction);
      return transaction;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this order');
      return null;
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the order is mid-transition (waiting on an M-Pesa callback).
  useEffect(() => {
    clearInterval(poll.current);
    if (tx && TRANSITIONAL.includes(tx.escrowStatus)) {
      poll.current = setInterval(async () => {
        const next = await load();
        if (next && !TRANSITIONAL.includes(next.escrowStatus)) {
          clearInterval(poll.current);
          refreshNotifs();
        }
      }, 3000);
      return () => clearInterval(poll.current);
    }
  }, [tx?.escrowStatus, load, refreshNotifs]);

  const act = async (path) => {
    setBusy(true);
    setError(null);
    try {
      const { transaction } = await api.post(`/transactions/${id}/${path}`);
      setTx(transaction);
      refreshNotifs();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That action failed');
    } finally {
      setBusy(false);
    }
  };

  if (error && !tx) return <p className="error-text">{error}</p>;
  if (!tx) return <p className="muted">Loading…</p>;

  const isClient = tx.role === 'client';

  return (
    <div className="stack" style={{ maxWidth: 620 }}>
      <Link to="/orders" className="muted" style={{ fontSize: '0.9rem' }}>
        ← All orders
      </Link>

      <div className="card stack">
        <div className="row-between">
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{tx.listing.title}</h1>
          <EscrowBadge status={tx.escrowStatus} />
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          {isClient
            ? `You are hiring ${tx.provider.fullName}`
            : `${tx.client.fullName} is hiring you`}
        </p>

        <p style={{ margin: 0 }}>{escrowHint(tx.escrowStatus, tx.role)}</p>

        <Link
          to={`/messages/${isClient ? tx.provider.id : tx.client.id}`}
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: 'flex-start' }}
        >
          💬 Message {(isClient ? tx.provider.fullName : tx.client.fullName).split(' ')[0]}
        </Link>

        <div
          className="card"
          style={{ background: 'var(--cc-bg)', boxShadow: 'none', padding: 'var(--cc-s4)' }}
        >
          <Row label={isClient ? 'Provider fee' : 'Your fee'} value={KES.format(tx.feeAmount)} />
          <Row label="Platform fee" value={KES.format(tx.platformFee)} />
          <Row label={isClient ? 'You pay' : 'Client pays'} value={KES.format(tx.amount)} strong />
        </div>

        <Timeline tx={tx} />

        {(tx.mpesaReceipt || tx.b2cReceipt) && (
          <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            {tx.mpesaReceipt && <>Deposit receipt: <code>{tx.mpesaReceipt}</code>. </>}
            {tx.b2cReceipt && <>Payout receipt: <code>{tx.b2cReceipt}</code>.</>}
          </p>
        )}

        {error && <p className="error-text">{error}</p>}

        <div className="row">
          {isClient && tx.escrowStatus === 'HELD' && (
            <button className="btn btn-primary" onClick={() => act('approve')} disabled={busy}>
              {busy ? 'Releasing…' : 'Approve delivery & release payment'}
            </button>
          )}
          {!isClient && tx.escrowStatus === 'HELD' && (
            <button className="btn btn-ghost" onClick={() => act('decline')} disabled={busy}>
              {busy ? 'Refunding…' : 'Decline job & refund client'}
            </button>
          )}
          {isClient && ['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(tx.escrowStatus) && (
            <button className="btn btn-ghost" onClick={() => act('cancel')} disabled={busy}>
              Cancel order
            </button>
          )}
          {isClient && tx.escrowStatus === 'PAYMENT_FAILED' && (
            <Link to={`/listings/${tx.listing.id}`} className="btn btn-primary">
              Try again
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div
      className="row-between"
      style={{ padding: '4px 0', fontWeight: strong ? 800 : 400, color: strong ? 'var(--cc-ink)' : 'inherit' }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Timeline({ tx }) {
  const steps = [
    { key: 'created', label: 'Order created', at: tx.createdAt, done: true },
    {
      key: 'paid',
      label: 'Deposit secured in escrow',
      at: tx.paidAt,
      done: Boolean(tx.paidAt),
    },
  ];
  if (tx.escrowStatus === 'REFUNDED' || tx.escrowStatus === 'REFUNDING') {
    steps.push({ key: 'refund', label: 'Refunded to client', at: tx.refundedAt, done: Boolean(tx.refundedAt) });
  } else {
    steps.push({
      key: 'released',
      label: 'Paid out to provider',
      at: tx.releasedAt,
      done: Boolean(tx.releasedAt),
    });
  }

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {steps.map((s) => (
        <li key={s.key} className="row" style={{ alignItems: 'baseline', padding: '3px 0' }}>
          <span aria-hidden style={{ color: s.done ? 'var(--cc-ok)' : 'var(--cc-line)' }}>
            {s.done ? '●' : '○'}
          </span>
          <span style={{ color: s.done ? 'var(--cc-ink)' : 'var(--cc-muted)', fontSize: '0.9rem' }}>
            {s.label}
            {s.at && (
              <span className="muted">
                {' '}
                — {new Date(s.at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
