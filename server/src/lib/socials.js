// Normalise the handful of social fields a user can add to their profile.
// Accepts a full URL or a bare handle/number and returns a clickable URL,
// or null if the value is empty / obviously invalid.

const PLATFORMS = {
  tiktok: (v) => `https://www.tiktok.com/@${strip(v, ['@'])}`,
  instagram: (v) => `https://instagram.com/${strip(v, ['@'])}`,
  x: (v) => `https://x.com/${strip(v, ['@'])}`,
  facebook: (v) => `https://facebook.com/${strip(v)}`,
  youtube: (v) => `https://youtube.com/${v.startsWith('@') || v.startsWith('channel/') || v.startsWith('c/') ? '' : '@'}${strip(v)}`,
  linkedin: (v) => `https://www.linkedin.com/in/${strip(v)}`,
  whatsapp: (v) => `https://wa.me/${toIntlDigits(v)}`,
  website: (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`),
};

export const SOCIAL_KEYS = Object.keys(PLATFORMS);

// Kenyan number -> international digits for wa.me (0712… -> 254712…).
function toIntlDigits(v) {
  const d = v.replace(/[^\d]/g, '');
  if (d.startsWith('254')) return d;
  if (d.startsWith('0')) return `254${d.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(d)) return `254${d}`;
  return d;
}

function strip(v, extra = []) {
  let s = v.trim();
  s = s.replace(/^https?:\/\/(www\.)?[^/]+\//i, ''); // drop a leading URL/host
  for (const ch of ['/', ...extra]) if (s.startsWith(ch)) s = s.slice(ch.length);
  return s.replace(/\/+$/, '');
}

export function normalizeSocials(input) {
  if (input == null) return undefined;
  if (typeof input !== 'object') return {};
  const out = {};
  for (const key of SOCIAL_KEYS) {
    const raw = input[key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    if (key === 'whatsapp' && raw.replace(/[^\d]/g, '').length < 9) continue;
    try {
      const url = PLATFORMS[key](raw.trim());
      if (url && url.length <= 300) out[key] = url;
    } catch {
      /* skip a bad value */
    }
  }
  return out;
}
