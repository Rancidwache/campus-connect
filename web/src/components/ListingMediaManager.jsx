import { useRef, useState } from 'react';
import { api, ApiError } from '../api/client.js';

const MAX_IMAGES = 5;

export default function ListingMediaManager({ listingId, images = [], video = null, onChange }) {
  const imgRef = useRef(null);
  const vidRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      const { listing } = await fn();
      onChange(listing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (imgRef.current) imgRef.current.value = '';
      if (vidRef.current) vidRef.current.value = '';
    }
  };

  const addImages = (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const fd = new FormData();
    files.slice(0, MAX_IMAGES - images.length).forEach((f) => fd.append('images', f));
    run(() => api.postForm(`/listings/${listingId}/images`, fd));
  };

  const setVideo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('video', file);
    run(() => api.postForm(`/listings/${listingId}/video`, fd));
  };

  const removeMedia = (mediaId) =>
    run(() => api.del(`/listings/${listingId}/media/${mediaId}`).then((r) => r));

  return (
    <div className="card stack" style={{ background: 'var(--cc-bg)', boxShadow: 'none' }}>
      <h3 style={{ margin: 0 }}>Photos &amp; video</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Up to {MAX_IMAGES} photos and one short video (≤60s, ≤50MB). Listings with a
        photo get far more interest.
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="row" style={{ gap: 8 }}>
        {images.map((img) => (
          <div key={img.id} style={{ position: 'relative' }}>
            <img
              src={img.url}
              alt=""
              style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--cc-line)' }}
            />
            <button
              type="button"
              onClick={() => removeMedia(img.id)}
              disabled={busy}
              aria-label="Remove photo"
              style={rmBtn}
            >
              ×
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: 96, height: 96, fontSize: '1.6rem' }}
            onClick={() => imgRef.current?.click()}
            disabled={busy}
          >
            +
          </button>
        )}
        <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={addImages} />
      </div>

      <div className="row" style={{ alignItems: 'center', gap: 8 }}>
        {video ? (
          <>
            <video src={video.url} controls style={{ width: 180, borderRadius: 8, background: '#000' }} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMedia(video.id)} disabled={busy}>
              Remove video
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => vidRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : 'Add a short video'}
          </button>
        )}
        <input ref={vidRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={setVideo} />
      </div>
    </div>
  );
}

const rmBtn = {
  position: 'absolute',
  top: -8,
  right: -8,
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '1px solid var(--cc-line)',
  background: '#fff',
  color: 'var(--cc-danger)',
  cursor: 'pointer',
  lineHeight: 1,
  fontSize: '1rem',
  fontWeight: 800,
  zIndex: 2,
  boxShadow: 'var(--cc-shadow)',
};
