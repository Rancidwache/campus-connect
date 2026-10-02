import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import Skeleton from '../../components/Skeleton.jsx';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (search) => {
    setError(null);
    try {
      const res = await api.get(`/admin/users?pageSize=100${search ? `&q=${encodeURIComponent(search)}` : ''}`);
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users');
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  const toggleAdmin = async (u) => {
    setBusyId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/admin`, { isAdmin: !u.isAdmin });
      toast.success(u.isAdmin ? `Revoked admin from ${u.userName}` : `${u.userName} is now an admin`);
      load(q);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggleSuspend = async (u) => {
    setBusyId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/suspend`, { isSuspended: !u.isSuspended });
      toast.success(u.isSuspended ? `${u.userName} can sign in again` : `${u.userName} was suspended`);
      load(q);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack">
      <h1 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Users</h1>

      <div className="admin-toolbar">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search by name or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <p className="error-text">{error}</p>}
      {!rows && !error && <Skeleton h={220} />}
      {rows && rows.length === 0 && <div className="card"><p style={{ margin: 0 }}>No users match “{q}”.</p></div>}

      {rows && rows.length > 0 && (
        <div className="admin-tablewrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Rating</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} style={u.isSuspended ? { opacity: 0.6 } : undefined}>
                  <td>
                    <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <Avatar name={u.userName} size={26} />
                      <Link to={`/u/${u.id}`} style={{ fontWeight: 600, color: 'var(--text)' }}>{u.userName}</Link>
                      <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{u.phoneNumber}</span>
                      {u.isSuspended && <span className="badge badge-danger">Suspended</span>}
                    </span>
                  </td>
                  <td>{u.isAdmin ? <span className="badge badge-brand">Admin</span> : 'Member'}</td>
                  <td>
                    {u.phoneVerified ? <span className="badge badge-ok">Verified</span> : <span className="badge badge-muted">Unverified</span>}
                  </td>
                  <td className="muted">{u.ratingCount ? `★ ${u.ratingAvg.toFixed(1)}` : '—'}</td>
                  <td className="muted">{new Date(u.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busyId === u.id || u.id === me.id}
                        onClick={() => toggleAdmin(u)}
                        title={u.id === me.id ? "You can't change your own admin access" : undefined}
                      >
                        {u.isAdmin ? 'Revoke admin' : 'Make admin'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busyId === u.id || u.id === me.id}
                        onClick={() => toggleSuspend(u)}
                        title={u.id === me.id ? "You can't suspend yourself" : undefined}
                      >
                        {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
