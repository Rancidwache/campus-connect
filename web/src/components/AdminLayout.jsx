import { NavLink, Navigate, Outlet, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/listings', label: 'Listings' },
  { to: '/admin/payments', label: 'Payments' },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const [openReports, setOpenReports] = useState(null);

  useEffect(() => {
    if (!user?.isAdmin) return;
    api
      .get('/admin/reports/stats')
      .then((s) => setOpenReports((s?.OPEN ?? 0) + (s?.REVIEWING ?? 0)))
      .catch(() => {});
  }, [user]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  return (
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
        <Link to="/" className="admin-link" style={{ opacity: 0.75 }}>
          ← Back to app
        </Link>
      </nav>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
