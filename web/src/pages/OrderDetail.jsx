import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, ApiError } from '../api/client.js';
import EscrowBadge, { escrowHint } from '../components/EscrowBadge.jsx';
import Avatar from '../components/Avatar.jsx';
import Skeleton, { SkeletonText } from '../components/Skeleton.jsx';
import { Pop } from '../components/motion.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { KES } from '../lib/format.js';

const TRANSITIONAL = ['PENDING_PAYMENT', 'RELEASING', 'REFUNDING'];
const EASE = [0.22, 1, 0.36, 1];

export default function OrderDetail() {
  const { id } = useParams();
  const { refresh: refreshNotifs } = useNotifications();
  const { toast } = useToast();
  const [tx, setTx] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const poll = useRef(null);
  const prevStatus = useRef(null);

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

  useEffect(() => {
    clearInterval(poll.current);
    if (tx && TRANSITIONAL.includes(tx.escrowStatus)) {
      poll.current = setInterval(async () => {
        const next = await load();
        if (next && !TRANSITIONAL.includes(next.escrowStatus)) {
          clearInterval(poll.current);
          refreshNotifs();
          if (next.escrowStatus === 'HELD') toast.success('Funds secured in escrow');
          if (next.escrowStatus === 'RELEASED') toast.success('Payment released to the provider');
          if (next.escrowStatus === 'REFUNDED') toast.success('Refund sent');
        }
      }, 3000);
      return () => clearInterval(poll.current);
    }
    return undefined;
  }, [tx?.escrowStatus, load, refreshNotifs, toast]);

  const act = async (path) => {
    setBusy(true);
    setError(null);
    try {
      const { transaction } = await api.post(`/transactions/${id}/${path}`);
      prevStatus.current = tx?.escrowStatus;
      setTx(transaction);
      refreshNotifs();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That action failed');
    } finally {
      setBusy(false);
    }
  };

  if (error && !tx) return <p className="error-text">{error}</p>;

  if (!tx) {
    return (
      <div className="stack" style={{ maxWidth: 620 }}>
        <Skeleton h={24} w={120} />
        <div className="card stack">
          <Skeleton h={22} w="60%" />
          <SkeletonText lines={2} />
          <Skeleton h={90} r="var(--r-md)" />
        </div>
      </div>
    );
  }

  const isClient = tx.role === 'client';
  const other = isClient ? tx.provider : tx.client;
  const done = ['RELEASED', 'REFUNDED'].includes(tx.escrowStatus);

  return (
    <div className="stack-6" style={{ maxWidth: 620 }}>
      <Link to="/orders" className="chip" style={{ alignSelf: 'flex-start' }}>
        ← Orders
      </Link>

      <div className="card stack">
        <div className="row-between">
          <h1 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{tx.listing.title}</h1>
          <Pop k={tx.escrowStatus}>
            <EscrowBadge status={tx.escrowStatus} />
          </Pop>
        </div>

        <Link to={`/u/${other.id}`} className="row" style={{ gap: 10, textDecoration: 'none' }}>
          <Avatar src={other.avatarUrl} name={other.fullName} size={34} />
          <span className="stack" style={{ gap: 1 }}>
            <strong style={{ color: 'var(--text)' }}>{other.fullName}</strong>
            <span className="faint" style={{ fontSize: 'var(--fs-xs)' }}>
              {isClient ? 'Provider' : 'Client'}
            </span>
          </span>
        </Link>

        <div
          className="card-inset"
          style={{
            borderLeft: `3px solid ${done ? 'var(--ok)' : 'var(--brand)'}`,
            background: done ? 'var(--ok-soft)' : 'var(--brand-soft)',
            color: 'var(--text)',
          }}
        >
          {escrowHint(tx.escrowStatus, tx.role)}
        </div>

        <Link to={`/messages/${other.id}`} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
          💬 Message {other.fullName.split(' ')[0]}
        </Link>

        <div className="card-inset stack-2">
          <Row label={isClient ? 'Provider fee' : 'Your fee'} value={KES.format(tx.feeAmount)} />
          <Row label="Platform fee" value={KES.format(tx.platformFee)} />
          <hr className="divider" />
          <Row label={isClient ? 'You pay' : 'Client pays'} value={KES.format(tx.amount)} strong />
        </div>

        <Timeline tx={tx} />

        {(tx.mpesaReceipt || tx.b2cReceipt) && (
          <div className="row" style={{ gap: 6, fontSize: 'var(--fs-xs)' }}>
            {tx.mpesaReceipt && <span className="badge badge-muted">Deposit {tx.mpesaReceipt}</span>}
            {tx.b2cReceipt && <span className="badge badge-muted">Payout {tx.b2cReceipt}</span>}
          </div>
        )}

        <div className="row" style={{ gap: 8 }}>
          {isClient && tx.escrowStatus === 'HELD' && (
            <button className="btn btn-primary" onClick={() => act('approve')} disabled={busy}>
              {busy ? <span className="spinner" /> : 'Approve delivery & release payment'}
            </button>
          )}
          {!isClient && tx.escrowStatus === 'HELD' && (
            <button className="btn btn-ghost" onClick={() => act('decline')} disabled={busy}>
              {busy ? <span className="spinner" /> : 'Decline job & refund client'}
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
          {isClient && done && (
            <Link to={`/u/${tx.provider.id}#reviews`} className="btn btn-ghost">
              ★ Leave a review
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
      style={{ fontSize: 'var(--fs-sm)', fontWeight: strong ? 800 : 400, color: strong ? 'var(--text)' : 'var(--text-dim)' }}
    >
      <span>{label}</span>
      <span style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function Timeline({ tx }) {
  const isRefund = tx.escrowStatus === 'REFUNDED' || tx.escrowStatus === 'REFUNDING';
  const steps = [
    { label: 'Order created', at: tx.createdAt, done: true },
    { label: 'Deposit secured in escrow', at: tx.paidAt, done: Boolean(tx.paidAt), active: tx.escrowStatus === 'PENDING_PAYMENT' },
    isRefund
      ? { label: 'Refunded to client', at: tx.refundedAt, done: Boolean(tx.refundedAt), active: tx.escrowStatus === 'REFUNDING' }
      : { label: 'Paid out to provider', at: tx.releasedAt, done: Boolean(tx.releasedAt), active: tx.escrowStatus === 'RELEASING' },
  ];

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, position: 'relative' }}>
      {steps.map((s, i) => (
        <li key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < steps.length - 1 ? 14 : 0 }}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.span
              initial={false}
              animate={
                s.active
                  ? { scale: [1, 1.25, 1], opacity: 1 }
                  : { scale: 1, opacity: s.done ? 1 : 0.5 }
              }
              transition={s.active ? { duration: 1.4, repeat: Infinity } : { duration: 0.3, ease: EASE }}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 10,
                color: '#fff',
                background: s.done ? 'var(--ok)' : s.active ? 'var(--brand)' : 'var(--surface-3)',
                border: s.done || s.active ? 'none' : '2px solid var(--border-strong)',
                flexShrink: 0,
              }}
            >
              {s.done ? '✓' : ''}
            </motion.span>
            {i < steps.length - 1 && (
              <span
                style={{
                  width: 2,
                  flex: 1,
                  marginTop: 2,
                  background: s.done ? 'var(--ok)' : 'var(--border)',
                }}
              />
            )}
          </div>
          <div style={{ paddingTop: 0 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: s.done || s.active ? 'var(--text)' : 'var(--text-faint)' }}>
              {s.label}
            </div>
            {s.at && (
              <div className="faint" style={{ fontSize: 'var(--fs-xs)' }}>
                {new Date(s.at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
