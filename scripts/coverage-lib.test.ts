import { describe, expect, it } from 'vitest';
import { countByBin, coverageBins } from './coverage-lib';

describe('coverageBins', () => {
  it('uses millennia before AD 1 and centuries after', () => {
    const bins = coverageBins(-10000, 2010);
    expect(bins.filter((b) => b.from < 0)).toHaveLength(10);
    expect(bins[0]).toEqual({ from: -10000, to: -9000, label: '10k' });
    expect(bins[9]).toMatchObject({ from: -1000, to: 0 });
    expect(bins[10]).toMatchObject({ from: 0, to: 100, label: '1c' });
  });

  it('ends with a bin that includes the last year', () => {
    const last = coverageBins(-10000, 2010).at(-1)!;
    expect(last).toMatchObject({ from: 2000, to: 2011, label: '21c' });
  });

  it('tiles the range without gaps', () => {
    const bins = coverageBins(-10000, 2010, 500, 500);
    for (let i = 1; i < bins.length; i++) expect(bins[i].from).toBe(bins[i - 1].to);
  });
});

describe('countByBin', () => {
  const rome = { start: -509, end: 476 };
  it('counts spans that overlap the bin', () => {
    expect(countByBin([rome], -1000, 0)).toBe(1);
    expect(countByBin([rome], 400, 500)).toBe(1);
  });
  it('treats the end year as inclusive and the bin end as exclusive', () => {
    expect(countByBin([{ start: -2000, end: -1000 }], -1000, 0)).toBe(1);
    expect(countByBin([{ start: 0, end: 50 }], -1000, 0)).toBe(0);
    expect(countByBin([rome], 500, 600)).toBe(0);
  });
});
