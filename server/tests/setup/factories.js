import bcrypt from 'bcryptjs';
import request from 'supertest';
import { testPrisma as prisma } from './pglite.js';
import { signAccessToken } from '../../src/lib/jwt.js';

let _pwHash;
export async function passwordHash() {
  if (!_pwHash) _pwHash = await bcrypt.hash('Password123', 4);
  return _pwHash;
}

let seq = 0;
export async function makeUser(overrides = {}) {
  seq += 1;
  const user = await prisma.user.create({
    data: {
      fullName: overrides.fullName || `User ${seq}`,
      phoneNumber: overrides.phoneNumber || `+2547120000${String(seq).padStart(2, '0')}`,
      passwordHash: await passwordHash(),
      phoneVerified: overrides.phoneVerified ?? true,
      isAdmin: overrides.isAdmin ?? false,
      publicKey: overrides.publicKey ?? null,
      bio: overrides.bio ?? null,
    },
  });
  return { ...user, token: signAccessToken(user) };
}

export function auth(userOrToken) {
  const token = typeof userOrToken === 'string' ? userOrToken : userOrToken.token;
  return { Authorization: `Bearer ${token}` };
}

export async function makeListing(owner, overrides = {}) {
  return prisma.listing.create({
    data: {
      userId: owner.id,
      categoryType: overrides.categoryType || 'DIGITAL',
      category: overrides.category || 'Photography',
      title: overrides.title || 'Studio portrait session',
      description: overrides.description || 'One hour studio session, ten edited photos.',
      price: overrides.price ?? 4000,
      location: overrides.location ?? 'Nairobi',
      status: overrides.status || 'ACTIVE',
    },
  });
}

const SECRET = 'test-secret';

// Drive a hire all the way to RELEASED by feeding the webhook endpoints
// synthetic Daraja payloads (the same shape the mock simulator produces).
export async function completeOrder(app, client, listing) {
  const hireRes = await request(app)
    .post('/api/transactions')
    .set(auth(client))
    .send({ listingId: listing.id });
  const tx = hireRes.body.transaction;

  const fresh = await prisma.transaction.findUnique({ where: { id: tx.id } });
  await request(app)
    .post(`/api/mpesa/stk-callback/${SECRET}`)
    .send({
      Body: {
        stkCallback: {
          MerchantRequestID: 'm-1',
          CheckoutRequestID: fresh.stkCheckoutRequestId,
          ResultCode: 0,
          ResultDesc: 'ok',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: Number(tx.amount) },
              { Name: 'MpesaReceiptNumber', Value: 'QTEST123' },
              { Name: 'PhoneNumber', Value: 254712345678 },
            ],
          },
        },
      },
    });

  await request(app).post(`/api/transactions/${tx.id}/approve`).set(auth(client));
  const releasing = await prisma.transaction.findUnique({ where: { id: tx.id } });
  await request(app)
    .post(`/api/mpesa/b2c/result/${SECRET}`)
    .send({
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'ok',
        ConversationID: releasing.b2cConversationId,
        TransactionID: 'QPAYOUT1',
        ResultParameters: { ResultParameter: [{ Key: 'TransactionReceipt', Value: 'QPAYOUT1' }] },
      },
    });

  return prisma.transaction.findUnique({ where: { id: tx.id } });
}

export { prisma };
