import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { resetDb } from '../setup/pglite.js';
import { makeUser, auth } from '../setup/factories.js';
import { createApp } from '../../src/app.js';

let app;
let mod;
let member;

beforeAll(() => {
  app = createApp();
});
beforeEach(async () => {
  await resetDb();
  mod = await makeUser({ userName: 'Mod M', isAdmin: true });
  member = await makeUser({ userName: 'Mia M' });
});

const valid = {
  title: 'Pay button does nothing',
  description: 'I tap Hire & pay on a listing and the spinner never stops.',
  severity: 'HIGH',
  pageUrl: '/listings/3',
};

describe('bug reports — submitting', () => {
  it('lets a signed-in user report a bug, attributing it and capturing the browser', async () => {
    const res = await request(app)
      .post('/api/bug-reports')
      .set(auth(member))
      .set('User-Agent', 'TestBrowser/1.0')
      .send({ ...valid, contact: 'ignored@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.report.status).toBe('OPEN');

    const list = await request(app).get('/api/admin/bug-reports').set(auth(mod));
    const bug = list.body.data[0];
    expect(bug.user.userName).toBe('Mia M');
    expect(bug.userAgent).toBe('TestBrowser/1.0');
    expect(bug.pageUrl).toBe('/listings/3');
    expect(bug.severity).toBe('HIGH');
    // A contact is only kept for anonymous reports.
    expect(bug.contact).toBeNull();
  });

  it('accepts an anonymous report and keeps the contact so there is a way to follow up', async () => {
    const res = await request(app)
      .post('/api/bug-reports')
      .send({ ...valid, severity: undefined, contact: 'lou@example.com' });
    expect(res.status).toBe(201);

    const list = await request(app).get('/api/admin/bug-reports').set(auth(mod));
    const bug = list.body.data[0];
    expect(bug.user).toBeNull();
    expect(bug.contact).toBe('lou@example.com');
    expect(bug.severity).toBe('MEDIUM'); // default
  });

  it('rejects reports that are too thin to act on', async () => {
    const short = await request(app).post('/api/bug-reports').send({ title: 'x', description: 'short' });
    expect(short.status).toBe(400);
    const badSeverity = await request(app).post('/api/bug-reports').send({ ...valid, severity: 'CATASTROPHIC' });
    expect(badSeverity.status).toBe(400);
  });
});

describe('bug reports — admin triage', () => {
  it('is admin-only', async () => {
    expect((await request(app).get('/api/admin/bug-reports')).status).toBe(401);
    expect((await request(app).get('/api/admin/bug-reports').set(auth(member))).status).toBe(403);
    expect((await request(app).patch('/api/admin/bug-reports/1').set(auth(member)).send({ status: 'RESOLVED' })).status).toBe(403);
  });

  it('filters by status, reports per-status counts, and updates status + note', async () => {
    const a = await request(app).post('/api/bug-reports').set(auth(member)).send(valid);
    await request(app).post('/api/bug-reports').set(auth(member)).send({ ...valid, title: 'Second bug' });
    const id = a.body.report.id;

    const patched = await request(app)
      .patch(`/api/admin/bug-reports/${id}`)
      .set(auth(mod))
      .send({ status: 'RESOLVED', adminNote: 'Fixed in the next release.' });
    expect(patched.status).toBe(200);
    expect(patched.body.report.status).toBe('RESOLVED');
    expect(patched.body.report.adminNote).toBe('Fixed in the next release.');

    const open = await request(app).get('/api/admin/bug-reports?status=OPEN').set(auth(mod));
    expect(open.body.data).toHaveLength(1);
    expect(open.body.data[0].title).toBe('Second bug');
    expect(open.body.counts).toMatchObject({ OPEN: 1, RESOLVED: 1, IN_PROGRESS: 0, WONT_FIX: 0 });
    expect(open.body.pagination.total).toBe(1);
  });

  it('404s on an unknown report and 400s on an empty update', async () => {
    const missing = await request(app).patch('/api/admin/bug-reports/9999').set(auth(mod)).send({ status: 'RESOLVED' });
    expect(missing.status).toBe(404);
    const empty = await request(app).patch('/api/admin/bug-reports/1').set(auth(mod)).send({});
    expect(empty.status).toBe(400);
  });
});
