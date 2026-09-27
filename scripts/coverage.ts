// How evenly the hand-written notes cover human history (10,000 BC – AD 2010).
//
//   npm run coverage            report
//   npm run coverage -- --all   also list every unlinked polygon, not just large ones
//
// Prints:
//   1. civilisation notes per world area × period (millennia BC, centuries AD)
//   2. timeline events per world area × 500 years
//   3. large border polygons with no linked note, by name
//
// Areas are defined in src/data/regions.ts. A dot marks an empty cell.
import { readFileSync } from 'node:fs';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { geoArea, geoNaturalEarth1 } from 'd3';
import { AREAS } from '../src/data/regions';
import { CIVILISATIONS, EVENTS, civFor } from '../src/data/civilisations';
import { EVENT_GAPS } from '../src/data/notes/events';
import { formatYear, isPeoples } from '../src/format';
import { coverageBins, countByBin } from './coverage-lib';

const MIN_YEAR = -10000;
const MAX_YEAR = 2010;
/**
 * A polygon covering this share of a snapshot's mapped land (or more) should have a note.
 * Early snapshots map few areas, so their shares run high.
 */
const LARGE = 0.005;
const showAll = process.argv.includes('--all');

const bins = coverageBins(MIN_YEAR, MAX_YEAR);
const w = Math.max(...AREAS.map((a) => a.length)) + 2;

function matrix(
  title: string,
  columns: { from: number; to: number; label: string }[],
  count: (area: string, from: number, to: number) => number,
  gap: (area: string, from: number) => boolean = () => false,
) {
  console.log(`\n${title}\n`);
  const cw = Math.max(...columns.map((c) => c.label.length)) + 1;
  const bc = columns.filter((c) => c.from < 0).length;
  console.log(' '.repeat(w) + 'BC (thousands of years)'.padEnd(bc * cw) + 'AD');
  console.log(' '.repeat(w) + columns.map((c) => c.label.padStart(cw)).join(''));
  let empty = 0;
  for (const area of AREAS) {
    const cells = columns.map((c) => {
      const n = count(area, c.from, c.to);
      if (!n && gap(area, c.from)) return 'g';
      if (!n) empty++;
      return n === 0 ? '·' : n > 9 ? '+' : String(n);
    });
    console.log(area.padEnd(w) + cells.map((c) => c.padStart(cw)).join(''));
  }
  console.log(`\n${empty} of ${AREAS.length * columns.length} cells empty`);
}

// 1. Notes
matrix('Civilisation notes per area (· = none)', bins, (area, from, to) =>
  countByBin(CIVILISATIONS.filter((c) => (c.areas as string[]).includes(area)), from, to));

// 2. Events: millennia before 3000 BC, then 500-year steps
const eventBins = coverageBins(MIN_YEAR, MAX_YEAR, 500, 500, { before: -3000, step: 1000 });
// Acknowledged gaps (g) count as covered, but only in deep prehistory.
const badGaps = EVENT_GAPS.filter((g) => g.from >= -1000 || !eventBins.some((b) => b.from === g.from));
if (badGaps.length) throw new Error(`Event gaps must be bins before 1000 BC: ${badGaps.map((g) => `${g.area} ${g.from}`).join(', ')}`);
matrix(
  'Timeline events per area (· = none, g = acknowledged gap; millennia before 3000 BC, then 500 years)',
  eventBins,
  (area, from, to) => EVENTS.filter((e) => e.area === area && e.year >= from && e.year < to).length,
  (area, from) => EVENT_GAPS.some((g) => g.area === area && g.from === from),
);
console.log(`Acknowledged gaps: ${EVENT_GAPS.length} (see src/data/notes/events.ts)`);
console.log(`World-wide events (not counted above): ${EVENTS.filter((e) => e.area === 'World').length}`);

// 3. Large polygons without a note
// The data is pre-projected to Natural Earth metres; project back to lon/lat for areas.
const EARTH_RADIUS = 6378137;
const proj = geoNaturalEarth1().scale(EARTH_RADIUS).translate([0, 0]);
const invert = (p: number[]) => {
  const ll = proj.invert!([p[0], -p[1]])!;
  return [ll[0], ll[1]];
};
/** Area of a projected (Multi)Polygon on the unit sphere (steradians). */
function sphericalArea(g: GeoJSON.Geometry): number {
  const parts = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  let sum = 0;
  for (const rings of parts) {
    const a = geoArea({ type: 'Polygon', coordinates: rings.map((r) => r.map(invert)) });
    // Ring winding doesn't survive the round trip reliably; a polygon is never
    // more than half the sphere, so take the small side.
    sum += a > 2 * Math.PI ? 4 * Math.PI - a : a;
  }
  return sum;
}

const snapshots: number[] = JSON.parse(readFileSync('public/data/manifest.json', 'utf8'));
const missing = new Map<string, { years: number[]; share: number; peoples: boolean }>();
for (const year of snapshots.filter((y) => y >= MIN_YEAR && y <= MAX_YEAR)) {
  const topo = JSON.parse(readFileSync(`public/data/borders_${year}.lo.json`, 'utf8')) as Topology;
  const obj = Object.values(topo.objects)[0] as GeometryCollection<{ NAME: string }>;
  const features = (topojson.feature(topo, obj) as GeoJSON.FeatureCollection<GeoJSON.Geometry, { NAME: string }>).features.filter((f) => f.geometry);
  const areas = features.map((f) => sphericalArea(f.geometry));
  const total = areas.reduce((s, a) => s + a, 0);
  // A name can have several polygons; judge it by their sum.
  const byName = new Map<string, number>();
  features.forEach((f, i) => byName.set(f.properties.NAME, (byName.get(f.properties.NAME) ?? 0) + areas[i]));
  for (const [name, a] of byName) {
    const share = a / total;
    if (civFor(name, year) || (!showAll && share < LARGE)) continue;
    const m = missing.get(name) ?? { years: [], share: 0, peoples: isPeoples(name) };
    m.years.push(year);
    m.share = Math.max(m.share, share);
    missing.set(name, m);
  }
}

const rows = [...missing].sort((a, b) => b[1].share - a[1].share);
console.log(`\nPolygons with no note${showAll ? '' : ` (≥ ${LARGE * 100}% of mapped land in some snapshot)`}: ${rows.length}\n`);
for (const [name, m] of rows) {
  const span = m.years.length === 1 ? formatYear(m.years[0]) : `${formatYear(m.years[0])} – ${formatYear(m.years[m.years.length - 1])}`;
  console.log(`  ${(m.share * 100).toFixed(1).padStart(5)}%  ${name.trim() || '(unnamed)'}${m.peoples ? ' (peoples)' : ''}  ·  ${span} (${m.years.length} surveys)`);
}
