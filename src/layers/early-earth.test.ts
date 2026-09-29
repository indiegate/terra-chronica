import { describe, expect, it } from 'vitest';
import { geoDistance } from 'd3';
import { MAX_AGE } from '../data/geology';
import { EarlyEarth, SUPERCONTINENTS, cratonScale, keyframes, labelOpacity, positionAt } from './early-earth';

const RODINIA: [number, number] = [60, -10];
const frames = keyframes(RODINIA);
const deg = (a: [number, number], b: [number, number]) => (geoDistance(a, b) * 180) / Math.PI;

describe('early Earth', () => {
  it('moves the cratons smoothly: no jumps between nearby ages', () => {
    for (const fr of frames) {
      let prev = positionAt(fr, 4540);
      for (let age = 4539; age >= MAX_AGE; age -= 1) {
        const p = positionAt(fr, age);
        // Under a degree per million years (about 11 cm a year), as fast as plates move.
        expect(deg(prev, p)).toBeLessThan(1);
        prev = p;
      }
    }
  });

  it('assembles Rodinia where the plate model puts it', () => {
    const ps = frames.map((fr) => positionAt(fr, MAX_AGE));
    const v = ps.map(([lon, lat]) => [Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180), Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180), Math.sin((lat * Math.PI) / 180)]);
    const [x, y, z] = [0, 1, 2].map((i) => v.reduce((s, p) => s + p[i], 0));
    const centre: [number, number] = [(Math.atan2(y, x) * 180) / Math.PI, (Math.asin(z / Math.hypot(x, y, z)) * 180) / Math.PI];
    expect(deg(centre, RODINIA)).toBeLessThan(0.01);
    expect(Math.max(...ps.map((p) => deg(p, RODINIA)))).toBeLessThan(45);
  });

  it('gathers each supercontinent while it stands', () => {
    for (const s of SUPERCONTINENTS) {
      const age = (s.from + s.to) / 2;
      const ps = s.members.map((m) => positionAt(frames[m], age));
      for (const a of ps) for (const b of ps) expect(deg(a, b), s.name).toBeLessThan(80);
    }
  });

  it('grows the cratons from specks of the first crust', () => {
    expect(cratonScale(4400)).toBeCloseTo(0.2);
    expect(cratonScale(2500)).toBe(1);
    expect(cratonScale(3000)).toBeGreaterThan(cratonScale(4000));
  });

  it('fades supercontinent names in and out', () => {
    const s = { from: 2000, to: 1500 };
    expect(labelOpacity(s, 1750)).toBe(1);
    expect(labelOpacity(s, 2000)).toBe(0);
    expect(labelOpacity(s, 1970)).toBe(0.5);
  });

  it('melts at the start and crusts over', () => {
    expect(EarlyEarth.magma(4540)).toEqual({ alpha: 1, heat: 1 });
    expect(EarlyEarth.magma(4380).alpha).toBe(0);
    expect(EarlyEarth.magma(4440).heat).toBeCloseTo(0.5);
  });

  it('hands over to the plate model at 1 billion years ago', () => {
    expect(EarlyEarth.weight(1000)).toBe(0);
    expect(EarlyEarth.weight(1050)).toBe(0.5);
    expect(EarlyEarth.weight(3000)).toBe(1);
  });
});
