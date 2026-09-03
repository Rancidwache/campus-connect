import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// A single shared client for the process. `--watch` reloads the whole process,
// so no need to guard against hot-reload duplication here.
export const prisma = new PrismaClient({
  log: env.isProd ? ['warn', 'error'] : ['warn', 'error'],
});
