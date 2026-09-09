import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { resetDb, testPrisma as prisma } from '../setup/pglite.js';
import { makeUser, makeListing, auth } from '../setup/factories.js';
import { createApp } from '../../src/app.js';

const SECRET = 'test-secret';
let app;
let client;
let provider;
let listing;

beforeAll(() => {
  app = createApp();
});
beforeEach(async () => {
  await resetDb();
  client = await makeUser({ fullName: 'Client C' });
  provider = await makeUser({ fullName: 'Provider P' });
  listing = await makeListing(provider, { price: 2500 });
});

const stkCallback = (checkoutId, resultCode = 0, amount = 2750) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: 'm-1',
      CheckoutRequestID: checkoutId,
      ResultCode: resultCode,
      ResultDesc: resultCode === 0 ? 'ok' : 'cancelled',
      ...(resultCode === 0
        ? {
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: amount },
                { Name: 'MpesaReceiptNumber', Value: 'QDEP123' },
                { Name: 'PhoneNumber', Value: 254712345678 },
              ],
            },
          }
        : {}),
    },
  },
});

const b2cResult = (conversationId, resultCode = 0) => ({
  Result: {
    ResultType: 0,
    ResultCode: resultCode,
    ResultDesc: 'ok',
    ConversationID: conversationId,
    TransactionID: 'QOUT123',
    ResultParameters: { ResultParameter: [{ Key: 'TransactionReceipt', Value: 'QOUT123' }] },
  },
});

describe('HustleGuard escrow', () => {
  it('quote breaks fee + platform fee + total', async () => {
    const res = await request(app).get(`/api/transactions/quote?listingId=${listing.id}`).set(auth(client));
    expect(res.body).toMatchObject({ feeAmount: 2500, platformFee: 250, amount: 2750, feeRatePct: 10 });
  });

  it('happy path: hire → STK held → approve → B2C released', async () => {
    const hire = await request(app).post('/api/transactions').set(auth(client)).send({ listingId: listing.id });
    expect(hire.status).toBe(201);
    const txId = hire.body.transaction.id;
    expect(hire.body.transaction.escrowStatus).toBe('PENDING_PAYMENT');

    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    const cb = await request(app).post(`/api/mpesa/stk-callback/${SECRET}`).send(stkCallback(tx.stkCheckoutRequestId));
    expect(cb.status).toBe(200);

    let detail = await request(app).get(`/api/transactions/${txId}`).set(auth(client));
    expect(detail.body.transaction.escrowStatus).toBe('HELD');
    expect(detail.body.transaction.mpesaReceipt).toBe('QDEP123');

    // provider got a "funds secured" notification
    const notifs = await request(app).get('/api/notifications').set(auth(provider));
    expect(notifs.body.items.some((n) => n.type === 'ESCROW_FUNDED')).toBe(true);

    // only the client may approve
    expect((await request(app).post(`/api/transactions/${txId}/approve`).set(auth(provider))).status).toBe(403);

    const approve = await request(app).post(`/api/transactions/${txId}/approve`).set(auth(client));
    expect(approve.body.transaction.escrowStatus).toBe('RELEASING');

    const releasing = await prisma.transaction.findUnique({ where: { id: txId } });
    await request(app).post(`/api/mpesa/b2c/result/${SECRET}`).send(b2cResult(releasing.b2cConversationId));

    detail = await request(app).get(`/api/transactions/${txId}`).set(auth(client));
    expect(detail.body.transaction.escrowStatus).toBe('RELEASED');
    expect(detail.body.transaction.b2cReceipt).toBe('QOUT123');
    expect(detail.body.transaction.releasedAt).toBeTruthy();
  });

  it('failed STK → PAYMENT_FAILED → client can cancel', async () => {
    const hire = await request(app).post('/api/transactions').set(auth(client)).send({ listingId: listing.id });
    const txId = hire.body.transaction.id;
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });

    await request(app).post(`/api/mpesa/stk-callback/${SECRET}`).send(stkCallback(tx.stkCheckoutRequestId, 1032));
    let detail = await request(app).get(`/api/transactions/${txId}`).set(auth(client));
    expect(detail.body.transaction.escrowStatus).toBe('PAYMENT_FAILED');

    const cancel = await request(app).post(`/api/transactions/${txId}/cancel`).set(auth(client));
    expect(cancel.body.transaction.escrowStatus).toBe('CANCELLED');
  });

  it('provider can decline a held order → refund path', async () => {
    const hire = await request(app).post('/api/transactions').set(auth(client)).send({ listingId: listing.id });
    const txId = hire.body.transaction.id;
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    await request(app).post(`/api/mpesa/stk-callback/${SECRET}`).send(stkCallback(tx.stkCheckoutRequestId));

    const decline = await request(app).post(`/api/transactions/${txId}/decline`).set(auth(provider));
    expect(decline.body.transaction.escrowStatus).toBe('REFUNDING');

    const refunding = await prisma.transaction.findUnique({ where: { id: txId } });
    await request(app).post(`/api/mpesa/b2c/result/${SECRET}`).send(b2cResult(refunding.b2cConversationId));
    const detail = await request(app).get(`/api/transactions/${txId}`).set(auth(client));
    expect(detail.body.transaction.escrowStatus).toBe('REFUNDED');
  });

  it('guards: cannot hire your own listing; webhook needs the secret', async () => {
    const own = await request(app).post('/api/transactions').set(auth(provider)).send({ listingId: listing.id });
    expect(own.status).toBe(400);
    expect((await request(app).post('/api/mpesa/stk-callback/wrong').send({})).status).toBe(404);
    expect((await request(app).get('/api/transactions')).status).toBe(401);
  });

  it('STK callback is idempotent (a retry does not double-process)', async () => {
    const hire = await request(app).post('/api/transactions').set(auth(client)).send({ listingId: listing.id });
    const txId = hire.body.transaction.id;
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    await request(app).post(`/api/mpesa/stk-callback/${SECRET}`).send(stkCallback(tx.stkCheckoutRequestId));
    await request(app).post(`/api/mpesa/stk-callback/${SECRET}`).send(stkCallback(tx.stkCheckoutRequestId));
    const detail = await request(app).get(`/api/transactions/${txId}`).set(auth(client));
    expect(detail.body.transaction.escrowStatus).toBe('HELD');
    // exactly one ESCROW_FUNDED for the provider
    const notifs = await request(app).get('/api/notifications').set(auth(provider));
    expect(notifs.body.items.filter((n) => n.type === 'ESCROW_FUNDED')).toHaveLength(1);
  });
});
