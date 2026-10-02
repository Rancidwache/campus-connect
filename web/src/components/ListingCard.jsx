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
    <Link to={`/listings/${listing.id}`} className="listing-card card card-hover">
      <div className="listing-card__fav">
        <FavoriteButton listingId={listing.id} favorited={listing.favorited} />
      </div>

      <div className="listing-card__media">
        {cover ? (
          <img src={cover} alt="" className="listing-card__img" loading="lazy" />
        ) : (
          <div className="listing-card__img listing-card__placeholder" aria-hidden>
            {listing.categoryType === 'DIGITAL' ? '✦' : '⌾'}
          </div>
        )}
        <div className="listing-card__overlay">
          <CategoryBadge type={listing.categoryType} />
          <StatusBadge status={listing.status} />
          {listing.video && <span className="badge badge-muted" style={{ marginLeft: 'auto' }}>▶ Video</span>}
        </div>
      </div>

      <div className="listing-card__body">
        <h3 className="listing-card__title">{listing.title}</h3>
        <p className="muted" style={{ fontSize: 'var(--fs-xs)', margin: '4px 0 8px' }}>
          {listing.category}
          {listing.location ? ` · ${listing.location}` : ''}
        </p>
        <p className="listing-card__desc">{listing.description}</p>
        <div className="row-between" style={{ marginTop: 'auto', paddingTop: 10 }}>
          <span className="price">{KES.format(listing.price)}</span>
          <span className="stack" style={{ gap: 1, alignItems: 'flex-end' }}>
            <span className="faint" style={{ fontSize: 'var(--fs-xs)' }}>{listing.owner?.userName}</span>
            {listing.owner?.ratingCount > 0 && (
              <span className="row" style={{ gap: 3 }}>
                <Stars value={listing.owner.ratingAvg} size={11} />
                <span className="faint" style={{ fontSize: '0.7rem' }}>({listing.owner.ratingCount})</span>
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
