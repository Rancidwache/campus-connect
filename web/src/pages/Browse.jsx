import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import ListingCard from '../components/ListingCard.jsx';

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

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const q = params.get('q') || '';
  const categoryType = params.get('categoryType') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || '1');

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, v);
    });
    if (!('page' in patch)) next.set('page', '1');
    setParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const search = new URLSearchParams();
      if (q) search.set('q', q);
      if (categoryType) search.set('categoryType', categoryType);
      search.set('sort', sort);
      search.set('page', String(page));
      search.set('pageSize', '12');
      const res = await api.get(`/listings?${search.toString()}`, { auth: false });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load listings');
    } finally {
      setLoading(false);
    }
  }, [q, categoryType, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="stack">
      <div className="row-between">
        <h1 style={{ margin: 0 }}>Browse listings</h1>
      </div>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          setParam({ q: e.target.q.value.trim() });
        }}
      >
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="q">Search</label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={q}
            placeholder="camera, tutoring, logo design…"
          />
        </div>
        <div className="row">
          <div className="field" style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label htmlFor="type">Type</label>
            <select
              id="type"
              className="select"
              value={categoryType}
              onChange={(e) => setParam({ categoryType: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label htmlFor="sort">Sort</label>
            <select
              id="sort"
              className="select"
              value={sort}
              onChange={(e) => setParam({ sort: e.target.value })}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary">Search</button>
          </div>
        </div>
      </form>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error-text">{error}</p>}

      {result && !loading && (
        <>
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            {result.pagination.total} listing{result.pagination.total === 1 ? '' : 's'}
          </p>
          {result.data.length === 0 ? (
            <div className="card">
              <p style={{ margin: 0 }}>No listings match that search yet.</p>
            </div>
          ) : (
            <div className="grid-listings">
              {result.data.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}

          {result.pagination.totalPages > 1 && (
            <div className="row-between" style={{ marginTop: 16 }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setParam({ page: String(page - 1) })}
              >
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
