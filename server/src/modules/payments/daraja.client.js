import crypto from 'node:crypto';
import { env } from '../../config/env.js';

// ── Safaricom Daraja API client ──────────────────────────────────────────────
// One interface, three modes:
//   mock        — no network; a simulator fires realistic callbacks after a delay
//   sandbox     — https://sandbox.safaricom.co.ke  (Daraja test credentials)
//   production  — https://api.safaricom.co.ke
//
// The mock always shapes its callbacks exactly like the real ones, so the
// webhook handlers in escrow.service.js are the single source of truth for state.

const BASE = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
};

const cb = (path) => `${env.selfBaseUrl}/api/mpesa/${path}/${env.mpesa.callbackSecret}`;

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

const rand = (n = 10) => crypto.randomBytes(n).toString('hex').toUpperCase().slice(0, n);
const mpesaReceipt = () => `Q${rand(9)}`;

class DarajaClient {
  constructor() {
    this.mode = env.mpesa.mode;
    this._token = null;
    this._tokenExp = 0;
  }

  get isMock() {
    return this.mode === 'mock';
  }

  async _accessToken() {
    if (this._token && Date.now() < this._tokenExp) return this._token;
    const { consumerKey, consumerSecret } = env.mpesa;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const res = await fetch(
      `${BASE[this.mode]}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    if (!res.ok) throw new Error(`Daraja auth failed (${res.status}): ${await res.text()}`);
    const body = await res.json();
    this._token = body.access_token;
    this._tokenExp = Date.now() + (Number(body.expires_in || 3500) - 60) * 1000;
    return this._token;
  }

  async _post(path, payload) {
    const token = await this._accessToken();
    const res = await fetch(`${BASE[this.mode]}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Daraja ${path} failed (${res.status}): ${JSON.stringify(body)}`);
    return body;
  }

  // ── STK Push — collect the client's deposit ────────────────────────────────
  async stkPush({ amount, phone, accountRef, description }) {
    const msisdn = phone.replace('+', '');

    if (this.isMock) {
      const checkoutRequestId = `ws_CO_${timestamp()}${rand(6)}`;
      const merchantRequestId = `${rand(4)}-${rand(4)}-1`;
      // Simulate the customer: a phone ending 0000 "cancels" the prompt.
      const willSucceed = !msisdn.endsWith('0000');
      this._scheduleStkCallback({ checkoutRequestId, merchantRequestId, amount, msisdn, willSucceed });
      return { checkoutRequestId, merchantRequestId, customerMessage: 'Enter your M-Pesa PIN to authorise the payment.' };
    }

    const ts = timestamp();
    const password = Buffer.from(`${env.mpesa.shortcode}${env.mpesa.passkey}${ts}`).toString('base64');
    const body = await this._post('/mpesa/stkpush/v1/processrequest', {
      BusinessShortCode: env.mpesa.shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: msisdn,
      PartyB: env.mpesa.shortcode,
      PhoneNumber: msisdn,
      CallBackURL: cb('stk-callback'),
      AccountReference: accountRef.slice(0, 12),
      TransactionDesc: description.slice(0, 13),
    });
    return {
      checkoutRequestId: body.CheckoutRequestID,
      merchantRequestId: body.MerchantRequestID,
      customerMessage: body.CustomerMessage,
    };
  }

  // ── B2C — pay the provider (or refund the client) ──────────────────────────
  async b2cPayment({ amount, phone, remarks, occasion }) {
    const msisdn = phone.replace('+', '');

    if (this.isMock) {
      const conversationId = `AG_${timestamp()}_${rand(12)}`;
      this._scheduleB2cResult({ conversationId, amount, msisdn });
      return { conversationId, originatorConversationId: `${rand(8)}-${rand(4)}-1` };
    }

    const body = await this._post('/mpesa/b2c/v1/paymentrequest', {
      InitiatorName: env.mpesa.initiatorName,
      SecurityCredential: env.mpesa.securityCredential,
      CommandID: 'BusinessPayment',
      Amount: amount,
      PartyA: env.mpesa.b2cShortcode,
      PartyB: msisdn,
      Remarks: remarks.slice(0, 100),
      QueueTimeOutURL: cb('b2c/timeout'),
      ResultURL: cb('b2c/result'),
      Occasion: (occasion || '').slice(0, 100),
    });
    return {
      conversationId: body.ConversationID,
      originatorConversationId: body.OriginatorConversationID,
    };
  }

  // ── Mock simulator ────────────────────────────────────────────────────────
  _fire(path, payload) {
    setTimeout(() => {
      fetch(cb(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => console.error(`[mpesa mock] callback ${path} failed:`, err.message));
    }, env.mpesa.mockDelayMs).unref?.();
  }

  _scheduleStkCallback({ checkoutRequestId, merchantRequestId, amount, msisdn, willSucceed }) {
    const stkCallback = willSucceed
      ? {
          MerchantRequestID: merchantRequestId,
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: amount },
              { Name: 'MpesaReceiptNumber', Value: mpesaReceipt() },
              { Name: 'TransactionDate', Value: Number(timestamp()) },
              { Name: 'PhoneNumber', Value: Number(msisdn) },
            ],
          },
        }
      : {
          MerchantRequestID: merchantRequestId,
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user',
        };
    this._fire('stk-callback', { Body: { stkCallback } });
  }

  _scheduleB2cResult({ conversationId, amount, msisdn }) {
    this._fire('b2c/result', {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        OriginatorConversationID: `${rand(8)}-${rand(4)}-1`,
        ConversationID: conversationId,
        TransactionID: mpesaReceipt(),
        ResultParameters: {
          ResultParameter: [
            { Key: 'TransactionReceipt', Value: mpesaReceipt() },
            { Key: 'TransactionAmount', Value: amount },
            { Key: 'B2CRecipientIsRegisteredCustomer', Value: 'Y' },
            { Key: 'ReceiverPartyPublicName', Value: `${msisdn} - Campus Connect user` },
          ],
        },
      },
    });
  }
}

export const daraja = new DarajaClient();
export { cb as mpesaCallbackUrl };
