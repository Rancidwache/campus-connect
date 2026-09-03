import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

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
      navigate(state?.from || '/browse', { replace: true });
    } catch (err) {
      // An unverified account returns 403 + needsVerification — send them to verify.
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
    <div className="card center-narrow">
      <h1>Sign in</h1>
      <form onSubmit={onSubmit} className="stack" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            className="input"
            value={form.phoneNumber}
            onChange={update('phoneNumber')}
            placeholder="0712345678"
            inputMode="tel"
            required
            autoComplete="tel"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
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

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="muted" style={{ fontSize: '0.9rem', marginTop: 16 }}>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
