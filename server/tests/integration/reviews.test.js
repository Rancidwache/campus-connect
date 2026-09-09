import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { resetDb, testPrisma as prisma } from '../setup/pglite.js';
import { makeUser, makeListing, auth, completeOrder } from '../setup/factories.js';
import { createApp } from '../../src/app.js';

let app;
let client;
let provider;
let outsider;
let listing;

beforeAll(() => {
  app = createApp();
});
beforeEach(async () => {
  await resetDb();
  client = await makeUser({ fullName: 'Client C' });
  provider = await makeUser({ fullName: 'Provider P' });
  outsider = await makeUser({ fullName: 'Ollie O' });
  listing = await makeListing(provider, { price: 2500 });
});

describe('reviews', () => {
  it('a completed order lets the client leave one review; rating rolls up', async () => {
    const tx = await completeOrder(app, client, listing);
    expect(tx.escrowStatus).toBe('RELEASED');

    const res = await request(app)
      .post('/api/reviews')
      .set(auth(client))
      .send({ transactionId: tx.id, rating: 5, body: 'Superb, delivered early.' });
    expect(res.status).toBe(201);
    expect(res.body.review.authorRole).toBe('CUSTOMER');

    // one review per transaction
    const dup = await request(app)
      .post('/api/reviews')
      .set(auth(client))
      .send({ transactionId: tx.id, rating: 3, body: 'changed my mind' });
    expect(dup.status).toBe(409);

    const p = await request(app).get(`/api/users/${provider.id}`);
    expect(p.body.user.ratingAvg).toBe(5);
    expect(p.body.user.ratingCount).toBe(1);

    const list = await request(app).get(`/api/reviews/provider/${provider.id}`);
    expect(list.body.summary).toMatchObject({ average: 5, count: 1, distribution: { 5: 1 } });
  });

  it('you cannot review an order that is not yours or not complete', async () => {
    const other = await makeListing(provider, { price: 900, title: 'Another gig' });
    const hire = await request(app).post('/api/transactions').set(auth(client)).send({ listingId: other.id });
    const early = await request(app)
      .post('/api/reviews')
      .set(auth(client))
      .send({ transactionId: hire.body.transaction.id, rating: 4, body: 'too early to say' });
    expect(early.status).toBe(409);

    const tx = await completeOrder(app, client, listing);
    const notMine = await request(app)
      .post('/api/reviews')
      .set(auth(outsider))
      .send({ transactionId: tx.id, rating: 1, body: 'not my order' });
    expect(notMine.status).toBe(403);
  });

  it('threaded replies carry role badges; likes toggle', async () => {
    const tx = await completeOrder(app, client, listing);
    const review = (
      await request(app).post('/api/reviews').set(auth(client)).send({ transactionId: tx.id, rating: 4, body: 'Good.' })
    ).body.review;

    // provider replies -> PROVIDER badge
    const pReply = await request(app)
      .post(`/api/reviews/${review.id}/replies`)
      .set(auth(provider))
      .send({ body: 'Thanks for the kind words!' });
    expect(pReply.body.reply.authorRole).toBe('PROVIDER');

    // an outsider replies -> VISITOR badge
    const vReply = await request(app)
      .post(`/api/reviews/${review.id}/replies`)
      .set(auth(outsider))
      .send({ body: 'Considering hiring them too.' });
    expect(vReply.body.reply.authorRole).toBe('VISITOR');

    const like1 = await request(app).post(`/api/reviews/${review.id}/like`).set(auth(outsider));
    expect(like1.body).toEqual({ liked: true, likeCount: 1 });
    const like2 = await request(app).post(`/api/reviews/${review.id}/like`).set(auth(outsider));
    expect(like2.body).toEqual({ liked: false, likeCount: 0 });

    const thread = await request(app).get(`/api/reviews/provider/${provider.id}`).set(auth(client));
    expect(thread.body.data[0].replies).toHaveLength(2);
  });

  it('lists the orders a user can still review', async () => {
    const tx = await completeOrder(app, client, listing);
    let pending = await request(app).get('/api/reviews/pending').set(auth(client));
    expect(pending.body.pending.map((x) => x.transactionId)).toContain(tx.id);

    await request(app).post('/api/reviews').set(auth(client)).send({ transactionId: tx.id, rating: 5, body: 'Done and dusted.' });
    pending = await request(app).get('/api/reviews/pending').set(auth(client));
    expect(pending.body.pending).toHaveLength(0);
  });

  it('deleting a review recomputes the rollup', async () => {
    const tx = await completeOrder(app, client, listing);
    const review = (
      await request(app).post('/api/reviews').set(auth(client)).send({ transactionId: tx.id, rating: 2, body: 'Meh.' })
    ).body.review;
    expect((await request(app).get(`/api/users/${provider.id}`)).body.user.ratingCount).toBe(1);

    await request(app).delete(`/api/reviews/${review.id}`).set(auth(client));
    const after = await request(app).get(`/api/users/${provider.id}`);
    expect(after.body.user).toMatchObject({ ratingAvg: 0, ratingCount: 0 });
    expect(await prisma.review.count()).toBe(0);
  });
});
