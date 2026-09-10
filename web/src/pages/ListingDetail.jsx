import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { CategoryBadge, StatusBadge } from '../components/ListingCard.jsx';
import Stars from '../components/Stars.jsx';
import Avatar from '../components/Avatar.jsx';
import ReviewsSection from '../components/ReviewsSection.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import ReportButton from '../components/ReportButton.jsx';
import Skeleton, { SkeletonText } from '../components/Skeleton.jsx';
import { KES } from '../lib/format.js';

const EASE = [0.22, 1, 0.36, 1];

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [listing, setListing] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setListing(null);
    api
      .get(`/listings/${id}`, { auth: false })
      .then((res) => setListing(res.listing))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load listing'));
  }, [id]);

  const isOwner = user && listing && user.id === listing.owner?.id;

  const onDelete = async () => {
    if (!confirm('Remove this listing?')) return;
    setBusy(true);
    try {
      await api.del(`/listings/${id}`);
      toast.success('Listing removed');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
      setBusy(false);
    }
  };

  if (error) return <p className="error-text">{error}</p>;

  if (!listing) {
    return (
      <div className="detail-grid">
        <div className="stack">
          <Skeleton h={280} r="var(--r-lg)" />
          <Skeleton h={22} w="70%" />
          <SkeletonText lines={4} />
        </div>
        <Skeleton h={260} r="var(--r-lg)" />
      </div>
    );
  }

  return (
    <div className="stack-6">
      <Link to="/browse" className="chip" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
        ← Browse
      </Link>

      <div className="detail-grid">
        {/* Left column */}
        <div className="stack">
          <div className="row" style={{ gap: 8 }}>
            <CategoryBadge type={listing.categoryType} />
            <StatusBadge status={listing.status} />
          </div>
          <h1 style={{ margin: 0 }}>{listing.title}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
            {listing.category}
            {listing.location ? ` · ${listing.location}` : ''}
          </p>

          <Gallery images={listing.images} video={listing.video} />

          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{listing.description}</p>

          <hr className="divider" />

          <Link to={`/u/${listing.owner?.id}`} className="row" style={{ gap: 10, textDecoration: 'none' }}>
            <Avatar src={listing.owner?.avatarUrl} name={listing.owner?.fullName} size={40} />
            <span className="stack" style={{ gap: 1 }}>
              <strong style={{ color: 'var(--text)' }}>{listing.owner?.fullName}</strong>
              {listing.owner?.ratingCount > 0 ? (
                <span className="row" style={{ gap: 5 }}>
                  <Stars value={listing.owner.ratingAvg} size={12} />
                  <span className="faint" style={{ fontSize: 'var(--fs-xs)' }}>
                    {listing.owner.ratingAvg.toFixed(1)} · {listing.owner.ratingCount} review
                    {listing.owner.ratingCount === 1 ? '' : 's'}
                  </span>
                </span>
              ) : (
                <span className="faint" style={{ fontSize: 'var(--fs-xs)' }}>No reviews yet</span>
              )}
            </span>
          </Link>
        </div>

        {/* Right column — sticky action panel */}
        <div className="detail-aside">
          <div className="card stack">
            <div className="row-between">
              <span className="price" style={{ fontSize: 'var(--fs-lg)' }}>
                {KES.format(listing.price)}
              </span>
              {!isOwner && (
                <FavoriteButton listingId={listing.id} favorited={listing.favorited} variant="button" />
              )}
            </div>

            {isOwner ? (
              <div className="stack-2">
                <Link to={`/listings/${listing.id}/edit`} className="btn btn-primary btn-block">
                  Edit listing
                </Link>
                <button className="btn btn-ghost btn-block" onClick={onDelete} disabled={busy}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                <HirePanel listing={listing} user={user} />
                {user && listing.owner?.id && (
                  <Link to={`/messages/${listing.owner.id}`} className="btn btn-ghost btn-block">
                    Message {listing.owner.fullName.split(' ')[0]} first
                  </Link>
                )}
                <div style={{ textAlign: 'center' }}>
                  <ReportButton targetType="LISTING" targetId={listing.id} label="Report this listing" />
                </div>
              </>
            )}
          </div>
        </div>
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
  if (images.length === 0 && !video) {
    return (
      <div
        style={{
          aspectRatio: '16 / 10',
          borderRadius: 'var(--r-lg)',
          background: 'var(--brand-soft)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--brand)',
          fontSize: '3rem',
          border: '1px solid var(--border)',
        }}
        aria-hidden
      >
        ✦
      </div>
    );
  }

  const total = images.length + (video ? 1 : 0);
  const showVideo = video && active === images.length;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div
        style={{
          aspectRatio: '16 / 10',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          background: '#000',
          border: '1px solid var(--border)',
        }}
      >
        <AnimatePresence mode="wait">
          {showVideo ? (
            <motion.video
              key="video"
              src={video.url}
              controls
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <motion.img
              key={active}
              src={images[active]?.url}
              alt=""
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </AnimatePresence>
      </div>

      {total > 1 && (
        <div className="row" style={{ gap: 6 }}>
          {images.map((img, i) => (
            <button key={img.id} type="button" onClick={() => setActive(i)} style={thumb(active === i)}>
              <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
          {video && (
            <button type="button" onClick={() => setActive(images.length)} style={thumb(showVideo)}>
              <span style={{ fontSize: 16 }}>▶</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const thumb = (isActive) => ({
  width: 56,
  height: 56,
  borderRadius: 'var(--r-sm)',
  overflow: 'hidden',
  padding: 0,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  background: 'var(--surface-2)',
  color: 'var(--text-dim)',
  border: isActive ? '2px solid var(--brand)' : '1px solid var(--border)',
  transition: 'border-color var(--dur-1) var(--ease-out)',
});

function HirePanel({ listing, user }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quote, setQuote] = useState(null);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.phoneNumber && !phoneEdited) setPhone(user.phoneNumber);
  }, [user?.phoneNumber, phoneEdited]);

  useEffect(() => {
    if (!open || quote) return;
    api
      .get(`/transactions/quote?listingId=${listing.id}`)
      .then(setQuote)
      .catch(() => toast.error('Could not get a quote'));
  }, [open, quote, listing.id, toast]);

  if (!user) {
    return (
      <Link to="/login" className="btn btn-primary btn-block">
        Sign in to hire
      </Link>
    );
  }
  if (!user.phoneVerified) {
    return (
      <Link to="/verify" className="btn btn-primary btn-block">
        Verify your phone to hire
      </Link>
    );
  }

  if (!open) {
    return (
      <div className="stack-2">
        <button className="btn btn-primary btn-block btn-lg" onClick={() => setOpen(true)}>
          Hire &amp; pay to escrow
        </button>
        <p className="hint" style={{ marginTop: 0, textAlign: 'center' }}>
          Held by HustleGuard — released only when you approve delivery.
        </p>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      const { transaction } = await api.post('/transactions', { listingId: listing.id, phone });
      navigate(`/orders/${transaction.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start the payment');
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="card-inset stack"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3, ease: EASE }}
      style={{ overflow: 'hidden' }}
    >
      {quote ? (
        <div className="stack-2">
          <Row label="Provider fee" value={KES.format(quote.feeAmount)} />
          <Row label={`Platform fee (${quote.feeRatePct}%)`} value={KES.format(quote.platformFee)} />
          <hr className="divider" />
          <div className="row-between" style={{ fontWeight: 800, color: 'var(--text)' }}>
            <span>You pay now</span>
            <span>{KES.format(quote.amount)}</span>
          </div>
        </div>
      ) : (
        <SkeletonText lines={3} />
      )}

      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="hirephone" className="field-label">M-Pesa number</label>
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
        <p className="hint">You'll get an STK Push — enter your PIN to pay in.</p>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary grow" onClick={submit} disabled={busy || !quote}>
          {busy ? <span className="spinner" /> : 'Send M-Pesa prompt'}
        </button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function Row({ label, value }) {
  return (
    <div className="row-between" style={{ fontSize: 'var(--fs-sm)' }}>
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
