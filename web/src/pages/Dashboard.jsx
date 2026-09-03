import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import ListingCard from '../components/ListingCard.jsx';

export default function Dashboard() {
  const [listings, setListings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/listings?mine=true&pageSize=50')
      .then((res) => setListings(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your listings'));
  }, []);

  return (
    <div className="stack">
      <div className="row-between">
        <h1 style={{ margin: 0 }}>My listings</h1>
        <Link to="/listings/new" className="btn btn-primary btn-sm">
          Post a listing
        </Link>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!listings && !error && <p className="muted">Loading…</p>}

      {listings && listings.length === 0 && (
        <div className="card">
          <p style={{ marginBottom: 12 }}>You haven't posted anything yet.</p>
          <Link to="/listings/new" className="btn btn-primary">
            Create your first listing
          </Link>
        </div>
      )}

      {listings && listings.length > 0 && (
        <div className="grid-listings">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
