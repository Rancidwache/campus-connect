import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import { SOCIAL_KEYS, SOCIAL_LABELS } from '../components/SocialLinks.jsx';
import {
  generateAndStoreKeypair,
  hasLocalKeypair,
  getLocalPublicKey,
} from '../lib/e2ee.js';

const PLACEHOLDER = {
  tiktok: '@handle',
  instagram: '@handle',
  whatsapp: '07XX XXX XXX',
  x: '@handle',
  facebook: 'page name or URL',
  youtube: '@channel',
  linkedin: 'profile id',
  website: 'example.co.ke',
};

export default function Profile() {
  const { user, setUser } = useAuth();

  const [form, setForm] = useState({
    fullName: user.fullName,
    bio: user.bio || '',
    socials: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, user.socials?.[k] || ''])),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const fileRef = useRef(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [keyBusy, setKeyBusy] = useState(false);
  const [keyMsg, setKeyMsg] = useState(null);
  const [keyErr, setKeyErr] = useState(null);
  const inSync = hasLocalKeypair() && user.publicKey && user.publicKey === getLocalPublicKey();

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const socials = Object.fromEntries(
        Object.entries(form.socials).filter(([, v]) => v.trim()),
      );
      const { user: updated } = await api.patch('/users/me', {
        fullName: form.fullName,
        bio: form.bio,
        socials,
      });
      setUser(updated);
      setForm((f) => ({
        ...f,
        socials: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, updated.socials?.[k] || ''])),
      }));
      setMsg('Saved.');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { user: updated } = await api.postForm('/users/me/avatar', fd);
      setUser(updated);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Avatar upload failed');
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      const { user: updated } = await api.del('/users/me/avatar');
      setUser(updated);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Could not remove avatar');
    } finally {
      setAvatarBusy(false);
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
    <div className="stack" style={{ maxWidth: 620 }}>
      <div className="row-between">
        <h1 style={{ margin: 0 }}>Your profile</h1>
        <Link to={`/u/${user.id}`} className="btn btn-ghost btn-sm">
          View public profile
        </Link>
      </div>

      <form className="card stack" onSubmit={saveProfile}>
        <div className="row" style={{ alignItems: 'center', gap: 16 }}>
          <Avatar src={user.avatarUrl} name={user.fullName} size={72} />
          <div className="stack" style={{ gap: 6 }}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
            >
              {avatarBusy ? 'Uploading…' : user.avatarUrl ? 'Change photo' : 'Add photo'}
            </button>
            {user.avatarUrl && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={removeAvatar} disabled={avatarBusy}>
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            className="input"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            minLength={2}
            required
          />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            className="textarea"
            style={{ minHeight: 80 }}
            maxLength={600}
            placeholder="A line or two about what you offer."
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Phone</label>
          <input className="input" value={user.phoneNumber} disabled />
          <p className="hint">
            {user.phoneVerified ? 'Verified' : 'Not verified'} — used for M-Pesa escrow.
          </p>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cc-ink)', marginBottom: 8 }}>
            Social links (optional)
          </legend>
          <div className="grid-listings" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
            {SOCIAL_KEYS.map((k) => (
              <div className="field" key={k} style={{ marginBottom: 0 }}>
                <label htmlFor={`s-${k}`} style={{ fontWeight: 500 }}>{SOCIAL_LABELS[k]}</label>
                <input
                  id={`s-${k}`}
                  className="input"
                  placeholder={PLACEHOLDER[k]}
                  value={form.socials[k]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, socials: { ...f.socials, [k]: e.target.value } }))
                  }
                />
              </div>
            ))}
          </div>
        </fieldset>

        {msg && <p className="muted" style={{ margin: 0 }}>{msg}</p>}
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
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
          <span className={`badge ${inSync ? 'badge-ok' : 'badge-muted'}`}>
            {inSync
              ? 'Key active on this device'
              : user.publicKey
                ? 'Key registered on another device'
                : 'No key yet'}
          </span>
        </p>
        {keyErr && <p className="error-text">{keyErr}</p>}
        {keyMsg && <p className="muted" style={{ margin: 0 }}>{keyMsg}</p>}
        <button className="btn btn-ghost" onClick={setupKey} disabled={keyBusy}>
          {keyBusy ? 'Generating…' : user.publicKey ? 'Regenerate key on this device' : 'Set up encrypted chat'}
        </button>
      </div>
    </div>
  );
}
