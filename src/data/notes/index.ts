// Civilisation notes and timeline events beyond the original set in
// civilisations.ts, one file per part of the world. `npm run coverage` shows
// which areas and periods still need notes; `npm run names` finds the border
// polygon names to put in `match`.
import type { CivInput, HistoricEvent } from '../civilisations';
import * as africa from './africa';
import * as africaMore from './africa-more';
import * as asiaMore from './asia-more';
import * as eastAfrica from './east-africa';
import * as europe from './europe';
import * as europeMore from './europe-more';
import * as iranChina from './iran-china';
import * as koreaJapan from './korea-japan';
import * as modern from './modern';
import * as neolithic from './neolithic';
import * as northAmerica from './north-america';
import * as oceania from './oceania';
import * as southAsia from './south-asia';
import * as southeastAsia from './southeast-asia';
import * as steppe from './steppe';

const FILES = [neolithic, koreaJapan, oceania, northAmerica, southeastAsia, eastAfrica, southAsia, iranChina, modern, europe, steppe, africa, europeMore, asiaMore, africaMore];

export const NOTES: CivInput[] = FILES.flatMap((f) => f.notes);
export const NOTE_EVENTS: HistoricEvent[] = FILES.flatMap((f) => f.events);
