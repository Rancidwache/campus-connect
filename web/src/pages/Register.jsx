import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post('/auth/register', form, { auth: false });
      navigate('/verify', {
        state: { phoneNumber: form.phoneNumber, devCode: res.devCode },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card center-narrow">
      <h1>Create your account</h1>
      <p className="muted" style={{ fontSize: '0.9rem' }}>
        We send a one-time code by SMS to verify your phone. That same verified number is
        what M-Pesa uses to pay you.
      </p>

      <form onSubmit={onSubmit} className="stack" style={{ marginTop: 16 }}>
        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            className="input"
            value={form.fullName}
            onChange={update('fullName')}
            required
            autoComplete="name"
          />
        </div>
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
          <p className="hint">Kenyan number — 07…, 01…, or +254…</p>
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
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

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="muted" style={{ margintop: 16, fontSize: '0.9rem', marginTop: 16 }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
