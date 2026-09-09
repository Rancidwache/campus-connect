import { describe, it, expect } from 'vitest';
import { normalizeKePhone } from '../../src/lib/phone.js';

describe('normalizeKePhone', () => {
  it('accepts the common local and international forms', () => {
    expect(normalizeKePhone('0712345678')).toBe('+254712345678');
    expect(normalizeKePhone('712345678')).toBe('+254712345678');
    expect(normalizeKePhone('254712345678')).toBe('+254712345678');
    expect(normalizeKePhone('+254712345678')).toBe('+254712345678');
    expect(normalizeKePhone('0112345678')).toBe('+254112345678'); // Safaricom 01x
  });

  it('strips spaces, dashes and parentheses', () => {
    expect(normalizeKePhone('0712 345 678')).toBe('+254712345678');
    expect(normalizeKePhone('+254-712-345-678')).toBe('+254712345678');
    expect(normalizeKePhone('(0712) 345678')).toBe('+254712345678');
  });

  it('rejects malformed numbers', () => {
    expect(() => normalizeKePhone('0812345678')).toThrow(); // 08x not valid
    expect(() => normalizeKePhone('071234567')).toThrow(); // too short
    expect(() => normalizeKePhone('07123456789')).toThrow(); // too long
    expect(() => normalizeKePhone('not a phone')).toThrow();
    expect(() => normalizeKePhone('')).toThrow();
    expect(() => normalizeKePhone(undefined)).toThrow();
  });
});
