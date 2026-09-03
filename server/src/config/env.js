import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

function bool(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: int('PORT', 4000),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  trustProxy: bool('TRUST_PROXY', false),

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  otp: {
    ttlMinutes: int('OTP_TTL_MINUTES', 10),
    maxAttempts: int('OTP_MAX_ATTEMPTS', 5),
    devEcho: bool('OTP_DEV_ECHO', false),
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'console',
    africasTalking: {
      username: process.env.AT_USERNAME || '',
      apiKey: process.env.AT_API_KEY || '',
      senderId: process.env.AT_SENDER_ID || '',
    },
  },
};
