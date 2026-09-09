import { describe, it, expect } from 'vitest';
import { normalizeSocials, SOCIAL_KEYS } from '../../src/lib/socials.js';

describe('normalizeSocials', () => {
  it('turns bare handles into full URLs', () => {
    const out = normalizeSocials({
      instagram: '@amina.shoots',
      tiktok: 'aminaframes',
      x: '@amina',
    });
    expect(out.instagram).toBe('https://instagram.com/amina.shoots');
    expect(out.tiktok).toBe('https://www.tiktok.com/@aminaframes');
    expect(out.x).toBe('https://x.com/amina');
  });

  it('converts a Kenyan phone to a wa.me link', () => {
    expect(normalizeSocials({ whatsapp: '0712 000 001' }).whatsapp).toBe('https://wa.me/254712000001');
    expect(normalizeSocials({ whatsapp: '+254712000001' }).whatsapp).toBe('https://wa.me/254712000001');
    expect(normalizeSocials({ whatsapp: '712000001' }).whatsapp).toBe('https://wa.me/254712000001');
  });

  it('drops empty and obviously invalid values', () => {
    const out = normalizeSocials({ instagram: '', x: '   ', whatsapp: '123' });
    expect(out).toEqual({});
  });

  it('adds https:// to a bare website and keeps a full URL', () => {
    expect(normalizeSocials({ website: 'aminacreates.co.ke' }).website).toBe('https://aminacreates.co.ke');
    expect(normalizeSocials({ website: 'https://x.example' }).website).toBe('https://x.example');
  });

  it('accepts a full profile URL and reduces it to the handle', () => {
    expect(normalizeSocials({ instagram: 'https://instagram.com/amina.shoots' }).instagram).toBe(
      'https://instagram.com/amina.shoots',
    );
  });

  it('ignores unknown keys and non-object input', () => {
    expect(normalizeSocials({ myspace: 'x' })).toEqual({});
    expect(normalizeSocials(null)).toBeUndefined();
    expect(normalizeSocials('nope')).toEqual({});
  });

  it('exposes the platform key list', () => {
    expect(SOCIAL_KEYS).toContain('whatsapp');
    expect(SOCIAL_KEYS).toContain('website');
  });
});
