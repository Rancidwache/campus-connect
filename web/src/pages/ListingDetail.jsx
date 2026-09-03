import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CategoryBadge, StatusBadge, KES } from '../components/ListingCard.jsx';

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
        <p className="price" style={{ fontSize: '1.4rem' }}>
          {KES.format(listing.price)}
        </p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{listing.description}</p>

        <hr style={{ border: 0, borderTop: '1px solid var(--cc-line)' }} />

        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Offered by <strong>{listing.owner?.fullName}</strong>
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
            <button
              className="btn btn-primary"
              disabled
              title="HustleGuard escrow checkout arrives in Module 2"
            >
              Hire &amp; pay to escrow — coming soon
            </button>
            <p className="hint" style={{ marginTop: 0 }}>
              Module 2 adds the M-Pesa STK Push checkout and the encrypted chat thread with
              this provider.
            </p>
            {!user && (
              <p className="muted" style={{ fontSize: '0.9rem' }}>
                <Link to="/login">Sign in</Link> to hire once checkout is live.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
