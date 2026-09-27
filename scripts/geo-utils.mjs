// Geometry helpers shared by the build scripts.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { feature } from 'topojson-client';

export const mapshaper = (...args) => execFileSync('npx', ['mapshaper', '-quiet', ...args], { stdio: 'inherit' });

/**
 * world-atlas (and GPlates) join shapes across the 180° meridian. Planar tools
 * read such a ring as spanning the whole map, so cut it into one part per side.
 * `prepare` may adjust the features first.
 */
export function cutAntimeridian(topoPath, object, out, prepare) {
  const topo = JSON.parse(readFileSync(topoPath, 'utf8'));
  const fc = feature(topo, topo.objects[object]);
  const features = fc.type === 'FeatureCollection' ? fc.features : [fc];
  prepare?.(features);
  cutFeatures(features, out);
}

/** Write `features` (lon/lat polygons) to `out` as GeoJSON, cut at ±180°. */
export function cutFeatures(features, out) {
  const cut = features.filter((f) => f.geometry).map((f) => {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const parts = [];
    for (const rings of polys) {
      // Rings that are just a sliver at a pole (world-atlas 1:50m has one as a
      // "hole" in Antarctica) make planar tools drop the whole polygon.
      const unwrapped = rings.filter((r) => !r.every(([, lat]) => Math.abs(lat) > 89.99)).map(unwrapRing);
      if (!unwrapped.length) continue;
      const xs = unwrapped.flat().map((p) => p[0]);
      parts.push(unwrapped);
      // The part that ran past ±180° is also added on the other side of the map.
      if (Math.max(...xs) > 180) parts.push(shift(unwrapped, -360));
      if (Math.min(...xs) < -180) parts.push(shift(unwrapped, 360));
    }
    for (const rings of parts) rings.forEach((r, i) => windPlanar(r, i === 0));
    return { type: 'Feature', properties: f.properties ?? {}, geometry: { type: 'MultiPolygon', coordinates: parts } };
  });
  const tmp = `${out}.unwrapped.json`;
  writeFileSync(tmp, JSON.stringify({ type: 'FeatureCollection', features: cut }));
  mapshaper('-i', tmp, '-clip', 'bbox=-180,-90,180,90', '-o', out, 'force');
}

/** Make a ring's longitudes continuous; close pole-encircling rings along the pole. */
export function unwrapRing(ring) {
  const out = [[...ring[0]]];
  let offset = 0;
  for (let i = 1; i < ring.length; i++) {
    const dx = ring[i][0] - ring[i - 1][0];
    if (dx > 180) offset -= 360;
    else if (dx < -180) offset += 360;
    out.push([ring[i][0] + offset, ring[i][1]]);
  }
  if (offset !== 0) {
    // Encircles a pole (Antarctica): run the ring down to the pole and back.
    const pole = out[0][1] < 0 ? -90 : 90;
    const last = out[out.length - 1];
    out.push([last[0], pole], [out[0][0], pole], [...out[0]]);
  }
  return out;
}

export function shift(rings, dx) {
  return rings.map((r) => r.map(([x, y]) => [x + dx, y]));
}

/** Shapefile winding, which mapshaper expects: outer rings clockwise, holes anticlockwise. */
export function windPlanar(ring, outer) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) a += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  if ((a > 0) !== outer) ring.reverse();
}

/** Polygons of a GPML feature collection, with plate id and lifespan (Ma). */
export function readGpml(path) {
  const gpml = readFileSync(path, 'utf8');
  const value = (m, key) => m.match(new RegExp(`<gpml:key>${key}</gpml:key>.*?<gpml:value>(.*?)</gpml:value>`, 's'))?.[1];
  const out = [];
  for (const member of gpml.split('<gml:featureMember>').slice(1)) {
    const plate = +(value(member, 'PLATEID1') ?? member.match(/<gpml:reconstructionPlateId>.*?<gpml:value>(\d+)/s)?.[1] ?? 0);
    const from = +(value(member, 'FROMAGE') ?? 4600);
    const to = Math.max(0, +(value(member, 'TOAGE') ?? 0)); // -999 = still exists
    for (const poly of member.match(/<gml:Polygon>.*?<\/gml:Polygon>/gs) ?? []) {
      // GPML lists "lat lon" pairs.
      const rings = [...poly.matchAll(/<gml:posList[^>]*>(.*?)<\/gml:posList>/gs)].map(([, list]) => {
        const n = list.trim().split(/\s+/).map(Number);
        const ring = [];
        for (let i = 0; i + 1 < n.length; i += 2) ring.push([n[i + 1], n[i]]);
        if (ring.length && (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1])) ring.push([...ring[0]]);
        return ring;
      });
      if (rings[0]?.length >= 4) out.push({ type: 'Feature', properties: { P: plate, F: from, T: to }, geometry: { type: 'Polygon', coordinates: rings } });
    }
  }
  return out;
}

/** Point → plate properties {P, F, T} of the static polygon containing it (plate 0 if none). */
export function buildPlateIndex(statics) {
  const CELL = 5;
  const cells = new Map();
  const polys = statics.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).map((rings) => {
    const xs = rings[0].map((p) => p[0]);
    const ys = rings[0].map((p) => p[1]);
    return { rings, props: f.properties, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
  }));
  for (const p of polys) {
    for (let x = Math.floor(p.bbox[0] / CELL); x <= Math.floor(p.bbox[2] / CELL); x++)
      for (let y = Math.floor(p.bbox[1] / CELL); y <= Math.floor(p.bbox[3] / CELL); y++) {
        const k = `${x},${y}`;
        (cells.get(k) ?? cells.set(k, []).get(k)).push(p);
      }
  }
  const inRing = (x, y, r) => {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++)
      if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
    return c;
  };
  const contains = (p, x, y) => x >= p.bbox[0] && x <= p.bbox[2] && y >= p.bbox[1] && y <= p.bbox[3] && inRing(x, y, p.rings[0]) && !p.rings.slice(1).some((h) => inRing(x, y, h));
  const NONE = { P: 0, F: 4600, T: 0 };
  let last = null;
  return {
    at(x, y) {
      // Consecutive coast points are usually on the same plate: try the last hit first.
      if (last && contains(last, x, y)) return last.props;
      const hit = (cells.get(`${Math.floor(x / CELL)},${Math.floor(y / CELL)}`) ?? []).find((p) => contains(p, x, y));
      if (hit) last = hit;
      return hit ? hit.props : NONE;
    },
  };
}
