// Umbrella notes: a note with `covers` (a lon/lat box) also stands for every
// border polygon whose largest part lies in that box, during the note's dates,
// that no other note claims. This fills in the hundreds of small peoples of
// the 1492 Americas or 1600–1815 Australia without listing each by hand.
//
//   npm run umbrella   rewrites src/data/notes/umbrella.json
//
// Run it after changing notes or rebuilding the border data (npm run data does).
import { readFileSync, writeFileSync } from 'node:fs';
import { CIVILISATIONS } from '../src/data/civilisations';
import { polygons } from './polygons';

const FILE = 'src/data/notes/umbrella.json';
const previous: Record<string, string[]> = JSON.parse(readFileSync(FILE, 'utf8'));

// Links as they would be without the generated lists.
const base = CIVILISATIONS.map((c) => {
  const extra = new Set(previous[c.id] ?? []);
  return { ...c, match: c.match.filter((n) => !extra.has(n)) };
});
const byName = new Map<string, typeof base>();
for (const c of base) for (const n of c.match) byName.set(n.trim(), [...(byName.get(n.trim()) ?? []), c]);
const linked = (name: string, year: number) => (byName.get(name.trim()) ?? []).some((c) => year >= c.start && year <= c.end);

const umbrellas = base.filter((c) => c.covers);
const out: Record<string, Set<string>> = {};
for (const p of polygons()) {
  if (linked(p.name, p.year)) continue;
  const u = umbrellas.find((c) => {
    const { box, from = c.start, to = c.end } = c.covers!;
    const boxes = (typeof box[0] === 'number' ? [box] : box) as number[][];
    const inBox = boxes.some(([x0, y0, x1, y1]) => p.lon >= x0 && p.lon <= x1 && p.lat >= y0 && p.lat <= y1);
    return inBox && p.year >= Math.max(from, c.start) && p.year <= Math.min(to, c.end);
  });
  if (u) (out[u.id] ??= new Set()).add(p.name);
}
const json = Object.fromEntries(Object.entries(out).sort().map(([id, names]) => [id, [...names].sort()]));
writeFileSync(FILE, JSON.stringify(json, null, 1) + '\n');
console.log(Object.entries(json).map(([id, n]) => `${id}: ${n.length}`).join(', ') || 'no umbrella notes');
