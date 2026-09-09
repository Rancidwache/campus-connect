import { describe, it, expect } from 'vitest';
import { extFor, newKey } from '../../src/lib/storage.js';

describe('storage key helpers', () => {
  it('maps mime types to extensions', () => {
    expect(extFor('image/jpeg')).toBe('jpg');
    expect(extFor('image/png')).toBe('png');
    expect(extFor('video/mp4')).toBe('mp4');
    expect(extFor('video/quicktime')).toBe('mov');
    expect(extFor('application/x-weird')).toBe('bin');
  });

  it('builds a prefixed, random, extensioned key', () => {
    const key = newKey('listings/42', 'image/webp');
    expect(key).toMatch(/^listings\/42\/[0-9a-f]{24}\.webp$/);
    expect(newKey('avatars/1', 'image/png')).not.toBe(newKey('avatars/1', 'image/png'));
  });
});
