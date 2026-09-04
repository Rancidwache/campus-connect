import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import SocialLinks from '../components/SocialLinks.jsx';
import ListingCard from '../components/ListingCard.jsx';
import Stars from '../components/Stars.jsx';
import ReviewsSection from '../components/ReviewsSection.jsx';
import ReportButton from '../components/ReportButton.jsx';

export default function PublicProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setProfile(null);
    setListings(null);
    setError(null);
    api
      .get(`/users/${id}`, { auth: false })
      .then((res) => setProfile(res.user))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this profile'));
    api
      .get(`/users/${id}/listings?pageSize=50`, { auth: false })
      .then((res) => setListings(res.data))
      .catch(() => setListings([]));
  }, [id]);

  if (error) return <p className="error-text">{error}</p>;
  if (!profile) return <p className="muted">Loading…</p>;

  const isMe = me?.id === profile.id;
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="stack">
      <div className="card stack">
        <div className="row" style={{ alignItems: 'center', gap: 16 }}>
          <Avatar src={profile.avatarUrl} name={profile.fullName} size={80} />
          <div className="stack" style={{ gap: 4 }}>
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{profile.fullName}</h1>
              {profile.phoneVerified && <span className="badge badge-ok">Phone verified</span>}
            </div>
            {profile.ratingCount > 0 && (
              <span className="row" style={{ gap: 6, alignItems: 'center' }}>
                <Stars value={profile.ratingAvg} size={15} />
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {profile.ratingAvg.toFixed(1)} ({profile.ratingCount})
                </span>
              </span>
            )}
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Member since {memberSince} • {profile.activeListingCount} active listing
              {profile.activeListingCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {profile.bio && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}
        <SocialLinks socials={profile.socials} />

        <div className="row">
          {isMe ? (
            <Link to="/profile" className="btn btn-ghost btn-sm">Edit profile</Link>
          ) : (
            me && (
              <Link to={`/messages/${profile.id}`} className="btn btn-ghost btn-sm">
                💬 Message {profile.fullName.split(' ')[0]}
              </Link>
            )
          )}
        </div>
        {!isMe && <ReportButton targetType="USER" targetId={profile.id} label="Report this user" />}
      </div>

      <h2 style={{ margin: '4px 0' }}>Listings</h2>
      {!listings && <p className="muted">Loading…</p>}
      {listings && listings.length === 0 && (
        <div className="card"><p style={{ margin: 0 }}>No active listings.</p></div>
      )}
      {listings && listings.length > 0 && (
        <div className="grid-listings">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      <ReviewsSection providerId={profile.id} providerName={profile.fullName.split(' ')[0]} />
    </div>
  );
}
