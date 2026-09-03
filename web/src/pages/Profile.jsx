import { useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  generateAndStoreKeypair,
  hasLocalKeypair,
  getLocalPublicKey,
} from '../lib/e2ee.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user.fullName);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);

  const [keyBusy, setKeyBusy] = useState(false);
  const [keyMsg, setKeyMsg] = useState(null);
  const [keyErr, setKeyErr] = useState(null);

  const localReady = hasLocalKeypair();
  const serverKey = user.publicKey;
  const inSync = localReady && serverKey && serverKey === getLocalPublicKey();

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);
    try {
      const { user: updated } = await api.patch('/users/me', { fullName });
      setUser(updated);
      setNameMsg('Saved.');
    } catch (err) {
      setNameMsg(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setSavingName(false);
    }
  };

  const setupKey = async () => {
    setKeyBusy(true);
    setKeyErr(null);
    setKeyMsg(null);
    try {
      const publicKey = await generateAndStoreKeypair();
      const { user: updated } = await api.put('/users/me/public-key', { publicKey });
      setUser(updated);
      setKeyMsg('Encryption key registered on this device.');
    } catch (err) {
      setKeyErr(err instanceof ApiError ? err.message : 'Could not register the key');
    } finally {
      setKeyBusy(false);
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1>Your profile</h1>

      <form className="card stack" onSubmit={saveName}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            minLength={2}
            required
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Phone</label>
          <input className="input" value={user.phoneNumber} disabled />
          <p className="hint">
            {user.phoneVerified ? 'Verified' : 'Not verified'} — used for M-Pesa escrow.
          </p>
        </div>
        {nameMsg && <p className="muted" style={{ margin: 0 }}>{nameMsg}</p>}
        <button className="btn btn-primary" disabled={savingName}>
          {savingName ? 'Saving…' : 'Save name'}
        </button>
      </form>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>End-to-end encrypted chat</h3>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          This generates a key pair in your browser. The private key stays on this
          device; only the public key is sent to Campus Connect, so other users can
          start an encrypted conversation with you.
        </p>

        <p>
          <span
            className={`badge ${inSync ? 'badge-ok' : 'badge-muted'}`}
          >
            {inSync
              ? 'Key active on this device'
              : serverKey
                ? 'Key registered on another device'
                : 'No key yet'}
          </span>
        </p>

        {keyErr && <p className="error-text">{keyErr}</p>}
        {keyMsg && <p className="muted" style={{ margin: 0 }}>{keyMsg}</p>}

        <button className="btn btn-ghost" onClick={setupKey} disabled={keyBusy}>
          {keyBusy
            ? 'Generating…'
            : serverKey
              ? 'Regenerate key on this device'
              : 'Set up encrypted chat'}
        </button>
      </div>
    </div>
  );
}
