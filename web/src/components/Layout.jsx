import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { useChat } from '../context/ChatContext.jsx';

function Count({ n }) {
  if (!n) return null;
  return (
    <span
      style={{
        marginLeft: 4,
        background: 'var(--cc-teal-700)',
        color: '#fff',
        borderRadius: 999,
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '1px 6px',
      }}
    >
      {n}
    </span>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { unread: chatUnread } = useChat();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link to="/" style={styles.brand}>
            Campus&nbsp;Connect <span style={styles.v2}>V2</span>
          </Link>
          <nav style={styles.nav}>
            <NavLink to="/browse" style={navStyle}>
              Browse
            </NavLink>
            {user ? (
              <>
                <NavLink to="/listings/new" style={navStyle}>
                  Post
                </NavLink>
                <NavLink to="/dashboard" style={navStyle}>
                  My listings
                </NavLink>
                <NavLink to="/orders" style={navStyle}>
                  Orders
                </NavLink>
                <NavLink to="/messages" style={navStyle}>
                  Chat
                  <Count n={chatUnread} />
                </NavLink>
                <NavLink to="/notifications" style={navStyle}>
                  Alerts
                  <Count n={unreadCount} />
                </NavLink>
                <NavLink to="/profile" style={navStyle}>
                  {user.fullName.split(' ')[0]}
                </NavLink>
                <button className="btn btn-ghost btn-sm" onClick={onLogout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" style={navStyle}>
                  Sign in
                </NavLink>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer style={styles.footer}>
        <div className="container" style={{ paddingBottom: 24 }}>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Campus Connect V2 — a secure marketplace for skills, gigs and equipment hire.
            Payments held in M-Pesa escrow. Chat is end-to-end encrypted.
          </p>
        </div>
      </footer>
    </>
  );
}

const navStyle = ({ isActive }) => ({
  fontWeight: 600,
  fontSize: '0.9rem',
  textDecoration: 'none',
  color: isActive ? 'var(--cc-teal-700)' : 'var(--cc-body)',
});

const styles = {
  header: {
    background: 'var(--cc-surface)',
    borderBottom: '1px solid var(--cc-line)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 'var(--cc-maxw)',
    margin: '0 auto',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  brand: { fontWeight: 800, fontSize: '1.1rem', color: 'var(--cc-ink)', textDecoration: 'none' },
  v2: { color: 'var(--cc-teal-700)' },
  nav: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  footer: { borderTop: '1px solid var(--cc-line)', marginTop: 32, background: 'var(--cc-surface)' },
};
