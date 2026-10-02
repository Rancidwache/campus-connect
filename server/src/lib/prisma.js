import path from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
// A .localdb created before migration tracking existed already contains every
// migration up to and including this one; anything later is applied on startup.
const LOCALDB_BASELINE = '20260928212705_delivery_proof_and_disputes';

// Keeps an existing .localdb (accounts, listings, photos) in step with
// prisma/migrations without wiping it. A fresh DB is built from schema.sql,
// which already reflects every migration (regenerate it with `npm run test:schema`).
async function applyPendingMigrations(pg, isFresh) {
  const root = path.resolve(process.cwd(), 'prisma/migrations');
  const names = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  await pg.exec('CREATE TABLE IF NOT EXISTS _cc_local_migrations (name text PRIMARY KEY)');
  const { rows } = await pg.query('SELECT name FROM _cc_local_migrations');
  const applied = new Set(rows.map((r) => r.name));

  if (applied.size === 0) {
    for (const name of names.filter((n) => isFresh || n <= LOCALDB_BASELINE)) {
      await pg.query('INSERT INTO _cc_local_migrations (name) VALUES ($1)', [name]);
      applied.add(name);
    }
  }

  for (const name of names.filter((n) => !applied.has(n))) {
    const sql = readFileSync(path.join(root, name, 'migration.sql'), 'utf8');
    await pg.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query('INSERT INTO _cc_local_migrations (name) VALUES ($1)', [name]);
    });
    // eslint-disable-next-line no-console
    console.log(`[db] Applied migration ${name} to the local database`);
  }
}

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
  await applyPendingMigrations(pg, isFresh);

  const client = new PrismaClient({ adapter: new PrismaPGlite(pg) });
  await client.$connect();
  return client;
}

export const prisma =
  globalThis.__ccTestPrisma ??
  (process.env.DB_DRIVER === 'pglite'
    ? await createPglitePrisma()
    : new PrismaClient({ log: ['warn', 'error'] }));
