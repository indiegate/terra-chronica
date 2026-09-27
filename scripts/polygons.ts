// Shared by the authoring scripts: every border polygon name in every snapshot,
// with the centre of its largest part and its share of the snapshot's mapped land.
import { readFileSync } from 'node:fs';
import * as topojson from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { geoArea, geoCentroid, geoNaturalEarth1 } from 'd3';

export interface PolygonRecord {
  year: number;
  name: string;
  lon: number;
  lat: number;
  /** Share of the snapshot's mapped land (all parts with this name). */
  share: number;
}

const proj = geoNaturalEarth1().scale(6378137).translate([0, 0]);
const inv = (p: number[]) => proj.invert!([p[0], -p[1]])!;

export function snapshotYears(): number[] {
  return JSON.parse(readFileSync('public/data/manifest.json', 'utf8'));
}

/** One record per name per snapshot. */
export function polygons(years = snapshotYears()): PolygonRecord[] {
  const out: PolygonRecord[] = [];
  for (const year of years) {
    const topo = JSON.parse(readFileSync(`public/data/borders_${year}.lo.json`, 'utf8')) as Topology;
    const obj = Object.values(topo.objects)[0] as GeometryCollection<{ NAME: string }>;
    const features = (topojson.feature(topo, obj) as GeoJSON.FeatureCollection<GeoJSON.Geometry, { NAME: string }>).features.filter((f) => f.geometry);
    const byName = new Map<string, { a: number; best: number; c: number[] }>();
    let total = 0;
    for (const f of features) {
      const g = f.geometry;
      const parts = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      for (const rings of parts) {
        let poly: GeoJSON.Polygon = { type: 'Polygon', coordinates: rings.map((r) => r.map(inv)) };
        let a = geoArea(poly);
        // Winding does not survive the projection round trip reliably: take the smaller side.
        if (a > 2 * Math.PI) {
          poly = { type: 'Polygon', coordinates: poly.coordinates.map((r) => [...r].reverse()) };
          a = 4 * Math.PI - a;
        }
        total += a;
        const e = byName.get(f.properties.NAME) ?? { a: 0, best: 0, c: [0, 0] };
        e.a += a;
        if (a > e.best) Object.assign(e, { best: a, c: geoCentroid(poly) });
        byName.set(f.properties.NAME, e);
      }
    }
    for (const [name, e] of byName) out.push({ year, name, lon: e.c[0], lat: e.c[1], share: e.a / total });
  }
  return out;
}
