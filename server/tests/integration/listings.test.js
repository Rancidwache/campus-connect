import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { resetDb } from '../setup/pglite.js';
import { makeUser, makeListing, auth } from '../setup/factories.js';
import { createApp } from '../../src/app.js';

let app;
let alice;
let bob;

beforeAll(() => {
  app = createApp();
});
beforeEach(async () => {
  await resetDb();
  alice = await makeUser({ fullName: 'Alice A' });
  bob = await makeUser({ fullName: 'Bob B' });
});

describe('listings CRUD + guards', () => {
  it('creates, reads, updates and removes a listing', async () => {
    const create = await request(app)
      .post('/api/listings')
      .set(auth(alice))
      .send({ categoryType: 'PHYSICAL', category: 'Camera & Lenses', title: 'Canon R6 for weekend hire', description: 'Full-frame body plus 24-105 lens.', price: 3500, location: 'Westlands' });
    expect(create.status).toBe(201);
    const id = create.body.listing.id;

    const read = await request(app).get(`/api/listings/${id}`);
    expect(read.status).toBe(200);
    expect(read.body.listing.price).toBe(3500);
    expect(read.body.listing.images).toEqual([]);

    const patch = await request(app).patch(`/api/listings/${id}`).set(auth(alice)).send({ price: 3000, status: 'PAUSED' });
    expect(patch.body.listing.price).toBe(3000);
    expect(patch.body.listing.status).toBe('PAUSED');

    const del = await request(app).delete(`/api/listings/${id}`).set(auth(alice));
    expect(del.status).toBe(204);
    // soft-deleted -> gone from public view
    expect((await request(app).get(`/api/listings/${id}`)).status).toBe(404);
  });

  it("blocks editing someone else's listing", async () => {
    const l = await makeListing(alice);
    const res = await request(app).patch(`/api/listings/${l.id}`).set(auth(bob)).send({ price: 1 });
    expect(res.status).toBe(403);
  });

  it('requires a verified account to post', async () => {
    const unverified = await makeUser({ phoneVerified: false });
    const res = await request(app).post('/api/listings').set(auth(unverified)).send({
      categoryType: 'DIGITAL', category: 'Tutoring', title: 'Maths tutoring online', description: 'KCSE focused sessions.', price: 800,
    });
    expect(res.status).toBe(401);
  });
});

describe('browse: search, filters, facets', () => {
  beforeEach(async () => {
    await makeListing(alice, { title: 'Wedding photography package', category: 'Photography', categoryType: 'DIGITAL', price: 20000, location: 'Nairobi' });
    await makeListing(alice, { title: 'PA speaker hire', category: 'Audio & PA Gear', categoryType: 'PHYSICAL', price: 1800, location: 'Kasarani, Nairobi' });
    await makeListing(bob, { title: 'Keyboard hire weekly', category: 'Musical Instruments', categoryType: 'PHYSICAL', price: 1200, location: 'Ngong Road' });
  });

  it('full-text search hits title / category / location', async () => {
    expect((await request(app).get('/api/listings?q=photography')).body.data).toHaveLength(1);
    expect((await request(app).get('/api/listings?q=ngong')).body.data).toHaveLength(1);
  });

  it('filters by type, price range and location', async () => {
    const physical = await request(app).get('/api/listings?categoryType=PHYSICAL');
    expect(physical.body.data).toHaveLength(2);
    const cheap = await request(app).get('/api/listings?minPrice=1000&maxPrice=1500');
    expect(cheap.body.data.map((l) => l.price)).toEqual([1200]);
    const nairobi = await request(app).get('/api/listings?location=nairobi');
    expect(nairobi.body.data).toHaveLength(2);
  });

  it('sorts by price', async () => {
    const asc = await request(app).get('/api/listings?sort=price_asc');
    const prices = asc.body.data.map((l) => l.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('category facet returns active categories with counts', async () => {
    const res = await request(app).get('/api/listings/categories');
    const map = Object.fromEntries(res.body.categories.map((c) => [c.category, c.count]));
    expect(map).toMatchObject({ Photography: 1, 'Audio & PA Gear': 1, 'Musical Instruments': 1 });
  });

  it('excludes non-active listings from browse', async () => {
    const all = await request(app).get('/api/listings?pageSize=50');
    const mine = all.body.data.find((l) => l.owner.id === alice.id);
    await request(app).patch(`/api/listings/${mine.id}`).set(auth(alice)).send({ status: 'PAUSED' });
    const after = await request(app).get('/api/listings?pageSize=50');
    expect(after.body.data.find((l) => l.id === mine.id)).toBeUndefined();
  });
});

describe('favourites', () => {
  it('toggles a favourite and lists saved listings', async () => {
    const l = await makeListing(bob);
    const on = await request(app).post(`/api/listings/${l.id}/favorite`).set(auth(alice));
    expect(on.body).toEqual({ favorited: true });
    const off = await request(app).post(`/api/listings/${l.id}/favorite`).set(auth(alice));
    expect(off.body).toEqual({ favorited: false });
    await request(app).post(`/api/listings/${l.id}/favorite`).set(auth(alice));

    const saved = await request(app).get('/api/listings/saved').set(auth(alice));
    expect(saved.body.data.map((x) => x.id)).toEqual([l.id]);
    expect(saved.body.data[0].favorited).toBe(true);

    // the flag also shows up on browse when authenticated
    const browse = await request(app).get('/api/listings').set(auth(alice));
    expect(browse.body.data.find((x) => x.id === l.id).favorited).toBe(true);
    // ...and not for anonymous requests
    const anon = await request(app).get(`/api/listings/${l.id}`);
    expect(anon.body.listing.favorited).toBeUndefined();
  });

  it('favouriting a missing listing is 404, saved list needs auth', async () => {
    expect((await request(app).post('/api/listings/999999/favorite').set(auth(alice))).status).toBe(404);
    expect((await request(app).get('/api/listings/saved')).status).toBe(401);
  });
});
