// Look up border-polygon names, to write `match` lists for civilisation notes.
//
//   npm run names -- <regex>                  names matching a pattern
//   npm run names -- --box lon0,lat0,lon1,lat1 names whose largest part lies in a box
//   add --unlinked to show only names with no note in some snapshot
//
// Prints each name with its snapshot years, the centre of its largest part and
// its largest share of a snapshot's mapped land.
import { readFileSync } from 'node:fs';
import * as topojson from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { geoArea, geoCentroid, geoNaturalEarth1 } from 'd3';
import { civFor } from '../src/data/civilisations';
import { formatYear } from '../src/format';

const args = process.argv.slice(2);
const boxArg = args.indexOf('--box');
const box = boxArg >= 0 ? args[boxArg + 1].split(',').map(Number) : null;
const unlinkedOnly = args.includes('--unlinked');
const pattern = args.find((a, i) => !a.startsWith('--') && (boxArg < 0 || i !== boxArg + 1));
const re = pattern ? new RegExp(pattern, 'i') : null;

const proj = geoNaturalEarth1().scale(6378137).translate([0, 0]);
const inv = (p: number[]) => proj.invert!([p[0], -p[1]])!;

interface Entry { years: number[]; unlinked: number[]; lon: number; lat: number; share: number }
const out = new Map<string, Entry>();
const snapshots: number[] = JSON.parse(readFileSync('public/data/manifest.json', 'utf8'));
for (const year of snapshots) {
  const topo = JSON.parse(readFileSync(`public/data/borders_${year}.lo.json`, 'utf8')) as Topology;
  const obj = Object.values(topo.objects)[0] as GeometryCollection<{ NAME: string }>;
  const features = (topojson.feature(topo, obj) as GeoJSON.FeatureCollection<GeoJSON.Geometry, { NAME: string }>).features.filter((f) => f.geometry);
  const parts = features.map((f) => {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    let sum = 0;
    let best = { a: 0, c: [0, 0] };
    for (const rings of polys) {
      const poly: GeoJSON.Polygon = { type: 'Polygon', coordinates: rings.map((r) => r.map(inv)) };
      const raw = geoArea(poly);
      const a = raw > 2 * Math.PI ? 4 * Math.PI - raw : raw;
      sum += a;
      if (a > best.a) {
        const c = geoCentroid(poly);
        // An inverted ring's centroid is the antipode of the real one.
        best = { a, c: raw > 2 * Math.PI ? [c[0] > 0 ? c[0] - 180 : c[0] + 180, -c[1]] : c };
      }
    }
    return { name: f.properties.NAME, a: sum, c: best.c };
  });
  const total = parts.reduce((s, p) => s + p.a, 0);
  for (const p of parts) {
    let e = out.get(p.name);
    if (!e) out.set(p.name, (e = { years: [], unlinked: [], lon: 0, lat: 0, share: 0 }));
    if (!e.years.includes(year)) e.years.push(year);
    if (!civFor(p.name, year) && !e.unlinked.includes(year)) e.unlinked.push(year);
    if (p.a / total > e.share) Object.assign(e, { share: p.a / total, lon: p.c[0], lat: p.c[1] });
  }
}

const span = (ys: number[]) => (ys.length === 1 ? formatYear(ys[0]) : `${formatYear(ys[0])} – ${formatYear(ys[ys.length - 1])}`);
const rows = [...out]
  .filter(([n, e]) => (!re || re.test(n)) && (!box || (e.lon >= box[0] && e.lon <= box[2] && e.lat >= box[1] && e.lat <= box[3])))
  .filter(([, e]) => !unlinkedOnly || e.unlinked.length)
  .sort((a, b) => a[1].years[0] - b[1].years[0] || b[1].share - a[1].share);
for (const [name, e] of rows) {
  console.log(`${JSON.stringify(name)}  ${span(e.years)} [${e.years.join(',')}]  @${e.lon.toFixed(1)},${e.lat.toFixed(1)}  ${(e.share * 100).toFixed(2)}%${e.unlinked.length && e.unlinked.length < e.years.length ? `  unlinked: ${e.unlinked.join(',')}` : e.unlinked.length ? '' : '  (linked)'}`);
}
console.log(`${rows.length} names`);
