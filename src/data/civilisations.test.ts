import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CIVILISATIONS, EVENTS, civFor } from './civilisations';

const names: Record<string, number[]> = JSON.parse(readFileSync('public/data/names.json', 'utf8'));

describe('civilisation notes', () => {
  it('have unique ids', () => {
    const ids = CIVILISATIONS.map((c) => c.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('have consistent dates, and somewhere to fly to', () => {
    for (const c of CIVILISATIONS) {
      expect(c.start, c.id).toBeLessThanOrEqual(c.peak);
      expect(c.peak, c.id).toBeLessThanOrEqual(c.end);
      expect(c.capitals.length > 0 || c.place !== undefined, `${c.id} needs a capital or a place`).toBe(true);
      for (const k of c.capitals) expect(k.from <= k.to && Math.abs(k.lon) <= 180 && Math.abs(k.lat) <= 90, `${c.id}: ${k.name}`).toBe(true);
    }
  });

  it('match polygon names that exist in the border snapshots', () => {
    const missing = CIVILISATIONS.flatMap((c) => c.match.filter((n) => !names[n.trim()]).map((n) => `${c.id}: ${n}`));
    expect(missing).toEqual([]);
  });

  it('match at least one snapshot within their own dates (or none at all)', () => {
    const idle = CIVILISATIONS.filter((c) => c.match.length && !c.match.some((n) => names[n.trim()].some((y) => y >= c.start && y <= c.end)));
    expect(idle.map((c) => c.id)).toEqual([]);
  });

  it('links names regardless of stray spaces', () => {
    expect(civFor('Zacateco ', 1492)?.id).toBe(civFor('Zacateco', 1492)?.id);
    expect(civFor('Zacateco ', 1492)).toBeDefined();
  });

  it('never draws a modern state before it existed', () => {
    // Names that only ever meant the modern state (so no medieval namesake).
    const founded: Record<string, number> = {
      Israel: 1948, Pakistan: 1947, Bangladesh: 1971, Malaysia: 1963, 'Sri Lanka': 1972, Thailand: 1939, Iran: 1935,
      'Saudi Arabia': 1932, 'United Arab Emirates': 1971, Zambia: 1964, Zimbabwe: 1980, Botswana: 1966, Namibia: 1990,
      Lesotho: 1966, Malawi: 1964, 'Tanzania, United Republic of': 1964, 'Burkina Faso': 1984, Guyana: 1966,
      Suriname: 1975, Belize: 1981, 'Papua New Guinea': 1975, Djibouti: 1977, 'Equatorial Guinea': 1968,
      'Guinea-Bissau': 1974, 'Central African Republic': 1960, 'Western Sahara': 1976, Finland: 1917, Ukraine: 1991,
    };
    const early = Object.entries(founded).flatMap(([n, y]) => (names[n] ?? []).filter((s) => s < y).map((s) => `${n} in ${s}`));
    expect(early).toEqual([]);
  });

  it('events fall inside human history', () => {
    for (const e of EVENTS) expect(e.year >= -10000 && e.year <= 2010, e.label).toBe(true);
  });
});
