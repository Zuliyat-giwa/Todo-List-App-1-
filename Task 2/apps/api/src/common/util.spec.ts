import { clean, orderNumber, sha256, slugify } from './util';

describe('util', () => {
  it('strips HTML and script tags from user input', () => {
    expect(clean('<script>alert(1)</script>Hello <b>world</b>')).toBe('Hello world');
    expect(clean('<img src=x onerror=alert(1)>Jane')).toBe('Jane');
    expect(clean(null)).toBeNull();
  });
  it('slugifies names', () => {
    expect(slugify('Women\'s Abaya & Hijab (Black)!')).toBe('women-s-abaya-hijab-black');
  });
  it('creates unique, well-formed order numbers', () => {
    const a = orderNumber();
    expect(a).toMatch(/^MZ-\d{8}-[0-9A-F]{6}$/);
    expect(new Set(Array.from({ length: 200 }, orderNumber)).size).toBeGreaterThan(190);
  });
  it('hashes tokens deterministically', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).not.toBe(sha256('abd'));
  });
});
