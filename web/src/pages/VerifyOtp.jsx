import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from '../components/AuthShell.jsx';

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
      navigate(res.user.isAdmin ? '/admin' : '/browse', { replace: true });
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
    <AuthShell
      title="Verify your phone"
      subtitle={<>Enter the 6-digit code we sent by SMS to <strong>{phoneNumber || 'your number'}</strong>.</>}
      footer={<Link to="/login">Back to sign in</Link>}
    >
      {devCode && (
        <span className="badge badge-ok" style={{ alignSelf: 'flex-start' }}>
          Dev code: {devCode}
        </span>
      )}

      <form onSubmit={onSubmit} className="stack">
        {!state?.phoneNumber && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="phone" className="field-label">Phone number</label>
            <input
              id="phone"
              className="input"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0712 345 678"
              inputMode="tel"
              required
            />
          </div>
        )}
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="code" className="field-label">Verification code</label>
          <input
            id="code"
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="• • • • • •"
            style={{ letterSpacing: '0.3em', fontSize: 'var(--fs-md)', textAlign: 'center' }}
            required
          />
        </div>

        {error && <p className="error-text">{error}</p>}
        {info && <span className="badge badge-ok" style={{ alignSelf: 'flex-start' }}>{info}</span>}

        <button className="btn btn-primary btn-block btn-lg" disabled={busy || code.length !== 6}>
          {busy ? <span className="spinner" /> : 'Verify and continue'}
        </button>
        <button className="linkbtn" onClick={resend} type="button" style={{ alignSelf: 'center' }}>
          Resend code
        </button>
      </form>
    </AuthShell>
  );
}
