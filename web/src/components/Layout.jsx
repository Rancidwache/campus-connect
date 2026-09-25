import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import Avatar from './Avatar.jsx';

const PRIMARY = [
  { to: '/browse', label: 'Browse' },
  { to: '/listings/new', label: 'Post', auth: true },
  { to: '/dashboard', label: 'My listings', auth: true },
  { to: '/saved', label: 'Saved', auth: true },
  { to: '/orders', label: 'Orders', auth: true },
];

const navLinkStyle = ({ isActive }) => ({
  fontWeight: 600,
  fontSize: 'var(--fs-sm)',
  color: isActive ? 'var(--text)' : 'var(--text-dim)',
  padding: '6px 2px',
  position: 'relative',
});

export default function Layout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { unread: chatUnread } = useChat();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname]);

  const onLogout = () => {
    logout();
    navigate('/');
  };

  const links = PRIMARY.filter((l) => !l.auth || user);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={styles.header}>
        <div style={styles.inner}>
          <Link to="/" style={styles.brand} aria-label="Campus Connect home">
            <span style={styles.mark}>C</span>
            <span>
              Campus&nbsp;Connect <span style={{ color: 'var(--brand-strong)' }}>V2</span>
            </span>
          </Link>

          <nav data-cc-nav="desktop" style={styles.desktopNav} aria-label="Primary">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} style={navLinkStyle}>
                {l.label}
              </NavLink>
            ))}
            {user && (
              <>
                <IconLink to="/messages" label="Chat" count={chatUnread} icon={chatIcon} />
                <IconLink to="/notifications" label="Alerts" count={unreadCount} icon={bellIcon} />
                {user.isAdmin && (
                  <>
                    <NavLink to="/admin/reports" style={navLinkStyle}>
                      Moderation
                    </NavLink>
                    <NavLink to="/admin/stats" style={navLinkStyle}>
                      Stats
                    </NavLink>
                  </>
                )}
              </>
            )}
            <ThemeToggle />
            {user ? (
              <Link to="/profile" style={styles.userChip} title="Your profile">
                <Avatar src={user.avatarUrl} name={user.fullName} size={26} />
                <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                  {user.fullName.split(' ')[0]}
                </span>
              </Link>
            ) : (
              <div className="row" style={{ gap: 8 }}>
                <NavLink to="/login" style={navLinkStyle}>
                  Sign in
                </NavLink>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Create account
                </Link>
              </div>
            )}
            {user && (
              <button className="linkbtn" onClick={onLogout} style={{ marginLeft: 2 }}>
                Sign out
              </button>
            )}
          </nav>

          <div data-cc-nav="mobile" style={styles.mobileControls}>
            <ThemeToggle />
            <button
              className="btn btn-ghost btn-sm"
              aria-expanded={menuOpen}
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
              style={{ padding: '7px 10px' }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              style={styles.mobilePanel}
            >
              <div style={{ padding: 'var(--sp-3) var(--sp-4) var(--sp-5)' }} className="stack-2">
                {links.map((l) => (
                  <NavLink key={l.to} to={l.to} style={mobileItem}>
                    {l.label}
                  </NavLink>
                ))}
                {user ? (
                  <>
                    <NavLink to="/messages" style={mobileItem}>
                      Chat {chatUnread > 0 && <span className="count-pill">{chatUnread}</span>}
                    </NavLink>
                    <NavLink to="/notifications" style={mobileItem}>
                      Alerts {unreadCount > 0 && <span className="count-pill">{unreadCount}</span>}
                    </NavLink>
                    {user.isAdmin && (
                      <>
                        <NavLink to="/admin/reports" style={mobileItem}>
                          Moderation
                        </NavLink>
                        <NavLink to="/admin/stats" style={mobileItem}>
                          Stats
                        </NavLink>
                      </>
                    )}
                    <NavLink to="/profile" style={mobileItem}>
                      Profile
                    </NavLink>
                    <button className="btn btn-ghost btn-block" onClick={onLogout} style={{ marginTop: 6 }}>
                      Sign out
                    </button>
                  </>
                ) : (
                  <div className="row" style={{ gap: 8, marginTop: 4 }}>
                    <Link to="/login" className="btn btn-ghost grow">
                      Sign in
                    </Link>
                    <Link to="/register" className="btn btn-primary grow">
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="container"
          style={{ flex: 1, width: '100%' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <footer style={styles.footer}>
        <div className="container" style={{ paddingBlock: 'var(--sp-6)' }}>
          <div className="row-between">
            <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-xs)', maxWidth: 520 }}>
              Campus Connect V2 — a secure marketplace for skills, gigs and equipment hire.
              Payments held in M-Pesa escrow. Chat is end-to-end encrypted.
            </p>
            <Link to="/guidelines" className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
              Community Guidelines
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function IconLink({ to, label, count, icon }) {
  return (
    <NavLink
      to={to}
      aria-label={count ? `${label}, ${count} new` : label}
      title={label}
      style={({ isActive }) => ({
        position: 'relative',
        display: 'inline-flex',
        padding: 6,
        borderRadius: 'var(--r-full)',
        color: isActive ? 'var(--brand-strong)' : 'var(--text-dim)',
      })}
    >
      {icon}
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 15,
            height: 15,
            padding: '0 4px',
            fontSize: '0.62rem',
            fontWeight: 800,
            borderRadius: 'var(--r-full)',
            background: 'var(--danger)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </NavLink>
  );
}

const svg = (d) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const chatIcon = svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />);
const bellIcon = svg(<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />);

const mobileItem = ({ isActive }) => ({
  display: 'block',
  padding: '10px 4px',
  fontWeight: 600,
  fontSize: 'var(--fs-base)',
  color: isActive ? 'var(--brand-strong)' : 'var(--text)',
  borderBottom: '1px solid var(--border)',
});

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
    textDecoration: 'none',
    flexShrink: 0,
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
  desktopNav: {
    display: 'none',
    alignItems: 'center',
    gap: 18,
    flexWrap: 'wrap',
  },
  mobileControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  userChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '4px 10px 4px 4px',
    borderRadius: 'var(--r-full)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text)',
    textDecoration: 'none',
  },
  mobilePanel: {
    overflow: 'hidden',
    borderTop: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  footer: {
    borderTop: '1px solid var(--border)',
    background: 'var(--surface)',
  },
};

