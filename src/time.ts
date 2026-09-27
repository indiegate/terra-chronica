// One time axis for every map layer: years before present (BP, present = AD 1950).
//
// The sliders keep their own units (years AD/BC for human history, millions of
// years for deep time); layers receive a TimeState, so a layer that changes
// within human history (ice, sea level, rivers) and one that changes over
// millions of years share the same scale.

import { formatAgeShort } from './data/geology';
import { formatYear } from './format';

/** The "present" of radiocarbon convention. */
export const PRESENT = 1950;

/** The human-history slider's range (years, negative = BC). */
export const FIRST_YEAR = -10000;
export const LAST_YEAR = 2010;

export type TimeMode = 'deep' | 'prehistory' | 'history';

export interface TimeState {
  /** Years before AD 1950; negative after it. */
  bp: number;
  /** Calendar year (negative = BC) in human history, else null. */
  year: number | null;
  /** Millions of years ago in deep time, else 0. */
  age: number;
  mode: TimeMode;
}

export function historyTime(year: number): TimeState {
  return { bp: PRESENT - year, year, age: 0, mode: 'history' };
}

export function deepTime(ma: number): TimeState {
  return { bp: ma * 1e6, year: null, age: ma, mode: 'deep' };
}

export function prehistoryTime(bp: number): TimeState {
  return { bp, year: null, age: bp / 1e6, mode: 'prehistory' };
}

/** Human-readable date for a BP value, in the units a reader expects at that depth. */
export function formatBP(bp: number): string {
  if (bp >= 1e6) return formatAgeShort(bp / 1e6);
  if (bp > PRESENT + 10000) return `${Math.round(bp / 1000).toLocaleString('en-GB')},000 years ago`;
  return formatYear(PRESENT - bp);
}

/** A span of time, oldest first, in BP. */
export interface Span {
  fromBP: number;
  toBP: number;
  /** Only on this slider (e.g. borders, which deep time never draws). */
  mode?: TimeMode;
}

/** All of human history, on its own slider. */
export const HISTORY_SPAN: Span = { fromBP: PRESENT - FIRST_YEAR, toBP: PRESENT - LAST_YEAR, mode: 'history' };

export function within(span: Span, t: TimeState): boolean {
  return t.bp <= span.fromBP && t.bp >= span.toBP && (!span.mode || span.mode === t.mode);
}
