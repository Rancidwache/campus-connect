// Vitest setup for integration tests: an in-memory PGlite Postgres, wired into
// the app through globalThis.__ccTestPrisma (see src/lib/prisma.js). Runs before
// any app module is imported by the test file.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { PrismaClient } from '@prisma/client';

// Test env — set before src/config/env.js loads. dotenv does not override
// existing process.env, so these win over the real .env file.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://pglite/test';
process.env.DIRECT_URL ||= process.env.DATABASE_URL;
process.env.JWT_SECRET = 'test-secret-not-used-in-prod';
process.env.BCRYPT_ROUNDS = '4';
process.env.MPESA_MODE = 'mock';
process.env.OTP_DEV_ECHO = 'true';
process.env.SMS_PROVIDER = 'console';
process.env.STORAGE_DRIVER = 'local';
process.env.PLATFORM_FEE_RATE = '0.10';
process.env.MPESA_CALLBACK_SECRET = 'test-secret';
// Keep the mock simulator's timers from firing during a test run.
process.env.MPESA_MOCK_DELAY_MS = '999999';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

const pg = new PGlite();
await pg.exec(schema);

const prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) });
await prisma.$connect();

globalThis.__ccTestPrisma = prisma;
globalThis.__ccPglite = pg;

// Truncate every table — call from beforeEach().
export async function resetDb() {
  const { rows } = await pg.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const names = rows.map((r) => `"${r.tablename}"`).join(', ');
  if (names) await pg.exec(`TRUNCATE ${names} RESTART IDENTITY CASCADE;`);
}

export { prisma as testPrisma };
