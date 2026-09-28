import { NavLink, Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import ThemeToggle from './ThemeToggle.jsx';
import Avatar from './Avatar.jsx';

const LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/listings', label: 'Listings' },
  { to: '/admin/payments', label: 'Payments' },
];

// The admin console's own shell — deliberately separate from the marketplace
// Layout/nav (no Browse, Post, Orders, chat…). Only admin functions live here.
export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [openReports, setOpenReports] = useState(null);

  useEffect(() => {
    if (!user?.isAdmin) return;
    api
      .get('/admin/reports/stats')
      .then((s) => setOpenReports((s?.OPEN ?? 0) + (s?.REVIEWING ?? 0)))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) return <p className="muted" style={{ padding: 'var(--sp-6)' }}>Loading…</p>;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={styles.header}>
        <div style={styles.inner}>
          <span style={styles.brand}>
            <span style={styles.mark}>C</span>
            Admin
          </span>
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            <ThemeToggle />
            <span className="row" style={{ gap: 8, alignItems: 'center' }}>
              <Avatar src={user.avatarUrl} name={user.fullName} size={26} />
              <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{user.fullName.split(' ')[0]}</span>
            </span>
            <button className="linkbtn" onClick={onLogout}>Sign out</button>
            <Link to="/" className="btn btn-ghost btn-sm">← Back to app</Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, width: '100%' }}>
        <div className="admin-shell">
          <nav className="admin-side" aria-label="Admin">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `admin-link${isActive ? ' is-active' : ''}`}
              >
                {l.label}
                {l.to === '/admin/moderation' && !!openReports && (
                  <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>{openReports}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="admin-main">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    background: 'color-mix(in srgb, var(--surface) 82%, transparent)',
    backdropFilter: 'saturate(180%) blur(12px)',
    WebkitBackdropFilter: 'saturate(180%) blur(12px)',
    borderBottom: '1px solid var(--border)',
  },
  inner: {
    maxWidth: 'var(--maxw)',
    margin: '0 auto',
    minHeight: 'var(--header-h)',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 9,
    fontWeight: 800,
    fontSize: '1.02rem',
    letterSpacing: '-0.02em',
    color: 'var(--text)',
  },
  mark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 9,
    background: 'var(--brand)',
    color: 'var(--brand-contrast)',
    fontWeight: 900,
    fontSize: '0.95rem',
  },
};
