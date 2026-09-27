import { describe, expect, it } from 'vitest';
import { EarlyEarth, stageOpacity } from './early-earth';

describe('early Earth', () => {
  const stage = { from: 2000, to: 1500 };
  it('cross-fades stages at their boundaries', () => {
    expect(stageOpacity(stage, 1750)).toBe(1);
    expect(stageOpacity(stage, 2000)).toBe(0.5);
    expect(stageOpacity(stage, 1500)).toBe(0.5);
    expect(stageOpacity(stage, 2100)).toBe(0);
    expect(stageOpacity(stage, 1400)).toBe(0);
  });
  it('hands over to the plate model at 1 billion years ago', () => {
    expect(EarlyEarth.weight(1000)).toBe(0);
    expect(EarlyEarth.weight(1050)).toBe(0.5);
    expect(EarlyEarth.weight(3000)).toBe(1);
  });
});
