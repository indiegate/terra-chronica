// The Earth before the plate model (4.54 billion to 1 billion years ago).
//
// Nothing survives to reconstruct where land was this far back with any
// confidence, so this layer is openly schematic: the sea is tinted to its
// chemistry (iron-rich and oxygen-poor, clearing after the Great Oxidation
// Event), and the cratons, the ancient cores of today's continents, are drawn
// as labelled blobs that drift smoothly, gather into the supercontinents
// (Vaalbara, Kenorland, Columbia, Rodinia) and scatter again. The magma ocean
// of the Hadean is drawn by the renderer. At 1 billion years ago the layer
// fades into the plate model's continental blocks, with Rodinia assembled
// where the model puts it.
import * as d3 from 'd3';
import { EARTH_AGE, MAX_AGE, PALEO_LABELS } from '../data/geology';
import { rotateLonLat, type Plates } from '../plates';
import { within, type TimeState } from '../time';
import type { MapLayer } from './layer';

type G = d3.Selection<SVGGElement, unknown, null, undefined>;

export interface EarlyEarthContext {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  root: G;
  project: (lon: number, lat: number) => [number, number] | null;
  geoPath: () => d3.GeoPath;
  plates: () => Plates | null;
}

/** Over this many million years before the plate model's limit, the schematic map fades out. */
export const HANDOVER = 100;

const RAD = Math.PI / 180;
type Vec = [number, number, number];

/**
 * Cratons: the ancient cores of today's continents, with their largest
 * schematic radius (degrees). Each drifts along a smooth path, gathering into
 * the supercontinents and scattering again.
 */
const CRATONS: { name: string; r: number }[] = [
  { name: 'Superior', r: 11 }, { name: 'Slave', r: 6 }, { name: 'Wyoming', r: 7 }, { name: 'Hearne–Rae', r: 9 },
  { name: 'Karelia', r: 9 }, { name: 'Sarmatia', r: 8 }, { name: 'Anabar (Siberia)', r: 10 }, { name: 'North China', r: 9 },
  { name: 'Kaapvaal', r: 7 }, { name: 'Pilbara', r: 6 }, { name: 'Yilgarn', r: 8 }, { name: 'Dharwar', r: 6 },
  { name: 'São Francisco', r: 7 }, { name: 'Amazonia', r: 11 }, { name: 'West Africa', r: 9 }, { name: 'Congo', r: 10 },
];
const ALL = CRATONS.map((_, i) => i);
const VAALBARA = [8, 9];
const KENORLAND = [0, 1, 2, 3, 4, 5, 10];

/** Supercontinents, for their labels: the cratons that form them and when they stand assembled (Ma). */
export const SUPERCONTINENTS: { name: string; members: number[]; from: number; to: number }[] = [
  { name: 'Vaalbara', members: VAALBARA, from: 3350, to: 2800 },
  { name: 'Kenorland', members: KENORLAND, from: 2720, to: 2420 },
  { name: 'Columbia (Nuna)', members: ALL, from: 1880, to: 1380 },
  { name: 'Rodinia', members: ALL, from: 1130, to: MAX_AGE - 40 },
];

// ── Geometry on the unit sphere ───────────────────────────────────────

const toVec = ([lon, lat]: [number, number]): Vec => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
const toLonLat = ([x, y, z]: Vec): [number, number] => [Math.atan2(y, x) / RAD, Math.asin(Math.max(-1, Math.min(1, z / Math.hypot(x, y, z)))) / RAD];
/** The point `dist`° from `from` towards `bearing`° (clockwise from north). */
function destination(from: [number, number], bearing: number, dist: number): [number, number] {
  const [l1, p1, b, d] = [from[0] * RAD, from[1] * RAD, bearing * RAD, dist * RAD];
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [l2 / RAD, p2 / RAD];
}

/** Deterministic pseudo-random numbers in [0, 1). */
function random(seed: number) {
  let s = seed * 2654435761 >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

type Positions = Map<number, [number, number]>;

/** Mean direction of some cratons. */
function centroid(ps: Positions, members: number[]): [number, number] {
  const v = members.map((m) => toVec(ps.get(m)!)).reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as Vec);
  return toLonLat(v);
}

/** Bearing (degrees clockwise from north) from a to b. */
function bearing(a: [number, number], b: [number, number]) {
  const [l1, p1, l2, p2] = [a[0] * RAD, a[1] * RAD, b[0] * RAD, b[1] * RAD];
  return Math.atan2(Math.sin(l2 - l1) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(l2 - l1)) / RAD;
}

const distance = (a: [number, number], b: [number, number]) => d3.geoDistance(a, b) / RAD;

/**
 * Builds the history step by step, so every craton moves at plate-like
 * speeds (a few centimetres a year): drifting on slowly turning headings,
 * gathering into supercontinents around their own centre, and breaking up.
 */
class History {
  frames: [number, Positions][] = [];
  private pos: Positions;
  private heading: number[];
  private age: number;
  private rnd = random(42);

  constructor(age: number) {
    this.age = age;
    const n = CRATONS.length;
    // First crust: specks spread over the globe (a jittered Fibonacci sphere).
    this.pos = new Map(ALL.map((c) => [c, [((c * 137.5 + this.rnd() * 30) % 360) - 180, (Math.asin(1 - (2 * (c + 0.5)) / n) / RAD) * 0.85]]));
    this.heading = ALL.map(() => this.rnd() * 360);
    this.frames.push([age, new Map(this.pos)]);
  }

  /** Move on to `age`: cratons not in a rigid group drift; groups move as one; `pull` draws members towards their centre. */
  step(age: number, opts: { groups?: number[][]; pull?: { members: number[]; share: number } } = {}) {
    const dt = this.age - age;
    const grouped = new Set((opts.groups ?? []).flat());
    for (const c of ALL) {
      if (grouped.has(c)) continue;
      this.heading[c] += (this.rnd() - 0.5) * 70;
      this.pos.set(c, destination(this.pos.get(c)!, this.heading[c], dt * (0.15 + 0.2 * this.rnd())));
    }
    for (const g of opts.groups ?? []) {
      const centre = centroid(this.pos, g);
      const move = destination(centre, this.rnd() * 360, dt * 0.1);
      for (const c of g) this.pos.set(c, destination(move, bearing(centre, this.pos.get(c)!), distance(centre, this.pos.get(c)!)));
    }
    if (opts.pull) {
      const centre = centroid(this.pos, opts.pull.members);
      for (const c of opts.pull.members) {
        const p = this.pos.get(c)!;
        this.pos.set(c, destination(p, bearing(p, centre), distance(p, centre) * opts.pull.share));
      }
    }
    this.commit(age);
  }

  /** Gather `members` into a compact supercontinent around their centre; each takes the nearest free slot. */
  gather(age: number, members: number[], spacing = 8.5) {
    const centre = centroid(this.pos, members);
    const spin = this.rnd() * 360;
    const slots = members.map((_, i) => (i === 0 ? centre : destination(centre, spin + i * 137.5, spacing * Math.sqrt(i + 0.3))));
    const free = new Set(members);
    for (const slot of slots) {
      let best = -1;
      for (const c of free) if (best < 0 || distance(this.pos.get(c)!, slot) < distance(this.pos.get(best)!, slot)) best = c;
      free.delete(best);
      this.pos.set(best, slot);
    }
    this.commit(age);
  }

  /** Break `members` up: each moves `dist`° outwards from their centre. */
  disperse(age: number, members: number[], dist: number) {
    const centre = centroid(this.pos, members);
    for (const c of members) {
      const p = this.pos.get(c)!;
      const b = distance(centre, p) > 0.5 ? bearing(centre, p) : this.rnd() * 360;
      this.heading[c] = b;
      this.pos.set(c, destination(p, b + (this.rnd() - 0.5) * 20, dist * (0.8 + 0.4 * this.rnd())));
    }
    this.commit(age);
  }

  private commit(age: number) {
    this.age = age;
    this.frames.push([age, new Map(this.pos)]);
  }
}

/** Rotation taking unit vector a onto b (Rodrigues), applied to v. */
function rotateOnto(a: Vec, b: Vec, v: Vec): Vec {
  const k: Vec = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const sin = Math.hypot(...k);
  const cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (sin < 1e-9) return v;
  const u = k.map((x) => x / sin) as Vec;
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const cross: Vec = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return [0, 1, 2].map((i) => v[i] * cos + cross[i] * sin + u[i] * dot * (1 - cos)) as Vec;
}

/**
 * Keyframes for every craton: [age Ma, unit vector], oldest first. The whole
 * history is finally turned as one, so Rodinia assembles where the plate model
 * later puts it.
 */
export function keyframes(rodinia: [number, number]): [number, Vec][][] {
  const h = new History(4400);
  h.step(4100);
  h.step(3800);
  h.step(3500, { pull: { members: VAALBARA, share: 0.6 } });
  h.gather(3300, VAALBARA, 10);
  h.step(3050, { groups: [VAALBARA], pull: { members: KENORLAND, share: 0.4 } });
  h.step(2900, { groups: [VAALBARA], pull: { members: KENORLAND, share: 0.5 } });
  h.gather(2720, KENORLAND);
  h.step(2450, { groups: [KENORLAND] });
  h.disperse(2250, KENORLAND, 45);
  h.step(2100, { pull: { members: ALL, share: 0.35 } });
  h.step(1980, { pull: { members: ALL, share: 0.5 } });
  h.gather(1850, ALL);
  h.step(1650, { groups: [ALL] });
  h.step(1450, { groups: [ALL] });
  h.disperse(1300, ALL, 35);
  h.step(1200, { pull: { members: ALL, share: 0.5 } });
  h.gather(1100, ALL, 9.5);
  h.gather(MAX_AGE, ALL);

  const last = h.frames[h.frames.length - 1][1];
  const [from, to] = [toVec(centroid(last, ALL)), toVec(rodinia)];
  return CRATONS.map((_, c) => h.frames.map(([age, m]): [number, Vec] => [age, rotateOnto(from, to, toVec(m.get(c)!))]));
}

/**
 * Where a craton is at `age`: a smooth curve (cubic Hermite with Catmull-Rom
 * tangents, on the sphere) through its keyframes, so it drifts without jumps.
 */
export function positionAt(frames: [number, Vec][], age: number): [number, number] {
  const n = frames.length;
  if (age >= frames[0][0]) return toLonLat(frames[0][1]);
  if (age <= frames[n - 1][0]) return toLonLat(frames[n - 1][1]);
  let i = 0;
  while (age < frames[i + 1][0]) i++;
  const t = (k: number) => -frames[Math.max(0, Math.min(n - 1, k))][0];
  const p = (k: number) => frames[Math.max(0, Math.min(n - 1, k))][1];
  const tangent = (k: number): Vec => {
    const [a, b] = [p(k - 1), p(k + 1)];
    const dt = t(k + 1) - t(k - 1) || 1;
    return [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt, (b[2] - a[2]) / dt];
  };
  const dt = t(i + 1) - t(i);
  const u = (-age - t(i)) / dt;
  const [h00, h10, h01, h11] = [2 * u ** 3 - 3 * u ** 2 + 1, u ** 3 - 2 * u ** 2 + u, -2 * u ** 3 + 3 * u ** 2, u ** 3 - u ** 2];
  const [p0, p1, m0, m1] = [p(i), p(i + 1), tangent(i), tangent(i + 1)];
  const v = [0, 1, 2].map((j) => h00 * p0[j] + h10 * dt * m0[j] + h01 * p1[j] + h11 * dt * m1[j]) as Vec;
  return toLonLat(v);
}

/** Continental crust grows: cratons start as specks of the first crust and reach full size by 2.5 billion years ago. */
export function cratonScale(age: number): number {
  const u = Math.max(0, Math.min(1, (4400 - age) / (4400 - 2500)));
  return 0.2 + 0.8 * u * u * (3 - 2 * u);
}

/** Opacity of a supercontinent's label: fades in and out over 60 million years at the ends of its span. */
export function labelOpacity(s: { from: number; to: number }, age: number): number {
  return Math.max(0, Math.min(1, (s.from - age) / 60)) * Math.max(0, Math.min(1, (age - s.to) / 60));
}

/** Sea tint through time: [age Ma, colour, opacity]. */
const SEA: [number, string, number][] = [
  [4540, '#6e5a3a', 0.34],
  [4000, '#6f7a4c', 0.3],
  [2500, '#6a7d5a', 0.28],
  [2250, '#5d7d80', 0.22],
  [1000, '#5d6f72', 0.12],
];

/** Magma ocean: fully molten at the start, crusted over and gone by MAGMA_TO. */
const MAGMA_FROM = 4500;
const MAGMA_TO = 4380;

/** Outline of a craton: an organic, deterministic ring of [lon, lat] around its centre. */
function blobRing(centre: [number, number], r: number, seed: number): [number, number][] {
  const n = 36;
  return d3.range(n + 1).map((i) => {
    const a = ((i % n) / n) * 360;
    const wobble = 1 + 0.18 * Math.sin(3 * a * RAD + seed) + 0.1 * Math.sin(5 * a * RAD + seed * 2.3);
    return destination(centre, a, r * wobble);
  });
}

export class EarlyEarth implements MapLayer {
  readonly id = 'early-earth';
  readonly title = 'Early Earth (schematic)';
  readonly group = 'earth' as const;
  readonly span = { fromBP: EARTH_AGE * 1e6, toBP: MAX_AGE * 1e6 };
  readonly defaultOn = true;
  private g: G;
  enabled = true;
  private age = 0;
  private drawn = -1;
  private k = 1;
  private frames: { key: string; frames: [number, Vec][][] } | null = null;

  constructor(private ctx: EarlyEarthContext) {
    this.g = ctx.root.append('g').attr('class', 'early-earth');
  }

  /** How strongly the schematic map shows (it hands over to the plate model near 1 billion years ago). */
  static weight(age: number): number {
    return Math.max(0, Math.min(1, (age - MAX_AGE) / HANDOVER));
  }

  /** The magma ocean at `age` (drawn by the renderer): opacity, and heat from 1 (molten) to 0 (crusted). */
  static magma(age: number): { alpha: number; heat: number } {
    const heat = Math.max(0, Math.min(1, (age - MAGMA_TO) / (MAGMA_FROM - MAGMA_TO)));
    const u = Math.min(1, heat / 0.3);
    return { alpha: u * u * (3 - 2 * u), heat };
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.refresh(true);
  }

  update(t: TimeState) {
    this.age = this.enabled && within(this.span, t) ? t.age : 0;
    this.refresh();
  }

  scale(k: number) {
    this.k = k;
    this.g.selectAll<SVGTextElement, unknown>('text').style('font-size', function () {
      return `${Number(this.dataset.size) / k}px`;
    });
  }

  resize() {
    this.refresh(true);
  }

  private refresh(force = false) {
    const age = this.age > MAX_AGE ? this.age : 0;
    if (!force && age === this.drawn) return;
    this.drawn = age;
    this.g.selectAll('*').remove();
    if (age) this.render(age);
    this.scale(this.k);
  }

  /**
   * Where the land is gathered at `age`, and how tightly (0 scattered … 1 one
   * landmass): the size-weighted mean of the cratons. The map turns to follow it.
   */
  landCentre(age: number): { centre: [number, number]; strength: number } | null {
    if (!this.enabled || EarlyEarth.weight(age) < 0.5 || !this.ctx.plates()) return null;
    const frames = this.cratonFrames();
    let [x, y, z, total] = [0, 0, 0, 0];
    frames.forEach((fr, c) => {
      const v = toVec(positionAt(fr, age));
      const w = CRATONS[c].r ** 2;
      [x, y, z, total] = [x + v[0] * w, y + v[1] * w, z + v[2] * w, total + w];
    });
    return { centre: toLonLat([x, y, z]), strength: Math.hypot(x, y, z) / total };
  }

  /** Keyframes, rebuilt only if the plate model's Rodinia moves. */
  private cratonFrames() {
    const r = this.rodinia() ?? [0, 0];
    const key = r.map((v) => v.toFixed(2)).join();
    if (this.frames?.key !== key) this.frames = { key, frames: keyframes(r) };
    return this.frames.frames;
  }

  private render(age: number) {
    const w = EarlyEarth.weight(age);
    const path = this.ctx.geoPath();
    const sphere = path({ type: 'Sphere' })!;

    // Sea tint, interpolated between the stops; the magma ocean (drawn on the GPU) covers it at first.
    let i = 1;
    while (i < SEA.length - 1 && age < SEA[i][0]) i++;
    const [a0, c0, o0] = SEA[i - 1];
    const [a1, c1, o1] = SEA[i];
    const f = Math.max(0, Math.min(1, (a0 - age) / (a0 - a1)));
    this.g.append('path').attr('class', 'ee-sea').attr('d', sphere)
      .style('fill', d3.interpolateRgb(c0, c1)(f))
      .style('fill-opacity', (o0 + (o1 - o0) * f) * w * (1 - EarlyEarth.magma(age).alpha));

    // Cratons, drifting. The outlines go underneath and the fills on top, so
    // cratons that touch merge into one landmass.
    const frames = this.cratonFrames();
    const scale = cratonScale(age);
    const where = frames.map((fr) => positionAt(fr, age));
    const shapes = CRATONS.map((c, ci) => {
      const ring = blobRing(where[ci], c.r * scale, ci * 7 + 3);
      // d3 fills the smaller side of a ring wound clockwise.
      const poly: GeoJSON.Polygon = { type: 'Polygon', coordinates: [ring] };
      return d3.geoArea(poly) > 2 * Math.PI ? { type: 'Polygon', coordinates: [[...ring].reverse()] } as GeoJSON.Polygon : poly;
    });
    // The first crust appears as the magma ocean cools.
    const g = this.g.append('g').attr('class', 'ee-cratons').style('opacity', w * (1 - EarlyEarth.magma(age).alpha));
    for (const cls of ['ee-land-edge', 'ee-land']) {
      g.selectAll(`path.${cls}`).data(shapes).join('path').attr('class', cls).attr('d', (d) => path(d) ?? '')
        .append('title').text((_, ci) => `${CRATONS[ci].name} craton (schematic: positions and shapes are illustrative)`);
    }

    // Supercontinent names, while they stand assembled.
    for (const s of SUPERCONTINENTS) {
      const o = labelOpacity(s, age) * w;
      if (o <= 0.01) continue;
      const v = s.members.map((m) => toVec(where[m])).reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as Vec);
      const [lon, lat] = toLonLat(v);
      const p = this.ctx.project(lon, lat - 3);
      if (!p) continue;
      const t = this.g.append('g').style('opacity', o);
      t.append('text').attr('class', 'paleo continent').attr('x', p[0]).attr('y', p[1]).attr('data-size', 17).text(s.name);
      t.append('text').attr('class', 'ee-note').attr('x', p[0]).attr('y', p[1] + 15).attr('data-size', 11).text('schematic');
    }

    // Ocean name for the eon.
    const ocean = age > MAGMA_TO + 20 ? 'Magma ocean' : age > 2500 ? 'Global ocean' : null;
    const p = ocean ? this.ctx.project(-150, -40) : null;
    if (ocean && p) this.g.append('text').attr('class', 'paleo ocean').attr('x', p[0]).attr('y', p[1]).attr('data-size', 13).style('opacity', w).text(ocean);
  }

  /** Where the plate model puts Rodinia at its oldest age, so the hand-over lines up. */
  private rodinia(): [number, number] | null {
    const plates = this.ctx.plates();
    const label = PALEO_LABELS.find((l) => l.name === 'Rodinia');
    if (!plates || !label) return null;
    let x = 0, y = 0, z = 0;
    for (const [plate, lon, lat] of label.anchors) {
      const [plon, plat] = rotateLonLat(plates.rotation(plate), lon, lat);
      x += Math.cos(plat * RAD) * Math.cos(plon * RAD);
      y += Math.cos(plat * RAD) * Math.sin(plon * RAD);
      z += Math.sin(plat * RAD);
    }
    return [Math.atan2(y, x) / RAD, Math.asin(z / Math.hypot(x, y, z)) / RAD];
  }
}
