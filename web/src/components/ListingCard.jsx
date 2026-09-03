import { Link } from 'react-router-dom';
import { KES } from '../lib/format.js';

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
  return (
    <Link to={`/listings/${listing.id}`} className="card" style={{ textDecoration: 'none', display: 'block' }}>
      <div className="row" style={{ marginBottom: 10 }}>
        <CategoryBadge type={listing.categoryType} />
        <StatusBadge status={listing.status} />
      </div>
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
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          {listing.owner?.fullName}
        </span>
      </div>
    </Link>
  );
}
