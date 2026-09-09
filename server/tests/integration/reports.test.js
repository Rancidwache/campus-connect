import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { resetDb } from '../setup/pglite.js';
import { makeUser, makeListing, auth, completeOrder } from '../setup/factories.js';
import { createApp } from '../../src/app.js';

let app;
let mod;
let reporter;
let owner;
let listing;

beforeAll(() => {
  app = createApp();
});
beforeEach(async () => {
  await resetDb();
  mod = await makeUser({ fullName: 'Mod M', isAdmin: true });
  reporter = await makeUser({ fullName: 'Rita R' });
  owner = await makeUser({ fullName: 'Otis O' });
  listing = await makeListing(owner);
});

describe('reporting', () => {
  it('files a report, blocks self-reports and duplicates', async () => {
    const ok = await request(app)
      .post('/api/reports')
      .set(auth(reporter))
      .send({ targetType: 'LISTING', targetId: listing.id, reason: 'MISLEADING', detail: 'Photos are not theirs.' });
    expect(ok.status).toBe(201);

    const dup = await request(app)
      .post('/api/reports')
      .set(auth(reporter))
      .send({ targetType: 'LISTING', targetId: listing.id, reason: 'SPAM' });
    expect(dup.status).toBe(409);

    const self = await request(app)
      .post('/api/reports')
      .set(auth(owner))
      .send({ targetType: 'LISTING', targetId: listing.id, reason: 'SPAM' });
    expect(self.status).toBe(400);

    const missing = await request(app)
      .post('/api/reports')
      .set(auth(reporter))
      .send({ targetType: 'LISTING', targetId: 999999, reason: 'SPAM' });
    expect(missing.status).toBe(404);

    const mine = await request(app).get('/api/reports/mine').set(auth(reporter));
    expect(mine.body.reports).toHaveLength(1);
    expect(mine.body.reports[0].status).toBe('OPEN');
  });

  it('moderation queue is admin-only and carries reporter + target context', async () => {
    await request(app).post('/api/reports').set(auth(reporter)).send({ targetType: 'LISTING', targetId: listing.id, reason: 'SPAM' });

    expect((await request(app).get('/api/admin/reports').set(auth(reporter))).status).toBe(403);

    const q = await request(app).get('/api/admin/reports?status=OPEN').set(auth(mod));
    expect(q.status).toBe(200);
    expect(q.body.data[0].reporter.fullName).toBe('Rita R');
    expect(q.body.data[0].target).toMatchObject({ exists: true });
    expect((await request(app).get('/api/admin/reports/stats').set(auth(mod))).body.OPEN).toBe(1);
  });

  it('removing reported content soft-deletes it and closes sibling reports', async () => {
    await request(app).post('/api/reports').set(auth(reporter)).send({ targetType: 'LISTING', targetId: listing.id, reason: 'SPAM' });
    await request(app).post('/api/reports').set(auth(mod)).send({ targetType: 'LISTING', targetId: listing.id, reason: 'MISLEADING' });

    const open = await request(app).get('/api/admin/reports?status=OPEN').set(auth(mod));
    expect(open.body.data).toHaveLength(2);
    const reportId = open.body.data[0].id;

    const remove = await request(app).post(`/api/admin/reports/${reportId}/remove`).set(auth(mod)).send({ reviewNote: 'Clear spam.' });
    expect(remove.body.removed).toBe(true);

    expect((await request(app).get(`/api/listings/${listing.id}`)).status).toBe(404);
    const actioned = await request(app).get('/api/admin/reports?status=ACTIONED').set(auth(mod));
    expect(actioned.body.data.filter((r) => r.targetType === 'LISTING')).toHaveLength(2);

    const mine = await request(app).get('/api/reports/mine').set(auth(reporter));
    expect(mine.body.reports[0].status).toBe('ACTIONED');
  });

  it('status update sets the moderator; remove is refused for USER targets', async () => {
    await request(app).post('/api/reports').set(auth(reporter)).send({ targetType: 'USER', targetId: owner.id, reason: 'HARASSMENT_OR_HATE' });
    const [report] = (await request(app).get('/api/admin/reports').set(auth(mod))).body.data;

    const upd = await request(app).patch(`/api/admin/reports/${report.id}`).set(auth(mod)).send({ status: 'REVIEWING', reviewNote: 'looking into it' });
    expect(upd.body.report.status).toBe('REVIEWING');
    expect(upd.body.report.reviewedById).toBe(mod.id);

    const bad = await request(app).post(`/api/admin/reports/${report.id}/remove`).set(auth(mod)).send({});
    expect(bad.status).toBe(400);
  });

  it('removing a reported review recomputes the provider rating', async () => {
    const client = await makeUser({ fullName: 'Carl C' });
    const priced = await makeListing(owner, { price: 1000 });
    const tx = await completeOrder(app, client, priced);
    const review = (
      await request(app).post('/api/reviews').set(auth(client)).send({ transactionId: tx.id, rating: 1, body: 'spam spam spam' })
    ).body.review;
    expect((await request(app).get(`/api/users/${owner.id}`)).body.user.ratingCount).toBe(1);

    await request(app).post('/api/reports').set(auth(reporter)).send({ targetType: 'REVIEW', targetId: review.id, reason: 'SPAM' });
    const [rep] = (await request(app).get('/api/admin/reports').set(auth(mod))).body.data;
    await request(app).post(`/api/admin/reports/${rep.id}/remove`).set(auth(mod)).send({});

    const after = await request(app).get(`/api/users/${owner.id}`);
    expect(after.body.user).toMatchObject({ ratingAvg: 0, ratingCount: 0 });
  });
});
