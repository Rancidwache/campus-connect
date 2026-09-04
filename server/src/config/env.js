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

  // Base URL this API is reachable at — used to build M-Pesa callback URLs and,
  // in mock mode, for the simulator to call its own webhooks.
  selfBaseUrl: process.env.SELF_BASE_URL || `http://localhost:${int('PORT', 4000)}`,

  storage: {
    // local  -> files on disk under server/uploads, served at /uploads
    // supabase -> Supabase Storage bucket (needs SUPABASE_SERVICE_ROLE_KEY)
    driver: process.env.STORAGE_DRIVER || 'local',
    bucket: process.env.STORAGE_BUCKET || 'campus-connect-media',
    supabaseUrl: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    maxImageBytes: int('MAX_IMAGE_BYTES', 5 * 1024 * 1024),
    maxVideoBytes: int('MAX_VIDEO_BYTES', 50 * 1024 * 1024),
    maxImagesPerListing: int('MAX_IMAGES_PER_LISTING', 5),
  },

  mpesa: {
    // mock | sandbox | production
    mode: process.env.MPESA_MODE || 'mock',
    // Platform commission taken on top of the listing price (0.10 = 10%).
    platformFeeRate: Number.parseFloat(process.env.PLATFORM_FEE_RATE || '0.10'),
    // Unguessable path segment on the webhook routes (defence in depth alongside
    // a Safaricom IP allow-list at the gateway).
    callbackSecret: process.env.MPESA_CALLBACK_SECRET || 'dev-callback-secret',
    // In mock mode, how long before the simulator fires the STK / B2C callback.
    mockDelayMs: int('MPESA_MOCK_DELAY_MS', 4000),

    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    // STK Push (Lipa na M-Pesa Online)
    shortcode: process.env.MPESA_SHORTCODE || '',
    passkey: process.env.MPESA_PASSKEY || '',
    // B2C
    b2cShortcode: process.env.MPESA_B2C_SHORTCODE || '',
    initiatorName: process.env.MPESA_INITIATOR_NAME || '',
    securityCredential: process.env.MPESA_SECURITY_CREDENTIAL || '',
  },
};
