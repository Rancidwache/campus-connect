import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../../src/modules/auth/auth.validation.js';
import { createListingSchema, listQuerySchema } from '../../src/modules/listings/listings.validation.js';
import { createSchema as reviewCreateSchema } from '../../src/modules/reviews/reviews.validation.js';
import { createSchema as reportCreateSchema } from '../../src/modules/reports/reports.validation.js';

const ok = (schema, value) => schema.parse(value);
const bad = (schema, value) => expect(() => schema.parse(value)).toThrow();

describe('auth validation', () => {
  it('register requires name, phone and an 8+ char password', () => {
    ok(registerSchema.body, { userName: 'Amina W', phoneNumber: '0712345678', password: 'Password123' });
    bad(registerSchema.body, { userName: 'A', phoneNumber: '0712345678', password: 'Password123' });
    bad(registerSchema.body, { userName: 'Amina', phoneNumber: '0712345678', password: 'short' });
  });
  it('login needs a non-empty password', () => {
    ok(loginSchema.body, { phoneNumber: '0712345678', password: 'x' });
    bad(loginSchema.body, { phoneNumber: '0712345678', password: '' });
  });
});

describe('listing validation', () => {
  it('coerces price and rejects non-positive', () => {
    const parsed = createListingSchema.body.parse({
      categoryType: 'DIGITAL',
      category: 'Photography',
      title: 'Studio portrait session',
      description: 'One hour, ten edited photos.',
      price: '4000',
    });
    expect(parsed.price).toBe(4000);
    bad(createListingSchema.body, {
      categoryType: 'DIGITAL', category: 'X', title: 'A short title', description: 'long enough text', price: 0,
    });
    bad(createListingSchema.body, {
      categoryType: 'BOGUS', category: 'Photography', title: 'Studio portrait', description: 'long enough text', price: 10,
    });
  });
  it('list query applies defaults and caps page size', () => {
    const q = listQuerySchema.query.parse({});
    expect(q).toMatchObject({ sort: 'newest', page: 1, pageSize: 20 });
    bad(listQuerySchema.query, { pageSize: '500' });
    expect(listQuerySchema.query.parse({ minPrice: '1000', maxPrice: '2000' })).toMatchObject({
      minPrice: 1000, maxPrice: 2000,
    });
  });
});

describe('review + report validation', () => {
  it('review rating must be 1..5', () => {
    ok(reviewCreateSchema.body, { transactionId: 1, rating: 5, body: 'Great work' });
    bad(reviewCreateSchema.body, { transactionId: 1, rating: 6, body: 'Great work' });
    bad(reviewCreateSchema.body, { transactionId: 1, rating: 3, body: 'no' });
  });
  it('report needs a known target type and reason', () => {
    ok(reportCreateSchema.body, { targetType: 'LISTING', targetId: 1, reason: 'SPAM' });
    bad(reportCreateSchema.body, { targetType: 'MESSAGE', targetId: 1, reason: 'SPAM' });
    bad(reportCreateSchema.body, { targetType: 'LISTING', targetId: 1, reason: 'BECAUSE' });
  });
});
