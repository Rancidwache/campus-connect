import { describe, it, expect } from 'vitest';
import { toKes, quote } from '../../src/lib/money.js';

describe('toKes', () => {
  it('rounds to whole shillings', () => {
    expect(toKes(1200)).toBe(1200);
    expect(toKes('2500.49')).toBe(2500);
    expect(toKes(2500.5)).toBe(2501);
  });
  it('handles Decimal-like objects and junk', () => {
    expect(toKes({ toString: () => '800' })).toBe(800);
    expect(toKes('not a number')).toBe(0);
    expect(toKes(null)).toBe(0);
  });
});

describe('quote', () => {
  it('adds a rounded-up platform fee on top of the listing price', () => {
    expect(quote(2500, 0.1)).toEqual({ feeAmount: 2500, platformFee: 250, amount: 2750 });
    expect(quote(800, 0.1)).toEqual({ feeAmount: 800, platformFee: 80, amount: 880 });
  });
  it('rounds the platform fee up and never below 1', () => {
    expect(quote(105, 0.1)).toEqual({ feeAmount: 105, platformFee: 11, amount: 116 });
    expect(quote(5, 0.1).platformFee).toBe(1);
  });
  it('works with a different fee rate', () => {
    expect(quote(1000, 0.15)).toEqual({ feeAmount: 1000, platformFee: 150, amount: 1150 });
  });
});
