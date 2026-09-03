import { env } from '../../config/env.js';

// Pluggable SMS delivery. Module 1 ships a console provider for development and a
// thin Africa's Talking provider for real delivery in Kenya. Safaricom's own
// bulk-SMS endpoint can be added the same way later.

class ConsoleSmsProvider {
  async send(to, message) {
    console.log(`\n[SMS ▶ ${to}] ${message}\n`);
    return { provider: 'console', to };
  }
}

class AfricasTalkingSmsProvider {
  constructor({ username, apiKey, senderId }) {
    if (!username || !apiKey) {
      throw new Error('SMS_PROVIDER=africastalking but AT_USERNAME / AT_API_KEY are not set');
    }
    this.username = username;
    this.apiKey = apiKey;
    this.senderId = senderId;
    this.endpoint =
      username === 'sandbox'
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';
  }

  async send(to, message) {
    const params = new URLSearchParams({ username: this.username, to, message });
    if (this.senderId) params.set('from', this.senderId);

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        apiKey: this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Africa's Talking SMS failed (${res.status}): ${text}`);
    }
    return res.json();
  }
}

function build() {
  switch (env.sms.provider) {
    case 'africastalking':
      return new AfricasTalkingSmsProvider(env.sms.africasTalking);
    case 'console':
    default:
      return new ConsoleSmsProvider();
  }
}

export const smsProvider = build();
