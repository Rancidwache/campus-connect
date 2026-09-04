import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import ListingMediaManager from '../components/ListingMediaManager.jsx';
import { CATEGORIES } from '../lib/categories.js';

const EMPTY = {
  categoryType: 'DIGITAL',
  category: '',
  title: '',
  description: '',
  price: '',
  location: '',
};

export default function ListingForm({ mode }) {
  const editing = mode === 'edit';
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('ACTIVE');
  const [media, setMedia] = useState({ images: [], video: null });
  const [error, setError] = useState(null);
  const [details, setDetails] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/listings/${id}`, { auth: false })
      .then(({ listing }) => {
        setForm({
          categoryType: listing.categoryType,
          category: listing.category,
          title: listing.title,
          description: listing.description,
          price: String(listing.price),
          location: listing.location || '',
        });
        setStatus(listing.status);
        setMedia({ images: listing.images || [], video: listing.video || null });
        setLoaded(true);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load listing'));
  }, [editing, id]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setDetails([]);
    setBusy(true);
    const payload = {
      ...form,
      price: Number(form.price),
      location: form.location.trim() || undefined,
    };
    try {
      if (editing) {
        const { listing } = await api.patch(`/listings/${id}`, { ...payload, status });
        navigate(`/listings/${listing.id}`);
      } else {
        const { listing } = await api.post('/listings', payload);
        // Straight to edit so the seller can add photos/video against a real id.
        navigate(`/listings/${listing.id}/edit`, { state: { justCreated: true } });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setDetails(err.details || []);
      } else {
        setError('Something went wrong');
      }
      setBusy(false);
    }
  };

  if (!loaded) return <p className="muted">Loading…</p>;

  return (
    <div className="stack center-narrow" style={{ maxWidth: 560 }}>
    <div className="card">
      <h1>{editing ? 'Edit listing' : 'Post a listing'}</h1>

      <form onSubmit={onSubmit} className="stack" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="categoryType">Type</label>
          <select
            id="categoryType"
            className="select"
            value={form.categoryType}
            onChange={update('categoryType')}
          >
            <option value="DIGITAL">Digital skill or service</option>
            <option value="PHYSICAL">Physical item / equipment for hire</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <input
            id="category"
            className="input"
            list="cc-categories"
            value={form.category}
            onChange={update('category')}
            placeholder="Start typing or pick one…"
            required
          />
          <datalist id="cc-categories">
            {CATEGORIES.filter((c) => !c.type || c.type === form.categoryType).map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            className="input"
            value={form.title}
            onChange={update('title')}
            placeholder="Short, clear summary of the offer"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="textarea"
            value={form.description}
            onChange={update('description')}
            placeholder="What's included, turnaround time, any deposit or ID requirements…"
            required
          />
        </div>

        <div className="row">
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="price">Price (KES)</label>
            <input
              id="price"
              className="input"
              type="number"
              min="1"
              step="1"
              value={form.price}
              onChange={update('price')}
              required
            />
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="location">Location (optional)</label>
            <input
              id="location"
              className="input"
              value={form.location}
              onChange={update('location')}
              placeholder="Nairobi, Online…"
            />
          </div>
        </div>

        {editing && (
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Active — visible in Browse</option>
              <option value="PAUSED">Paused — hidden</option>
              <option value="HIRED">Hired — currently booked</option>
            </select>
          </div>
        )}

        {error && (
          <div>
            <p className="error-text">{error}</p>
            {details.length > 0 && (
              <ul className="error-text" style={{ marginTop: 4 }}>
                {details.map((d, i) => (
                  <li key={i}>
                    {d.path}: {d.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}
        </button>
      </form>
    </div>

    {editing && (
      <>
        <ListingMediaManager
          listingId={Number(id)}
          images={media.images}
          video={media.video}
          onChange={(listing) => setMedia({ images: listing.images, video: listing.video })}
        />
        <button className="btn btn-ghost btn-block" onClick={() => navigate(`/listings/${id}`)}>
          Done — view listing
        </button>
      </>
    )}
    </div>
  );
}
