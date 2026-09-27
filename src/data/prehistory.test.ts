import { describe, expect, it } from 'vitest';
import { EPOCHS, PRE_END, PRE_EVENTS, PRE_START, RANGES, ROUTES, SITES, SPECIES_BY_ID, STAGES, epochAt, speciesAt, stageAt } from './prehistory';

describe('prehistory data', () => {
  it('epochs and stages tile the slider without gaps', () => {
    for (const list of [EPOCHS, STAGES]) {
      expect(list[0].start).toBe(PRE_START);
      expect(list.at(-1)!.end).toBe(PRE_END);
      for (let i = 1; i < list.length; i++) expect(list[i].start).toBe(list[i - 1].end);
    }
    expect(epochAt(45_000).name).toBe('Late Pleistocene');
    expect(stageAt(1_000_000).name).toBe('Acheulean');
  });

  it('sites have valid places, dates and species', () => {
    for (const s of SITES) {
      expect(Math.abs(s.lon), s.name).toBeLessThanOrEqual(180);
      expect(Math.abs(s.lat), s.name).toBeLessThanOrEqual(90);
      expect(s.from, s.name).toBeGreaterThanOrEqual(s.to);
      expect(s.to, s.name).toBeGreaterThanOrEqual(PRE_END);
      expect(SPECIES_BY_ID.has(s.species), s.name).toBe(true);
    }
  });

  it('events fall on the slider', () => {
    for (const e of PRE_EVENTS) expect(e.value >= PRE_END && e.value <= PRE_START, e.label).toBe(true);
  });

  it('ranges never cross the antimeridian', () => {
    for (const r of RANGES) {
      const lons = r.ring.map((p) => p[0]);
      expect(Math.max(...lons) - Math.min(...lons), r.species).toBeLessThan(180);
      expect(r.from).toBeGreaterThan(r.to);
    }
  });

  it('routes run forward in time', () => {
    for (const r of ROUTES) {
      for (let i = 1; i < r.path.length; i++) expect(r.path[i][2], `${r.id} #${i}`).toBeLessThanOrEqual(r.path[i - 1][2]);
    }
  });

  it('finds who was alive', () => {
    const at50k = speciesAt(50_000).map((s) => s.id);
    expect(at50k).toEqual(expect.arrayContaining(['sapiens', 'neanderthal', 'denisovan', 'island']));
    expect(speciesAt(20_000).map((s) => s.id)).toEqual(['sapiens']);
  });
});
