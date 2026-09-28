import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

// A single shared client for the process. `--watch` reloads the whole process,
// so no need to guard against hot-reload duplication here.
//
// Tests inject an in-memory PGlite-backed client via `globalThis.__ccTestPrisma`
// (set in tests/setup/pglite.js before any app module loads).
//
// DB_DRIVER=pglite runs a *persistent* (file-backed) PGlite instance instead of
// the real Supabase connection — same Postgres engine, but in-process, so every
// query is local disk I/O instead of a ~3s round trip to eu-west-1. Useful for
// fast local dev/demos; DATABASE_URL and everything else stays wired for the
// real Supabase-backed deployment. Never used in production (devDependency).
async function createPglitePrisma() {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PrismaPGlite } = await import('pglite-prisma-adapter');

  const dataDir = path.resolve(process.cwd(), '.localdb');
  const isFresh = !existsSync(dataDir);

  const pg = new PGlite(dataDir);
  if (isFresh) {
    const schemaPath = path.resolve(process.cwd(), 'tests/setup/schema.sql');
    await pg.exec(readFileSync(schemaPath, 'utf8'));
    // eslint-disable-next-line no-console
    console.log(`[db] Initialised a fresh local PGlite database at ${dataDir}`);
  }

  const client = new PrismaClient({ adapter: new PrismaPGlite(pg) });
  await client.$connect();
  return client;
}

export const prisma =
  globalThis.__ccTestPrisma ??
  (process.env.DB_DRIVER === 'pglite'
    ? await createPglitePrisma()
    : new PrismaClient({ log: ['warn', 'error'] }));
