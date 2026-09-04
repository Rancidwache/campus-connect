import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// Heart toggle. `variant="icon"` for the floating heart on a card;
// `variant="button"` for a labelled button on the detail page.
export default function FavoriteButton({ listingId, favorited, variant = 'icon', onChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [on, setOn] = useState(Boolean(favorited));
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate('/login');
    setBusy(true);
    const next = !on;
    setOn(next); // optimistic
    try {
      const res = await api.post(`/listings/${listingId}/favorite`);
      setOn(res.favorited);
      onChange?.(res.favorited);
    } catch {
      setOn(!next); // revert
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'button') {
    return (
      <button className="btn btn-ghost" onClick={toggle} disabled={busy} aria-pressed={on}>
        {on ? '♥ Saved' : '♡ Save'}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={on ? 'Remove from saved' : 'Save listing'}
      aria-pressed={on}
      title={on ? 'Saved' : 'Save'}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(255,255,255,0.9)',
        color: on ? 'var(--cc-danger)' : 'var(--cc-muted)',
        fontSize: 16,
        lineHeight: 1,
        cursor: 'pointer',
        boxShadow: 'var(--cc-shadow)',
      }}
    >
      {on ? '♥' : '♡'}
    </button>
  );
}
