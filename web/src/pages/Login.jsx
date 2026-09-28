import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from '../components/AuthShell.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { applySession } = useAuth();

  const [form, setForm] = useState({ phoneNumber: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post('/auth/login', form, { auth: false });
      applySession(res.token, res.user);
      navigate(state?.from || (res.user.isAdmin ? '/admin' : '/browse'), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        navigate('/verify', { state: { phoneNumber: form.phoneNumber } });
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to hire, get paid, and manage your listings."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} className="stack">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="phone" className="field-label">Phone number</label>
          <input
            id="phone"
            className="input"
            value={form.phoneNumber}
            onChange={update('phoneNumber')}
            placeholder="0712 345 678"
            inputMode="tel"
            required
            autoComplete="tel"
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="password" className="field-label">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={form.password}
            onChange={update('password')}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
