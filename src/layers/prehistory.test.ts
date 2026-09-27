import { describe, expect, it } from 'vitest';
import type { Route } from '../data/prehistory';
import { travelled } from './prehistory';

const route: Route = {
  id: 't', name: 'Test', species: 'sapiens', note: '',
  path: [[0, 0, 60_000], [10, 0, 50_000], [20, 0, 40_000]],
};

describe('travelled', () => {
  it('is empty before the route starts', () => {
    expect(travelled(route, 61_000)).toBeNull();
  });
  it('stops part-way along the current leg', () => {
    const pts = travelled(route, 45_000)!;
    expect(pts).toHaveLength(3);
    expect(pts[2][0]).toBeCloseTo(15, 0);
  });
  it('covers the whole route once it is complete', () => {
    expect(travelled(route, 30_000)).toEqual([[0, 0], [10, 0], [20, 0]]);
  });
  it('disappears after an excursion ends', () => {
    expect(travelled({ ...route, endsAt: 35_000 }, 30_000)).toBeNull();
  });
});
