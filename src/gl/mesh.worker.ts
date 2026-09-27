// Builds GPU meshes off the main thread: triangulated fills and line segments
// for territory snapshots (pre-projected metres) and plate-split land (lon/lat).
import earcut from 'earcut';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, LineString, MultiLineString, MultiPolygon, Polygon, Position } from 'geojson';
import type { LandMesh, LandRequest, TerritoryMesh, TerritoryRequest, TerritoryMeta, WorkerRequest } from './types';

self.onmessage = async (e: MessageEvent<WorkerRequest & { id: number }>) => {
  const req = e.data;
  try {
    const topo: Topology = await fetch(req.url).then((r) => r.json());
    const result = req.kind === 'territories' ? territories(topo, req) : land(topo, req);
    const buffers = Object.values(result).filter((v) => ArrayBuffer.isView(v)).map((v) => (v as ArrayBufferView).buffer);
    (self as unknown as Worker).postMessage({ id: req.id, result }, buffers as Transferable[]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: req.id, error: String(err) });
  }
};

// ── Territories ─────────────────────────────────────────────────────────

type Terr = Feature<Polygon | MultiPolygon | null, { NAME: string; SUBJECTO: string | null; PARTOF: string | null; BORDERPRECISION: number | null }>;

function territories(topo: Topology, req: TerritoryRequest): TerritoryMesh {
  const obj = Object.values(topo.objects)[0] as GeometryCollection;
  const all = (feature(topo, obj) as unknown as { features: Terr[] }).features;

  // Draw order: largest first, so small polities end up on top. The full-detail
  // file must reuse the simplified file's order so feature ids match.
  const order =
    req.order ??
    all
      .map((f, i) => [i, f.geometry ? Math.abs(geometryArea(f.geometry)) : -1] as const)
      .filter(([, a]) => a >= 0)
      .sort((a, b) => b[1] - a[1])
      .map(([i]) => i);

  const fill = new Builder();
  const lines = new SegmentBuilder(5); // ax, ay, bx, by, along
  const meta: TerritoryMeta[] = [];
  order.forEach((src, id) => {
    const f = all[src];
    const g = f.geometry;
    const bbox: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    let label = { x: 0, y: 0, area: -1 };
    if (g) {
      for (const rings of g.type === 'Polygon' ? [g.coordinates] : g.coordinates) {
        fill.polygon(rings, id);
        for (const ring of rings) {
          let along = 0;
          for (let i = 1; i < ring.length; i++) {
            const [ax, ay] = ring[i - 1];
            const [bx, by] = ring[i];
            lines.push(id, ax, ay, bx, by, along);
            along += Math.hypot(bx - ax, by - ay);
            if (bx < bbox[0]) bbox[0] = bx;
            if (by < bbox[1]) bbox[1] = by;
            if (bx > bbox[2]) bbox[2] = bx;
            if (by > bbox[3]) bbox[3] = by;
          }
        }
        // Label on the largest part.
        const a = Math.abs(ringArea(rings[0]));
        if (a > label.area) label = { ...ringCentroid(rings[0]), area: a };
      }
    }
    const p = f.properties;
    meta.push({ name: p.NAME, subjecto: p.SUBJECTO, partof: p.PARTOF, precision: p.BORDERPRECISION, bbox, label });
  });

  return {
    kind: 'territories',
    order,
    meta,
    fillPos: fill.positions(),
    fillIds: fill.ids(),
    fillIndex: fill.indices(),
    linePos: lines.data(),
    lineIds: lines.ids(),
  };
}

// ── Land on plates ──────────────────────────────────────────────────────

/** Longest triangle edge (degrees) before it is split, so rotated shapes stay smooth. */
const MAX_EDGE = 3;

function land(topo: Topology, req: LandRequest): LandMesh {
  const pieces: number[] = []; // per piece: anchorLon, anchorLat, plateIndex, from, to
  const addPiece = (props: { P: number; F: number; T: number }, anchor: [number, number]) => {
    pieces.push(anchor[0], anchor[1], req.plateIndex[props.P] ?? 0, props.F, props.T);
    return pieces.length / 5 - 1;
  };

  const fill = new Builder();
  const landFc = feature(topo, topo.objects.land as GeometryCollection) as unknown as { features: Feature<Polygon | MultiPolygon, { P: number; F: number; T: number }>[] };
  for (const f of landFc.features) {
    if (!f.geometry) continue;
    for (const rings of f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) {
      const piece = addPiece(f.properties, bboxCentre(rings[0]));
      fill.polygon(rings, piece, MAX_EDGE);
    }
  }

  const coast = new SegmentBuilder(4); // aLon, aLat, bLon, bLat
  const coastFc = feature(topo, topo.objects.coast as GeometryCollection) as unknown as { features: Feature<LineString | MultiLineString, { P: number; F: number; T: number }>[] };
  for (const f of coastFc.features) {
    if (!f.geometry) continue;
    const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const piece = addPiece(f.properties, bboxCentre(lines.flat()));
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) coast.push(piece, line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]);
    }
  }

  return {
    kind: 'land',
    pieces: new Float32Array(pieces),
    fillPos: fill.positions(),
    fillIds: fill.ids(),
    fillIndex: fill.indices(),
    linePos: coast.data(),
    lineIds: coast.ids(),
  };
}

// ── Builders ────────────────────────────────────────────────────────────

class Builder {
  private pos: number[] = [];
  private id: number[] = [];
  private idx: number[] = [];

  /** Triangulate one polygon (outer ring + holes); optionally subdivide long edges. */
  polygon(rings: Position[][], id: number, maxEdge = 0) {
    const flat: number[] = [];
    const holes: number[] = [];
    for (const [i, ring] of rings.entries()) {
      if (i > 0) holes.push(flat.length / 2);
      // GeoJSON rings repeat the first point at the end; earcut doesn't want it.
      for (let j = 0; j < ring.length - 1; j++) flat.push(ring[j][0], ring[j][1]);
    }
    if (flat.length < 6) return;
    const tris = earcut(flat, holes.length ? holes : undefined);
    if (!maxEdge) {
      const base = this.pos.length / 2;
      for (let i = 0; i < flat.length; i += 2) {
        this.pos.push(flat[i], flat[i + 1]);
        this.id.push(id);
      }
      for (const t of tris) this.idx.push(base + t);
      return;
    }
    // Split any edge longer than maxEdge. The decision depends only on the edge,
    // so both triangles sharing it split it the same way (no cracks).
    const cache = new Map<string, number>();
    const vertex = (x: number, y: number) => {
      const k = `${x},${y}`;
      let v = cache.get(k);
      if (v === undefined) {
        v = this.pos.length / 2;
        this.pos.push(x, y);
        this.id.push(id);
        cache.set(k, v);
      }
      return v;
    };
    const long = (a: number[], b: number[]) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) > maxEdge;
    const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const emit = (a: number[], b: number[], c: number[], depth: number): void => {
      const ab = long(a, b), bc = long(b, c), ca = long(c, a);
      if (depth > 12 || (!ab && !bc && !ca)) {
        this.idx.push(vertex(a[0], a[1]), vertex(b[0], b[1]), vertex(c[0], c[1]));
        return;
      }
      const d = depth + 1;
      if (ab && bc && ca) {
        const m1 = mid(a, b), m2 = mid(b, c), m3 = mid(c, a);
        emit(a, m1, m3, d); emit(m1, b, m2, d); emit(m3, m2, c, d); emit(m1, m2, m3, d);
      } else if (ab && bc) {
        const m1 = mid(a, b), m2 = mid(b, c);
        emit(a, m1, c, d); emit(m1, m2, c, d); emit(m1, b, m2, d);
      } else if (bc && ca) {
        const m2 = mid(b, c), m3 = mid(c, a);
        emit(a, b, m3, d); emit(b, m2, m3, d); emit(m3, m2, c, d);
      } else if (ca && ab) {
        const m3 = mid(c, a), m1 = mid(a, b);
        emit(a, m1, m3, d); emit(m1, b, c, d); emit(m3, m1, c, d);
      } else if (ab) {
        const m = mid(a, b);
        emit(a, m, c, d); emit(m, b, c, d);
      } else if (bc) {
        const m = mid(b, c);
        emit(a, b, m, d); emit(a, m, c, d);
      } else {
        const m = mid(c, a);
        emit(a, b, m, d); emit(m, b, c, d);
      }
    };
    const pt = (i: number) => [flat[2 * i], flat[2 * i + 1]];
    for (let t = 0; t < tris.length; t += 3) emit(pt(tris[t]), pt(tris[t + 1]), pt(tris[t + 2]), 0);
  }

  positions() {
    return new Float32Array(this.pos);
  }
  ids() {
    return new Uint32Array(this.id);
  }
  indices() {
    return new Uint32Array(this.idx);
  }
}

class SegmentBuilder {
  private d: number[] = [];
  private id: number[] = [];
  constructor(private stride: number) {}
  push(id: number, ...values: number[]) {
    for (let i = 0; i < this.stride; i++) this.d.push(values[i] ?? 0);
    this.id.push(id);
  }
  data() {
    return new Float32Array(this.d);
  }
  ids() {
    return new Uint32Array(this.id);
  }
}

// ── Geometry helpers ────────────────────────────────────────────────────

function ringArea(r: Position[]) {
  let a = 0;
  for (let i = 1; i < r.length; i++) a += r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1];
  return a / 2;
}

function geometryArea(g: Polygon | MultiPolygon) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  let a = 0;
  for (const rings of polys) rings.forEach((r, i) => (a += Math.abs(ringArea(r)) * (i === 0 ? 1 : -1)));
  return a;
}

function ringCentroid(r: Position[]) {
  let x = 0, y = 0, a = 0;
  for (let i = 1; i < r.length; i++) {
    const c = r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1];
    x += (r[i - 1][0] + r[i][0]) * c;
    y += (r[i - 1][1] + r[i][1]) * c;
    a += c;
  }
  return a ? { x: x / (3 * a), y: y / (3 * a) } : { x: r[0][0], y: r[0][1] };
}

function bboxCentre(r: Position[]): [number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of r) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}
