// The single time slider: one axis in years before present (BP, present =
// AD 1950), split into three sectors that keep their own scales:
//
//   deep time   4.54 billion – 7 million years ago   25%   (Precambrian compressed, then √age)
//   prehistory  7 million years ago – 10,000 BC       25%   (log of years ago)
//   history     10,000 BC – AD 2010                   50%   (piecewise, recent centuries wider)
import { EARTH_AGE, MAX_AGE, formatAge, formatAgeShort } from './data/geology';
import { PRE_END, PRE_START } from './data/prehistory';
import { formatYear } from './format';
import { FIRST_YEAR, LAST_YEAR, PRESENT } from './time';

export type Sector = 'deep' | 'pre' | 'history';

export const SECTORS: { id: Sector; name: string; from: number; to: number; width: number }[] = [
  { id: 'deep', name: 'Deep time', from: EARTH_AGE * 1e6, to: PRE_START, width: 0.25 },
  { id: 'pre', name: 'Prehistory', from: PRE_START, to: PRE_END, width: 0.25 },
  { id: 'history', name: 'History', from: PRE_END, to: PRESENT - LAST_YEAR, width: 0.5 },
];

const [DEEP, PRE, HIST] = SECTORS;
const PRE_POS = DEEP.width;
const HIST_POS = DEEP.width + PRE.width;

/** Which sector a BP value falls in; the boundaries belong to the later sector. */
export function sectorOf(bp: number): Sector {
  return bp > PRE_START ? 'deep' : bp > PRE_END ? 'pre' : 'history';
}

export function sectorWidth(bp: number): number {
  return SECTORS.find((s) => s.id === sectorOf(bp))!.width;
}

// Deep time, in millions of years: the first 3.5 billion years take 16% of the
// sector, then a square-root scale of age (the Precambrian about a quarter;
// Paleozoic, Mesozoic and Cenozoic roughly equal).
const EARLY_W = 0.16;
const deepRaw = (ma: number) =>
  ma > MAX_AGE
    ? (EARLY_W * (EARTH_AGE - Math.min(ma, EARTH_AGE))) / (EARTH_AGE - MAX_AGE)
    : EARLY_W + (1 - EARLY_W) * (1 - Math.sqrt(Math.max(0, ma) / MAX_AGE));
const deepRawInv = (q: number) => (q < EARLY_W ? EARTH_AGE - (q / EARLY_W) * (EARTH_AGE - MAX_AGE) : MAX_AGE * (1 - (q - EARLY_W) / (1 - EARLY_W)) ** 2);
const DEEP_END_RAW = deepRaw(PRE_START / 1e6);

// Prehistory: log of years before present.
const LOG_START = Math.log(PRE_START);
const LOG_END = Math.log(PRE_END);

// History: piecewise-linear in calendar years.
const H_YEARS = [FIRST_YEAR, -3000, -1000, 1, 1000, 1500, 1800, LAST_YEAR];
const H_STOPS = [0, 0.14, 0.3, 0.46, 0.63, 0.76, 0.88, 1];
function interp(xs: number[], ys: number[], v: number) {
  let i = 1;
  while (i < xs.length - 1 && v > xs[i]) i++;
  return ys[i - 1] + ((v - xs[i - 1]) / (xs[i] - xs[i - 1])) * (ys[i] - ys[i - 1]);
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** BP → slider position, 0 (the Earth forms) to 1 (AD 2010). */
export function toPos(bp: number): number {
  const s = sectorOf(bp);
  if (s === 'deep') return DEEP.width * (deepRaw(Math.min(bp / 1e6, EARTH_AGE)) / DEEP_END_RAW);
  if (s === 'pre') return PRE_POS + PRE.width * ((LOG_START - Math.log(bp)) / (LOG_START - LOG_END));
  const year = clamp(PRESENT - bp, FIRST_YEAR, LAST_YEAR);
  return HIST_POS + HIST.width * interp(H_YEARS, H_STOPS, year);
}

/** Slider position → BP. */
export function fromPos(p: number): number {
  const q = clamp(p, 0, 1);
  if (q < PRE_POS) return deepRawInv((q / DEEP.width) * DEEP_END_RAW) * 1e6;
  if (q < HIST_POS) return Math.exp(LOG_START - ((q - PRE_POS) / PRE.width) * (LOG_START - LOG_END));
  return PRESENT - interp(H_STOPS, H_YEARS, (q - HIST_POS) / HIST.width);
}

/** Tidy a scrubbed value to the precision that makes sense at its depth. */
export function roundBP(bp: number): number {
  const s = sectorOf(bp);
  if (s === 'deep') {
    const ma = bp / 1e6;
    return (ma >= 1000 ? Math.round(ma / 10) * 10 : ma >= 10 ? Math.round(ma) : Math.round(ma * 10) / 10) * 1e6;
  }
  if (s === 'pre') {
    const step = bp >= 1e6 ? 10_000 : bp >= 100_000 ? 1000 : bp >= 20_000 ? 100 : 50;
    return Math.max(PRE_END + 50, Math.round(bp / step) * step);
  }
  return PRESENT - (Math.round(PRESENT - bp) || 1);
}

/** A number of years ago, split into number and unit (for prehistory). */
export function yearsAgoParts(bp: number): [string, string] {
  if (bp >= 1e6) return [(bp / 1e6).toFixed(2).replace(/\.?0+$/, ''), 'million years ago'];
  const step = bp >= 100_000 ? 1000 : 100;
  return [(Math.round(bp / step) * step).toLocaleString('en-GB'), 'years ago'];
}

export const formatYearsAgo = (bp: number) => (bp <= PRE_END ? '10,000 BC' : yearsAgoParts(bp).join(' '));

/** Long form, in each sector’s natural unit. */
export function formatBP(bp: number): string {
  const s = sectorOf(bp);
  if (s === 'deep') return formatAge(bp / 1e6);
  if (s === 'pre') return formatYearsAgo(bp);
  return formatYear(PRESENT - bp);
}

/** Short form for tick labels. */
export function formatBPShort(bp: number): string {
  const s = sectorOf(bp);
  if (s === 'deep') return formatAgeShort(bp / 1e6);
  if (s === 'pre') return bp >= 1e6 ? `${+(bp / 1e6).toFixed(1)} Ma` : `${Math.round(bp / 1000)} ka`;
  return formatYear(PRESENT - bp);
}

/** Tick values, oldest first, in BP. */
export const TICKS: number[] = [
  ...[4540, 3000, 2000, 1000, 539, 252, 66].map((ma) => ma * 1e6),
  ...[5e6, 2e6, 1e6, 300e3, 100e3, 30e3],
  ...[-10000, -5000, -3000, -1000, 1, 500, 1000, 1500, 1800, 2000].map((y) => PRESENT - y),
];
