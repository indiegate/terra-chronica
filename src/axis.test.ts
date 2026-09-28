import { describe, expect, it } from 'vitest';
import { SECTORS, fromPos, roundBP, sectorOf, toPos } from './axis';
import { PRE_END, PRE_START } from './data/prehistory';

describe('single time axis', () => {
  it('splits the slider 25 / 25 / 50', () => {
    expect(toPos(4540e6)).toBeCloseTo(0);
    expect(toPos(PRE_START)).toBeCloseTo(0.25);
    expect(toPos(PRE_END)).toBeCloseTo(0.5);
    expect(toPos(1950 - 2010)).toBeCloseTo(1);
    expect(SECTORS.reduce((s, x) => s + x.width, 0)).toBe(1);
  });

  it('runs forward in time from left to right', () => {
    let prev = -1;
    for (const bp of [4540e6, 3000e6, 1000e6, 66e6, 8e6, PRE_START, 1e6, 45_000, PRE_END, 1950 - 1, 1950 - 1500, -60]) {
      const p = toPos(bp);
      expect(p, String(bp)).toBeGreaterThan(prev);
      prev = p;
    }
  });

  it('round-trips positions', () => {
    for (const p of [0.05, 0.2, 0.3, 0.45, 0.6, 0.9]) expect(toPos(fromPos(p))).toBeCloseTo(p, 6);
  });

  it('assigns boundaries to the later sector', () => {
    expect(sectorOf(PRE_START)).toBe('pre');
    expect(sectorOf(PRE_START + 1)).toBe('deep');
    expect(sectorOf(PRE_END)).toBe('history');
  });

  it('rounds to each sector’s precision', () => {
    expect(roundBP(123.4e6)).toBe(123e6);
    expect(roundBP(45_123)).toBe(45_100);
    expect(roundBP(1950 - 1066.4)).toBe(1950 - 1066);
  });
});
