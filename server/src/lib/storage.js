import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

// Object storage with two drivers:
//   local     — files under server/uploads/, served by Express at /uploads/<key>
//   supabase  — a public Supabase Storage bucket (uses the service-role key)
//
// Both expose the same tiny interface: put(), remove(), publicUrl().

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export function extFor(mime) {
  return EXT_BY_MIME[mime] || 'bin';
}

export function newKey(prefix, mime) {
  return `${prefix}/${crypto.randomBytes(12).toString('hex')}.${extFor(mime)}`;
}

// ── local disk ──────────────────────────────────────────────────────────────
const localDriver = {
  async put(key, buffer) {
    const dest = path.join(UPLOADS_DIR, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buffer);
    return { key, url: `${env.selfBaseUrl}/uploads/${key}` };
  },
  async remove(key) {
    await fs.rm(path.join(UPLOADS_DIR, key), { force: true });
  },
};

// ── Supabase Storage ────────────────────────────────────────────────────────
function supabaseDriver() {
  if (!env.storage.supabaseUrl || !env.storage.serviceRoleKey) {
    throw new Error(
      'STORAGE_DRIVER=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env',
    );
  }
  // Lazy import so `local` installs don't pay for it.
  let clientPromise;
  const getClient = async () => {
    if (!clientPromise) {
      clientPromise = import('@supabase/supabase-js').then(async ({ createClient }) => {
        const c = createClient(env.storage.supabaseUrl, env.storage.serviceRoleKey, {
          auth: { persistSession: false },
        });
        // Make sure the bucket exists and is public.
        await c.storage.createBucket(env.storage.bucket, { public: true }).catch(() => {});
        return c;
      });
    }
    return clientPromise;
  };

  return {
    async put(key, buffer, contentType) {
      const c = await getClient();
      const { error } = await c.storage
        .from(env.storage.bucket)
        .upload(key, buffer, { contentType, upsert: true });
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      const { data } = c.storage.from(env.storage.bucket).getPublicUrl(key);
      return { key, url: data.publicUrl };
    },
    async remove(key) {
      const c = await getClient();
      await c.storage.from(env.storage.bucket).remove([key]);
    },
  };
}

const driver = env.storage.driver === 'supabase' ? supabaseDriver() : localDriver;

export const storage = {
  driver: env.storage.driver,
  put: (key, buffer, contentType) => driver.put(key, buffer, contentType),
  remove: (key) => driver.remove(key).catch((err) => console.error('[storage] remove failed:', err.message)),
};
