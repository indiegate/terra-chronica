// Pure helpers for scripts/coverage.ts (tested in coverage-lib.test.ts).

export interface Bin {
  from: number; // inclusive
  to: number; // exclusive
  /** Short column label: "10k" = from 10,000 BC, "3c" = 3rd century AD. */
  label: string;
}

/**
 * Periods for the coverage grid: `bcStep` years before AD 1, `adStep` years after.
 * The last bin runs to `max` inclusive.
 */
export function coverageBins(min: number, max: number, bcStep = 1000, adStep = 100): Bin[] {
  const bins: Bin[] = [];
  for (let y = min; y < 0; y += bcStep) bins.push({ from: y, to: Math.min(0, y + bcStep), label: `${-y / 1000}k` });
  for (let y = 0; y <= max; y += adStep) bins.push({ from: y, to: Math.min(max + 1, y + adStep), label: adStep === 100 ? `${y / 100 + 1}c` : String(y || 1) });
  return bins;
}

/** How many spans (start–end, inclusive) overlap the bin [from, to). */
export function countByBin(items: { start: number; end: number }[], from: number, to: number): number {
  return items.filter((c) => c.start < to && c.end >= from).length;
}
