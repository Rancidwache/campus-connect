import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { api, ApiError } from '../api/client.js';
import ListingCard from '../components/ListingCard.jsx';
import { ListingCardSkeleton } from '../components/Skeleton.jsx';
import { Stagger, StaggerItem } from '../components/motion.jsx';
import { CATEGORIES } from '../lib/categories.js';

const TYPES = [
  { value: '', label: 'All types' },
  { value: 'DIGITAL', label: 'Digital skills' },
  { value: 'PHYSICAL', label: 'Physical / gear' },
];
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];
const CURATED = CATEGORIES.map((c) => c.name);

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [facets, setFacets] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const q = params.get('q') || '';
  const categoryType = params.get('categoryType') || '';
  const category = params.get('category') || '';
  const location = params.get('location') || '';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || '1');

  const anyFilter = q || categoryType || category || location || minPrice || maxPrice;

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, v);
    });
    if (!('page' in patch)) next.set('page', '1');
    setParams(next);
  };

  useEffect(() => {
    api.get('/listings/categories', { auth: false }).then((r) => setFacets(r.categories)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = new URLSearchParams();
      if (q) s.set('q', q);
      if (categoryType) s.set('categoryType', categoryType);
      if (category) s.set('category', category);
      if (location) s.set('location', location);
      if (minPrice) s.set('minPrice', minPrice);
      if (maxPrice) s.set('maxPrice', maxPrice);
      s.set('sort', sort);
      s.set('page', String(page));
      s.set('pageSize', '12');
      setResult(await api.get(`/listings?${s.toString()}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load listings');
    } finally {
      setLoading(false);
    }
  }, [q, categoryType, category, location, minPrice, maxPrice, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Curated categories + any extras that actually have listings.
  const countOf = (name) => facets.find((f) => f.category?.toLowerCase() === name.toLowerCase())?.count || 0;
  const extras = facets.map((f) => f.category).filter((c) => !CURATED.some((n) => n.toLowerCase() === c.toLowerCase()));
  const chips = [...CURATED, ...extras];

  return (
    <div className="stack-6">
      <div className="row-between">
        <h1 style={{ margin: 0 }}>Browse</h1>
        {result && (
          <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
            {result.pagination.total} listing{result.pagination.total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          setParam({
            q: e.target.q.value.trim(),
            location: e.target.location.value.trim(),
            minPrice: e.target.minPrice.value,
            maxPrice: e.target.maxPrice.value,
          });
        }}
      >
        <div className="field">
          <input id="q" name="q" className="input" defaultValue={q} placeholder="Search — camera, tutoring, logo design…" />
        </div>
        <div style={filterGrid}>
          <select className="select" value={categoryType} onChange={(e) => setParam({ categoryType: e.target.value })} aria-label="Type">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input name="location" className="input" defaultValue={location} placeholder="Location" aria-label="Location" />
          <input name="minPrice" className="input" type="number" min="0" defaultValue={minPrice} placeholder="Min KES" aria-label="Min price" />
          <input name="maxPrice" className="input" type="number" min="0" defaultValue={maxPrice} placeholder="Max KES" aria-label="Max price" />
          <select className="select" value={sort} onChange={(e) => setParam({ sort: e.target.value })} aria-label="Sort">
            {SORTS.map((sopt) => <option key={sopt.value} value={sopt.value}>{sopt.label}</option>)}
          </select>
          <button className="btn btn-primary">Apply</button>
        </div>
      </form>

      <div className="chip-row">
        <button className={`chip ${!category ? 'is-active' : ''}`} onClick={() => setParam({ category: '' })}>
          All
        </button>
        {chips.map((name) => {
          const c = countOf(name);
          if (name !== category && c === 0) return null;
          return (
            <button
              key={name}
              className={`chip ${category === name ? 'is-active' : ''}`}
              aria-pressed={category === name}
              onClick={() => setParam({ category: category === name ? '' : name })}
            >
              {name}
              {c > 0 && <span style={{ opacity: 0.7 }}>{c}</span>}
            </button>
          );
        })}
        {anyFilter && (
          <button className="linkbtn" style={{ marginLeft: 'auto', alignSelf: 'center' }} onClick={() => setParams({})}>
            Clear all
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading && (
        <div className="grid-listings">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      )}

      {result && !loading && (
        <>
          {result.data.length === 0 ? (
            <div className="empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <p style={{ margin: 0 }}>No listings match those filters yet.</p>
              {anyFilter && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setParams({})}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <Stagger className="grid-listings" gap={0.04} key={params.toString()}>
                {result.data.map((l) => (
                  <StaggerItem key={l.id}>
                    <ListingCard listing={l} />
                  </StaggerItem>
                ))}
              </Stagger>
            </AnimatePresence>
          )}

          {result.pagination.totalPages > 1 && (
            <div className="row-between" style={{ marginTop: 4 }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>
                ← Previous
              </button>
              <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
                Page {result.pagination.page} of {result.pagination.totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= result.pagination.totalPages}
                onClick={() => setParam({ page: String(page + 1) })}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const filterGrid = {
  display: 'grid',
  gap: 'var(--sp-2)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  marginTop: 'var(--sp-3)',
};
