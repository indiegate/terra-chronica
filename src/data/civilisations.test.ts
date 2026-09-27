import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CIVILISATIONS, EVENTS } from './civilisations';

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
    const missing = CIVILISATIONS.flatMap((c) => c.match.filter((n) => !names[n]).map((n) => `${c.id}: ${n}`));
    expect(missing).toEqual([]);
  });

  it('match at least one snapshot within their own dates (or none at all)', () => {
    const idle = CIVILISATIONS.filter((c) => c.match.length && !c.match.some((n) => names[n].some((y) => y >= c.start && y <= c.end)));
    expect(idle.map((c) => c.id)).toEqual([]);
  });

  it('events fall inside human history', () => {
    for (const e of EVENTS) expect(e.year >= -10000 && e.year <= 2010, e.label).toBe(true);
  });
});
