import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import AuthShell from '../components/AuthShell.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ userName: '', phoneNumber: '', password: '' });
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const mismatch = confirm.length > 0 && confirm !== form.password;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (confirm !== form.password) return;
    setBusy(true);
    try {
      const res = await api.post('/auth/register', form, { auth: false });
      navigate('/verify', { state: { phoneNumber: form.phoneNumber, devCode: res.devCode } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="We send a one-time code by SMS to verify your phone — the same number M-Pesa uses to pay you."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="stack">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="userName" className="field-label">Username</label>
          <input id="userName" className="input" value={form.userName} onChange={update('userName')} minLength={2} maxLength={120} required autoComplete="username" />
        </div>
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
          <p className="hint">Kenyan number — 07…, 01…, or +254…</p>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="password" className="field-label">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={form.password}
            onChange={update('password')}
            minLength={8}
            required
            autoComplete="new-password"
          />
          <p className="hint">At least 8 characters.</p>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="confirmPassword" className="field-label">Confirm password</label>
          <input
            id="confirmPassword"
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={mismatch}
            required
            autoComplete="new-password"
          />
          {mismatch && <p className="error-text" style={{ margin: '4px 0 0' }}>Passwords do not match.</p>}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
