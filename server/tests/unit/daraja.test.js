import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { daraja } from '../../src/modules/payments/daraja.client.js';

// Freeze timers so the mock's scheduled callback never fires a real fetch.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Daraja client (mock mode)', () => {
  it('runs in mock mode from the test env', () => {
    expect(daraja.isMock).toBe(true);
  });

  it('stkPush returns a checkout id and a customer message', async () => {
    const res = await daraja.stkPush({
      amount: 2750,
      phone: '+254712345678',
      accountRef: 'CC-1',
      description: 'Escrow 1',
    });
    expect(res.checkoutRequestId).toMatch(/^ws_CO_/);
    expect(res.merchantRequestId).toBeTruthy();
    expect(res.customerMessage).toMatch(/M-Pesa PIN/i);
  });

  it('b2cPayment returns a conversation id', async () => {
    const res = await daraja.b2cPayment({
      amount: 2500,
      phone: '+254712345678',
      remarks: 'payout',
      occasion: 'gig',
    });
    expect(res.conversationId).toMatch(/^AG_/);
    expect(res.originatorConversationId).toBeTruthy();
  });
});
