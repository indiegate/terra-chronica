import { describe, expect, it } from 'vitest';
import { deepTime, formatBP, historyTime, within } from './time';

describe('time', () => {
  it('puts both sliders on one axis', () => {
    expect(historyTime(-10000).bp).toBe(11950);
    expect(historyTime(2010).bp).toBe(-60);
    expect(deepTime(66).bp).toBe(66e6);
    expect(deepTime(0.02).bp).toBeCloseTo(20000);
  });

  it('formats BP in the units of its depth', () => {
    expect(formatBP(66e6)).toBe('66 Ma');
    expect(formatBP(45000)).toBe('45,000 years ago');
    expect(formatBP(11950)).toBe('10,000 BC');
    expect(formatBP(-60)).toBe('AD 2010');
  });

  it('checks spans, optionally per slider', () => {
    const ice = { fromBP: 26000, toBP: 7000 };
    expect(within(ice, historyTime(-8000))).toBe(true);
    expect(within(ice, deepTime(0.02))).toBe(true);
    expect(within(ice, historyTime(1))).toBe(false);
    const borders = { fromBP: 11950, toBP: -60, mode: 'history' as const };
    expect(within(borders, deepTime(0.005))).toBe(false);
    expect(within(borders, historyTime(1500))).toBe(true);
  });
});
