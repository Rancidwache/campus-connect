import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { timeAgo } from '../lib/format.js';

export default function Notifications() {
  const { items, unreadCount, markRead } = useNotifications();

  // Mark everything read on the way out of this screen.
  useEffect(() => () => {
    if (unreadCount > 0) markRead();
  }, [unreadCount, markRead]);

  return (
    <div className="stack" style={{ maxWidth: 620 }}>
      <div className="row-between">
        <h1 style={{ margin: 0 }}>Notifications</h1>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => markRead()}>
            Mark all read
          </button>
        )}
      </div>

      {items.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>Nothing yet. Updates about your orders show up here.</p>
        </div>
      )}

      <div className="stack">
        {items.map((n) => {
          const inner = (
            <>
              <div className="row-between" style={{ marginBottom: 4 }}>
                <strong style={{ color: 'var(--cc-ink)' }}>{n.title}</strong>
                <span className="muted" style={{ fontSize: '0.8rem' }}>{timeAgo(n.createdAt)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{n.body}</p>
            </>
          );
          const style = {
            display: 'block',
            textDecoration: 'none',
            borderLeft: n.readAt ? '3px solid transparent' : '3px solid var(--cc-teal-500)',
          };
          return n.transactionId ? (
            <Link key={n.id} to={`/orders/${n.transactionId}`} className="card" style={style}>
              {inner}
            </Link>
          ) : (
            <div key={n.id} className="card" style={style}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
