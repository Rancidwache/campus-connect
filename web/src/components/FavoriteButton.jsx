import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    setOn(next);
    try {
      const res = await api.post(`/listings/${listingId}/favorite`);
      setOn(res.favorited);
      onChange?.(res.favorited);
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  };

  const heart = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={on ? 'on' : 'off'}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: on ? [1.35, 1] : 1, opacity: 1 }}
        exit={{ scale: 0.4, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'inline-flex', color: on ? 'var(--danger)' : 'inherit' }}
      >
        {on ? '♥' : '♡'}
      </motion.span>
    </AnimatePresence>
  );

  if (variant === 'button') {
    return (
      <button className="btn btn-ghost" onClick={toggle} disabled={busy} aria-pressed={on}>
        {heart} {on ? 'Saved' : 'Save'}
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
        display: 'grid',
        placeItems: 'center',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        backdropFilter: 'blur(4px)',
        color: on ? 'var(--danger)' : 'var(--text-dim)',
        fontSize: 15,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {heart}
    </button>
  );
}
