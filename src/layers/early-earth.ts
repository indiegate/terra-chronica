// The Earth before the plate model (4.54 billion to 1 billion years ago).
//
// Nothing survives to reconstruct where land was this far back with any
// confidence, so this layer is openly schematic: the sea is tinted to its
// chemistry (magma, then iron-rich and oxygen-poor, then clearing after the
// Great Oxidation Event), and the landmasses of each stage are drawn as
// labelled blobs, never as real shapes. At 1 billion years ago it fades into
// the plate model's continental blocks, placing its last stage (Rodinia
// assembling) where the model puts Rodinia.
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

/** A craton: [lon, lat, radius°]; clusters are given relative to their centre. */
type Blob = [number, number, number];

interface Stage {
  name: string;
  from: number; // Ma
  to: number;
  label?: string;
  /** Centre for `cluster` (lon, lat); 'rodinia' follows the plate model. */
  centre?: [number, number] | 'rodinia';
  cluster?: Blob[];
  /** Separate cratons, absolute positions. */
  scattered?: Blob[];
}

const STAGES: Stage[] = [
  { name: 'First crust', from: 4400, to: 3800,
    scattered: [[-120, 20, 3], [-40, -30, 2.5], [20, 35, 3], [70, -10, 2.5], [130, 25, 3], [160, -35, 2.5], [-80, 55, 2]] },
  { name: 'Early cratons', from: 3800, to: 2750, label: 'Vaalbara', centre: [30, -20],
    cluster: [[-4, 0, 6], [4, 3, 5]],
    scattered: [[-110, 25, 5], [-50, 45, 4], [80, 30, 5], [120, -30, 4.5], [-150, -20, 3.5], [150, 45, 4]] },
  { name: 'Kenorland', from: 2750, to: 2400, label: 'Kenorland', centre: [-40, 20],
    cluster: [[0, 0, 9], [12, 6, 7], [-10, 10, 7], [6, -10, 6], [-14, -6, 6]],
    scattered: [[60, -25, 6], [110, 30, 6], [150, -15, 5]] },
  { name: 'Scattered cratons', from: 2400, to: 2050,
    scattered: [[-100, 35, 7], [-40, -15, 6], [10, 40, 7], [50, -35, 6], [95, 15, 7], [140, -20, 6], [-150, -10, 5]] },
  { name: 'Columbia', from: 2050, to: 1350, label: 'Columbia (Nuna)', centre: [20, 15],
    cluster: [[0, 0, 10], [14, 5, 8], [-13, 8, 8], [5, -14, 8], [-8, -12, 7], [22, -8, 7], [-22, -4, 7], [10, 18, 7]],
    scattered: [[-110, -25, 5], [120, -30, 6]] },
  { name: 'Columbia breaks up', from: 1350, to: 1150,
    scattered: [[-60, 25, 8], [-10, -20, 8], [40, 30, 8], [80, -15, 7], [120, 20, 7], [-120, -10, 6]] },
  { name: 'Rodinia assembling', from: 1150, to: MAX_AGE - 1, label: 'Rodinia', centre: 'rodinia',
    cluster: [[0, 0, 11], [14, 6, 9], [-14, 6, 9], [6, -14, 9], [-10, -12, 8], [20, -8, 7]] },
];

/** Sea tint through time: [age Ma, colour, opacity]. */
const SEA: [number, string, number][] = [
  [4540, '#c2461e', 0.55],
  [4380, '#6e5a3a', 0.34],
  [4000, '#6f7a4c', 0.3],
  [2500, '#6a7d5a', 0.28],
  [2250, '#5d7d80', 0.22],
  [1000, '#5d6f72', 0.12],
];

/** Magma ocean: full at the start, gone once the crust forms. */
const MAGMA_FROM = 4500;
const MAGMA_TO = 4380;

/** Stages cross-fade over this many million years either side of their boundaries. */
const CROSSFADE = 40;

/** Opacity of a stage at `age`: 0.5 on its boundaries, so neighbouring stages cross-fade. */
export function stageOpacity(s: { from: number; to: number }, age: number): number {
  const o = Math.min((s.from + CROSSFADE - age) / (2 * CROSSFADE), (age - s.to + CROSSFADE) / (2 * CROSSFADE));
  return Math.max(0, Math.min(1, o));
}

/** Organic, deterministic outline around a point: a ring of [lon, lat]. */
function blobRing([lon, lat, r]: Blob, seed: number): [number, number][] {
  const n = 18;
  return d3.range(n).map((i) => {
    const a = (i / n) * 2 * Math.PI;
    const wobble = 1 + 0.18 * Math.sin(3 * a + seed) + 0.1 * Math.sin(5 * a + seed * 2.3);
    return [lon + (r * wobble * Math.cos(a)) / Math.max(0.3, Math.cos((lat * Math.PI) / 180)), lat + r * wobble * Math.sin(a)];
  });
}

export class EarlyEarth implements MapLayer {
  readonly id = 'early-earth';
  readonly title = 'Early Earth (schematic)';
  readonly group = 'earth' as const;
  readonly span = { fromBP: EARTH_AGE * 1e6, toBP: MAX_AGE * 1e6 };
  readonly defaultOn = true;
  private g: G;
  private enabled = true;
  private age = 0;
  private key = '';
  private k = 1;

  constructor(private ctx: EarlyEarthContext) {
    this.g = ctx.root.append('g').attr('class', 'early-earth');
    // Molten surface: turbulence coloured from dark crust to glowing rock.
    const f = ctx.svg.select('defs').empty() ? ctx.svg.insert('defs', ':first-child') : ctx.svg.select<SVGDefsElement>('defs');
    const filter = f.append('filter').attr('id', 'magma').attr('x', 0).attr('y', 0).attr('width', 1).attr('height', 1);
    // "turbulence" noise is near zero along thin veins: map low values to opaque glowing orange.
    filter.append('feTurbulence').attr('type', 'turbulence').attr('baseFrequency', 0.03).attr('numOctaves', 2).attr('seed', 7);
    filter
      .append('feColorMatrix')
      .attr('type', 'matrix')
      .attr('values', '0 0 0 0 1  0 0 0 0 0.55  0 0 0 0 0.15  -5 0 0 0 1.1');
    filter.append('feComposite').attr('in2', 'SourceGraphic').attr('operator', 'in');
  }

  /** How strongly the schematic map shows (it hands over to the plate model near 1 billion years ago). */
  static weight(age: number): number {
    return Math.max(0, Math.min(1, (age - MAX_AGE) / HANDOVER));
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
    // Quantised: the picture changes slowly, and playback should not redraw every frame.
    const key = this.age > MAX_AGE ? String(Math.round(this.age / 4)) : '';
    if (!force && key === this.key) return;
    this.key = key;
    this.g.selectAll('*').remove();
    if (key) this.render(this.age);
    this.scale(this.k);
  }

  private render(age: number) {
    const w = EarlyEarth.weight(age);
    const path = this.ctx.geoPath();
    const sphere = path({ type: 'Sphere' })!;

    // Sea tint, interpolated between the stops.
    let i = 1;
    while (i < SEA.length - 1 && age < SEA[i][0]) i++;
    const [a0, c0, o0] = SEA[i - 1];
    const [a1, c1, o1] = SEA[i];
    const f = Math.max(0, Math.min(1, (a0 - age) / (a0 - a1)));
    this.g.append('path').attr('class', 'ee-sea').attr('d', sphere)
      .style('fill', d3.interpolateRgb(c0, c1)(f))
      .style('fill-opacity', (o0 + (o1 - o0) * f) * w);
    const magma = Math.max(0, Math.min(1, (age - MAGMA_TO) / (MAGMA_FROM - MAGMA_TO)));
    if (magma > 0) this.g.append('path').attr('class', 'ee-magma').attr('d', sphere).style('opacity', magma * w);

    // Landmasses of each stage.
    const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5));
    const centre = (s: Stage): [number, number] | null => (s.centre === 'rodinia' ? this.rodinia() : (s.centre ?? null));
    for (const [si, s] of STAGES.entries()) {
      const o = stageOpacity(s, age) * w;
      if (o <= 0.01) continue;
      const c = centre(s);
      const blobs: Blob[] = [
        ...(c && s.cluster ? s.cluster.map(([dx, dy, r]): Blob => [c[0] + dx, c[1] + dy, r]) : []),
        ...(s.scattered ?? []),
      ];
      const rings = blobs.map((b, bi) =>
        blobRing(b, si * 7 + bi).flatMap(([lon, lat]) => {
          const q = this.ctx.project(lon, lat);
          return q ? [q] : [];
        }),
      );
      const d = rings
        .filter((r) => r.length > 2)
        .map((r) => line(d3.polygonArea(r) < 0 ? [...r].reverse() : r))
        .join('');
      const g = this.g.append('g').attr('class', 'ee-stage').style('opacity', o);
      g.append('path').attr('class', 'ee-land').attr('d', d).append('title').text(`${s.name} (schematic: positions and shapes are illustrative)`);
      if (s.label && c) {
        const p = this.ctx.project(c[0], c[1] - 3);
        if (p) {
          g.append('text').attr('class', 'paleo continent').attr('x', p[0]).attr('y', p[1]).attr('data-size', 17).text(s.label);
          g.append('text').attr('class', 'ee-note').attr('x', p[0]).attr('y', p[1] + 15).attr('data-size', 11).text('schematic');
        }
      }
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
    const RAD = Math.PI / 180;
    for (const [plate, lon, lat] of label.anchors) {
      const [plon, plat] = rotateLonLat(plates.rotation(plate), lon, lat);
      x += Math.cos(plat * RAD) * Math.cos(plon * RAD);
      y += Math.cos(plat * RAD) * Math.sin(plon * RAD);
      z += Math.sin(plat * RAD);
    }
    return [Math.atan2(y, x) / RAD, Math.asin(z / Math.hypot(x, y, z)) / RAD];
  }
}
