import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import ListingCard from '../components/ListingCard.jsx';

export default function Saved() {
  const [listings, setListings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/listings/saved?pageSize=50')
      .then((res) => setListings(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load saved listings'));
  }, []);

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Saved listings</h1>
      {error && <p className="error-text">{error}</p>}
      {!listings && !error && <p className="muted">Loading…</p>}

      {listings && listings.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>
            Nothing saved yet. Tap the ♡ on any listing to keep it here.{' '}
            <Link to="/browse">Browse listings</Link>.
          </p>
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
