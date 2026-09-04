import { Link } from 'react-router-dom';
import { KES } from '../lib/format.js';
import Stars from './Stars.jsx';
import FavoriteButton from './FavoriteButton.jsx';

export function CategoryBadge({ type }) {
  const digital = type === 'DIGITAL';
  return (
    <span className={`badge ${digital ? 'badge-digital' : 'badge-physical'}`}>
      {digital ? 'Digital' : 'Physical'}
    </span>
  );
}

export function StatusBadge({ status }) {
  if (status === 'ACTIVE') return null;
  return <span className="badge badge-muted">{status}</span>;
}

export default function ListingCard({ listing }) {
  const cover = listing.images?.[0]?.url;
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="card"
      style={{ textDecoration: 'none', display: 'block', padding: 0, overflow: 'hidden', position: 'relative' }}
    >
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
        <FavoriteButton listingId={listing.id} favorited={listing.favorited} />
      </div>
      <div
        style={{
          height: 150,
          background: cover ? `center/cover no-repeat url(${JSON.stringify(cover)})` : 'var(--cc-teal-50)',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          padding: 10,
        }}
      >
        <CategoryBadge type={listing.categoryType} />
        <StatusBadge status={listing.status} />
        {listing.video && (
          <span className="badge badge-muted" style={{ marginLeft: 'auto' }}>▶ Video</span>
        )}
      </div>
      <div style={{ padding: 'var(--cc-s4) var(--cc-s5) var(--cc-s5)' }}>
      <h3 style={{ marginBottom: 6 }}>{listing.title}</h3>
      <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
        {listing.category}
        {listing.location ? ` • ${listing.location}` : ''}
      </p>
      <p style={{ fontSize: '0.9rem', color: 'var(--cc-body)', marginBottom: 12 }}>
        {listing.description.length > 110
          ? `${listing.description.slice(0, 110)}…`
          : listing.description}
      </p>
      <div className="row-between">
        <span className="price">{KES.format(listing.price)}</span>
        <span className="stack" style={{ gap: 2, alignItems: 'flex-end' }}>
          <span className="muted" style={{ fontSize: '0.8rem' }}>{listing.owner?.fullName}</span>
          {listing.owner?.ratingCount > 0 && (
            <span className="row" style={{ gap: 4, alignItems: 'center' }}>
              <Stars value={listing.owner.ratingAvg} size={11} />
              <span className="muted" style={{ fontSize: '0.72rem' }}>({listing.owner.ratingCount})</span>
            </span>
          )}
        </span>
      </div>
      </div>
    </Link>
  );
}
