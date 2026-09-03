import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyOtp() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { applySession } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState(state?.phoneNumber || '');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(state?.devCode || null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post('/auth/verify-phone', { phoneNumber, code }, { auth: false });
      applySession(res.token, res.user);
      navigate('/browse', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    try {
      const res = await api.post('/auth/resend-code', { phoneNumber }, { auth: false });
      setDevCode(res.devCode || null);
      setInfo('A new code has been sent.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend the code');
    }
  };

  return (
    <div className="card center-narrow">
      <h1>Verify your phone</h1>
      <p className="muted" style={{ fontSize: '0.9rem' }}>
        Enter the 6-digit code we sent by SMS to <strong>{phoneNumber || 'your number'}</strong>.
      </p>

      {devCode && (
        <p className="badge badge-ok" style={{ marginBottom: 12 }}>
          Dev code: {devCode}
        </p>
      )}

      <form onSubmit={onSubmit} className="stack" style={{ marginTop: 8 }}>
        {!state?.phoneNumber && (
          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              className="input"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0712345678"
              inputMode="tel"
              required
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="code">Verification code</label>
          <input
            id="code"
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="123456"
            required
          />
        </div>

        {error && <p className="error-text">{error}</p>}
        {info && <p className="badge badge-ok">{info}</p>}

        <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
          {busy ? 'Verifying…' : 'Verify and continue'}
        </button>
      </form>

      <div className="row-between" style={{ marginTop: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={resend} type="button">
          Resend code
        </button>
        <Link to="/login" className="muted" style={{ fontSize: '0.9rem' }}>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
