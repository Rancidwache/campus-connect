import { PrismaClient } from '@prisma/client';

// A single shared client for the process. `--watch` reloads the whole process,
// so no need to guard against hot-reload duplication here.
//
// Tests inject an in-memory PGlite-backed client via `globalThis.__ccTestPrisma`
// (set in tests/setup/pglite.js before any app module loads).
export const prisma =
  globalThis.__ccTestPrisma ?? new PrismaClient({ log: ['warn', 'error'] });
