// Where is a polygon? Bounding box and centre for a name in given snapshots.
//   npm run where -- "<name>" [year ...]
import { readFileSync } from 'node:fs';
import * as topojson from 'topojson-client';
import { geoArea, geoBounds, geoCentroid, geoNaturalEarth1 } from 'd3';

const [name, ...ys] = process.argv.slice(2).filter((a) => a !== '--');
const proj = geoNaturalEarth1().scale(6378137).translate([0, 0]);
const inv = (p: number[]) => proj.invert!([p[0], -p[1]])!;
const index: Record<string, number[]> = JSON.parse(readFileSync('public/data/names.json', 'utf8'));
for (const year of ys.length ? ys.map(Number) : index[name] ?? []) {
  const topo = JSON.parse(readFileSync(`public/data/borders_${year}.lo.json`, 'utf8'));
  const obj = Object.values(topo.objects)[0] as never;
  for (const f of (topojson.feature(topo, obj) as unknown as GeoJSON.FeatureCollection).features) {
    if (f.properties?.NAME !== name || !f.geometry) continue;
    const g = f.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const rings of polys) {
      // Winding does not survive the projection round trip reliably: take the smaller side.
      let p: GeoJSON.Polygon = { type: 'Polygon', coordinates: rings.map((r) => r.map(inv)) };
      if (geoArea(p) > 2 * Math.PI) p = { type: 'Polygon', coordinates: p.coordinates.map((r) => [...r].reverse()) };
      const [[x0, y0], [x1, y1]] = geoBounds(p);
      const [cx, cy] = geoCentroid(p);
      if (Math.abs(x1 - x0) + Math.abs(y1 - y0) < 0.5) continue; // skip specks
      console.log(`${year}  ${name}  lon ${x0.toFixed(1)}..${x1.toFixed(1)}  lat ${y0.toFixed(1)}..${y1.toFixed(1)}  centre ${cx.toFixed(1)},${cy.toFixed(1)}  subject=${f.properties?.SUBJECTO}`);
    }
  }
}
