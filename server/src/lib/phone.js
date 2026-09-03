import { badRequest } from './errors.js';

// Normalise Kenyan phone input to E.164 (+2547XXXXXXXX / +2541XXXXXXXX).
// Accepts: 0712345678, 712345678, 254712345678, +254712345678, with spaces/dashes.
export function normalizeKePhone(input) {
  if (typeof input !== 'string') throw badRequest('Phone number is required');
  const digits = input.replace(/[\s\-()]/g, '');

  let m;
  if ((m = digits.match(/^\+?254(7\d{8}|1\d{8})$/))) return `+254${m[1]}`;
  if ((m = digits.match(/^0(7\d{8}|1\d{8})$/))) return `+254${m[1]}`;
  if ((m = digits.match(/^(7\d{8}|1\d{8})$/))) return `+254${m[1]}`;

  throw badRequest('Enter a valid Kenyan phone number, e.g. 0712345678');
}
