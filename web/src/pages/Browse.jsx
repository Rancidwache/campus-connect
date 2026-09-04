import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import ListingCard from '../components/ListingCard.jsx';
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
    <div className="stack">
      <h1 style={{ margin: 0 }}>Browse listings</h1>

      <form
        className="card stack"
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
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" className="input" defaultValue={q} placeholder="camera, tutoring, logo design…" />
        </div>
        <div className="row">
          <div className="field" style={{ flex: '1 1 150px', marginBottom: 0 }}>
            <label htmlFor="type">Type</label>
            <select id="type" className="select" value={categoryType} onChange={(e) => setParam({ categoryType: e.target.value })}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 150px', marginBottom: 0 }}>
            <label htmlFor="location">Location</label>
            <input id="location" name="location" className="input" defaultValue={location} placeholder="Nairobi, Online…" />
          </div>
          <div className="field" style={{ flex: '0 1 110px', marginBottom: 0 }}>
            <label htmlFor="minPrice">Min KES</label>
            <input id="minPrice" name="minPrice" className="input" type="number" min="0" defaultValue={minPrice} />
          </div>
          <div className="field" style={{ flex: '0 1 110px', marginBottom: 0 }}>
            <label htmlFor="maxPrice">Max KES</label>
            <input id="maxPrice" name="maxPrice" className="input" type="number" min="0" defaultValue={maxPrice} />
          </div>
          <div className="field" style={{ flex: '1 1 150px', marginBottom: 0 }}>
            <label htmlFor="sort">Sort</label>
            <select id="sort" className="select" value={sort} onChange={(e) => setParam({ sort: e.target.value })}>
              {SORTS.map((sopt) => <option key={sopt.value} value={sopt.value}>{sopt.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary">Apply</button>
          </div>
        </div>
      </form>

      <div className="row" style={{ gap: 6 }}>
        <button
          className={`btn btn-sm ${!category ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setParam({ category: '' })}
        >
          All
        </button>
        {chips.map((name) => {
          const c = countOf(name);
          if (name !== category && c === 0) return null; // hide empty curated chips
          return (
            <button
              key={name}
              className={`btn btn-sm ${category === name ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setParam({ category: category === name ? '' : name })}
            >
              {name}{c ? ` (${c})` : ''}
            </button>
          );
        })}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error-text">{error}</p>}

      {result && !loading && (
        <>
          <div className="row-between">
            <p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
              {result.pagination.total} listing{result.pagination.total === 1 ? '' : 's'}
            </p>
            {anyFilter && (
              <button className="linkbtn" onClick={() => setParams({})}>Clear filters</button>
            )}
          </div>

          {result.data.length === 0 ? (
            <div className="card"><p style={{ margin: 0 }}>No listings match those filters yet.</p></div>
          ) : (
            <div className="grid-listings">
              {result.data.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}

          {result.pagination.totalPages > 1 && (
            <div className="row-between" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>
                Previous
              </button>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                Page {result.pagination.page} of {result.pagination.totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= result.pagination.totalPages}
                onClick={() => setParam({ page: String(page + 1) })}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
