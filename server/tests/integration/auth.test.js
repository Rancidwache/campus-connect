import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { resetDb } from '../setup/pglite.js';
import { prisma } from '../setup/factories.js';
import { createApp } from '../../src/app.js';

let app;
beforeAll(() => {
  app = createApp();
});
beforeEach(() => resetDb());

describe('auth flow', () => {
  it('register → verify OTP → sign in', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Amina Wanjiku', phoneNumber: '0712345678', password: 'Password123' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.phoneNumber).toBe('+254712345678');
    expect(reg.body.user.phoneVerified).toBe(false);
    expect(reg.body.devCode).toMatch(/^\d{6}$/); // OTP_DEV_ECHO

    const verify = await request(app)
      .post('/api/auth/verify-phone')
      .send({ phoneNumber: '0712345678', code: reg.body.devCode });
    expect(verify.status).toBe(200);
    expect(verify.body.token).toBeTruthy();
    expect(verify.body.user.phoneVerified).toBe(true);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ phoneNumber: '+254712345678', password: 'Password123' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });

  it('rejects a wrong OTP and a duplicate phone', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Bee', phoneNumber: '0712000002', password: 'Password123' });

    const bad = await request(app)
      .post('/api/auth/verify-phone')
      .send({ phoneNumber: '0712000002', code: '000000' });
    expect(bad.status).toBe(400);

    const dup = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Bee2', phoneNumber: '254712000002', password: 'Password123' });
    expect(dup.status).toBe(409);
  });

  it('login on an unverified account asks for verification (403)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Cee', phoneNumber: '0712000003', password: 'Password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phoneNumber: '0712000003', password: 'Password123' });
    expect(res.status).toBe(403);
    expect(res.body.needsVerification).toBe(true);
  });

  it('protected routes need a valid bearer token', async () => {
    expect((await request(app).get('/api/users/me')).status).toBe(401);
    expect((await request(app).get('/api/users/me').set('Authorization', 'Bearer nope')).status).toBe(401);
  });

  it('/users/me returns the profile and never the password hash', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Dee', phoneNumber: '0712000004', password: 'Password123' });
    const { body } = await request(app)
      .post('/api/auth/verify-phone')
      .send({ phoneNumber: '0712000004', code: reg.body.devCode });

    const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).not.toHaveProperty('passwordHash');
    expect(me.body.user.isAdmin).toBe(false);
    expect(await prisma.user.count()).toBe(1);
  });
});
