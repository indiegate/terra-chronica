// Civilisation notes and timeline events beyond the original set in
// civilisations.ts, one file per part of the world. `npm run coverage` shows
// which areas and periods still need notes; `npm run names` finds the border
// polygon names to put in `match`.
import type { CivInput, HistoricEvent } from '../civilisations';
import * as koreaJapan from './korea-japan';
import * as neolithic from './neolithic';
import * as northAmerica from './north-america';
import * as oceania from './oceania';

const FILES = [neolithic, koreaJapan, oceania, northAmerica];

export const NOTES: CivInput[] = FILES.flatMap((f) => f.notes);
export const NOTE_EVENTS: HistoricEvent[] = FILES.flatMap((f) => f.events);
