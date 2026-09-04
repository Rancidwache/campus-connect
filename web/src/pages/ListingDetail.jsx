import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CategoryBadge, StatusBadge } from '../components/ListingCard.jsx';
import Stars from '../components/Stars.jsx';
import ReviewsSection from '../components/ReviewsSection.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import ReportButton from '../components/ReportButton.jsx';
import { KES } from '../lib/format.js';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/listings/${id}`, { auth: false })
      .then((res) => setListing(res.listing))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load listing'));
  }, [id]);

  const isOwner = user && listing && user.id === listing.owner?.id;

  const onDelete = async () => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.del(`/listings/${id}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
      setBusy(false);
    }
  };

  if (error) return <p className="error-text">{error}</p>;
  if (!listing) return <p className="muted">Loading…</p>;

  return (
    <div className="stack">
      <Link to="/browse" className="muted" style={{ fontSize: '0.9rem' }}>
        ← Back to listings
      </Link>

      <div className="card stack">
        <div className="row">
          <CategoryBadge type={listing.categoryType} />
          <StatusBadge status={listing.status} />
        </div>
        <h1 style={{ margin: 0 }}>{listing.title}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {listing.category}
          {listing.location ? ` • ${listing.location}` : ''}
        </p>

        <Gallery images={listing.images} video={listing.video} />

        <p className="price" style={{ fontSize: '1.4rem' }}>
          {KES.format(listing.price)}
        </p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{listing.description}</p>

        <hr style={{ border: 0, borderTop: '1px solid var(--cc-line)' }} />

        <p className="muted row" style={{ margin: 0, fontSize: '0.9rem', gap: 6, alignItems: 'center' }}>
          Offered by{' '}
          <Link to={`/u/${listing.owner?.id}`} style={{ fontWeight: 700 }}>
            {listing.owner?.fullName}
          </Link>
          {listing.owner?.ratingCount > 0 && (
            <>
              <Stars value={listing.owner.ratingAvg} size={13} />
              <span>({listing.owner.ratingCount})</span>
            </>
          )}
        </p>

        {isOwner ? (
          <div className="row">
            <Link to={`/listings/${listing.id}/edit`} className="btn btn-ghost">
              Edit listing
            </Link>
            <button className="btn btn-ghost" onClick={onDelete} disabled={busy}>
              Delete
            </button>
          </div>
        ) : (
          <div className="stack">
            <HirePanel listing={listing} user={user} />
            <div className="row">
              <FavoriteButton listingId={listing.id} favorited={listing.favorited} variant="button" />
              {user && listing.owner?.id && (
                <Link to={`/messages/${listing.owner.id}`} className="btn btn-ghost">
                  Message {listing.owner.fullName.split(' ')[0]} first
                </Link>
              )}
            </div>
            <ReportButton targetType="LISTING" targetId={listing.id} label="Report this listing" />
          </div>
        )}
      </div>

      {listing.owner?.id && (
        <ReviewsSection
          providerId={listing.owner.id}
          providerName={listing.owner.fullName.split(' ')[0]}
        />
      )}
    </div>
  );
}

function Gallery({ images = [], video }) {
  const [active, setActive] = useState(0);
  if (images.length === 0 && !video) return null;

  const showVideo = video && active === images.length;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 10',
          borderRadius: 'var(--cc-radius)',
          overflow: 'hidden',
          background: '#000',
          border: '1px solid var(--cc-line)',
        }}
      >
        {showVideo ? (
          <video src={video.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : images[active] ? (
          <img
            src={images[active].url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
      </div>
      {(images.length + (video ? 1 : 0)) > 1 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              style={thumb(active === i)}
            >
              <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
          {video && (
            <button type="button" onClick={() => setActive(images.length)} style={thumb(showVideo)}>
              <span style={{ fontSize: 18 }}>▶</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const thumb = (activeState) => ({
  width: 60,
  height: 60,
  borderRadius: 8,
  overflow: 'hidden',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--cc-bg)',
  border: activeState ? '2px solid var(--cc-teal-600)' : '1px solid var(--cc-line)',
});

function HirePanel({ listing, user }) {
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Pre-fill the phone once the profile arrives (if the user hasn't typed).
  useEffect(() => {
    if (user?.phoneNumber && !phoneEdited) setPhone(user.phoneNumber);
  }, [user?.phoneNumber, phoneEdited]);

  useEffect(() => {
    if (!open || quote) return;
    api
      .get(`/transactions/quote?listingId=${listing.id}`)
      .then(setQuote)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not get a quote'));
  }, [open, quote, listing.id]);

  if (!user) {
    return (
      <p className="muted" style={{ fontSize: '0.9rem' }}>
        <Link to="/login">Sign in</Link> to hire this and pay into M-Pesa escrow.
      </p>
    );
  }

  if (!user.phoneVerified) {
    return (
      <p className="muted" style={{ fontSize: '0.9rem' }}>
        <Link to="/verify">Verify your phone number</Link> to hire — it's the number M-Pesa
        will charge.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="stack">
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          Hire &amp; pay to escrow
        </button>
        <p className="hint" style={{ marginTop: 0 }}>
          Your payment is held by HustleGuard and only released to the provider once you
          approve delivery.
        </p>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { transaction } = await api.post('/transactions', { listingId: listing.id, phone });
      navigate(`/orders/${transaction.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the payment');
      setBusy(false);
    }
  };

  return (
    <div className="card stack" style={{ background: 'var(--cc-bg)', boxShadow: 'none' }}>
      <h3 style={{ margin: 0 }}>Hire &amp; pay to escrow</h3>

      {quote ? (
        <div>
          <div className="row-between" style={{ padding: '2px 0' }}>
            <span>Provider fee</span>
            <span>{KES.format(quote.feeAmount)}</span>
          </div>
          <div className="row-between" style={{ padding: '2px 0' }}>
            <span>Platform fee ({quote.feeRatePct}%)</span>
            <span>{KES.format(quote.platformFee)}</span>
          </div>
          <div
            className="row-between"
            style={{ padding: '6px 0 0', fontWeight: 800, color: 'var(--cc-ink)' }}
          >
            <span>You pay now</span>
            <span>{KES.format(quote.amount)}</span>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>Getting a quote…</p>
      )}

      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="hirephone">M-Pesa number to charge</label>
        <input
          id="hirephone"
          className="input"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setPhoneEdited(true);
          }}
          inputMode="tel"
        />
        <p className="hint">You'll get an STK Push prompt — enter your PIN to pay into escrow.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="row">
        <button className="btn btn-primary" onClick={submit} disabled={busy || !quote}>
          {busy ? 'Sending prompt…' : `Send M-Pesa prompt`}
        </button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
