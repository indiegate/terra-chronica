// Human prehistory on the map: species ranges, hominin sites and the routes of
// the great dispersals (data in data/prehistory.ts). All three are SVG overlays
// in the zoomed world group, drawn at k=1 and kept at constant screen size
// where needed. They show at any time within their span, on the deep-time
// slider as well as the prehistory slider.
import * as d3 from 'd3';
import { PRE_END, RANGES, ROUTES, SITES, SPECIES_BY_ID, siteState, type RangePart, type Route, type Site } from '../data/prehistory';
import { within, type Span, type TimeState } from '../time';
import type { MapLayer } from './layer';

type G = d3.Selection<SVGGElement, unknown, null, undefined>;
type Project = (lon: number, lat: number) => [number, number] | null;

export interface OverlayContext {
  root: G;
  project: Project;
  /** Geographic path generator for the current projection (cuts at the antimeridian). */
  geoPath: () => d3.GeoPath;
}

abstract class Overlay implements MapLayer {
  abstract readonly id: string;
  abstract readonly title: string;
  readonly group = 'people' as const;
  abstract readonly span: Span;
  readonly defaultOn = true;
  protected g: G;
  protected enabled = true;
  protected bp: number | null = null;
  protected k = 1;
  private key = '';

  constructor(protected ctx: OverlayContext, cls: string) {
    this.g = ctx.root.append('g').attr('class', cls);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.refresh(true);
  }

  update(t: TimeState) {
    this.bp = this.enabled && within(this.span, t) ? t.bp : null;
    this.refresh();
  }

  scale(k: number) {
    this.k = k;
    this.rescale();
  }

  resize() {
    this.refresh(true);
  }

  /** Re-render only when what is shown changes (the key), unless forced. */
  private refresh(force = false) {
    const key = this.bp === null ? '' : this.stateKey(this.bp);
    if (!force && key === this.key) return;
    this.key = key;
    if (this.bp === null) this.g.selectAll('*').remove();
    else this.render(this.bp);
    this.rescale();
  }

  protected abstract stateKey(bp: number): string;
  protected abstract render(bp: number): void;
  protected rescale() {}
}

// ── Species ranges ─────────────────────────────────────────────────────

export class SpeciesRanges extends Overlay {
  readonly id = 'hominin-ranges';
  readonly title = 'Human species';
  readonly span = { fromBP: 7_200_000, toBP: PRE_END };

  constructor(ctx: OverlayContext) {
    super(ctx, 'hom-ranges');
  }

  private active(bp: number) {
    return RANGES.filter((r) => bp <= r.from && bp >= r.to);
  }

  protected stateKey(bp: number) {
    return this.active(bp).map((r) => RANGES.indexOf(r)).join(',');
  }

  protected render(bp: number) {
    const bySpecies = d3.group(this.active(bp), (r) => r.species);
    const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5));
    const data = [...bySpecies].map(([id, parts]) => {
      const rings = parts.map((p) => this.ring(p)).filter((r) => r.length > 2);
      // One path per species, all rings wound the same way, so overlaps fill once (nonzero rule).
      const d = rings.map((r) => line(d3.polygonArea(r) < 0 ? [...r].reverse() : r)).join('');
      const biggest = rings.reduce((a, b) => (Math.abs(d3.polygonArea(b)) > Math.abs(d3.polygonArea(a)) ? b : a), rings[0]);
      return { species: SPECIES_BY_ID.get(id)!, d, label: biggest ? d3.polygonCentroid(biggest) : null };
    });
    // Species sharing a region share a centroid: stack their labels.
    const placed: [number, number][] = [];
    for (const d of data) {
      if (!d.label) continue;
      while (placed.some(([x, y]) => Math.abs(x - d.label![0]) < 90 && Math.abs(y - d.label![1]) < 14)) d.label[1] += 15;
      placed.push(d.label);
    }
    this.g
      .selectAll<SVGPathElement, (typeof data)[number]>('path')
      .data(data, (d) => d.species.id)
      .join((enter) => enter.append('path').attr('class', 'hom-range').call((p) => p.append('title')))
      .style('--c', (d) => d.species.color)
      .attr('d', (d) => d.d)
      .call((p) => p.select('title').text((d) => `${d.species.name} (${d.species.note}). Approximate range.`));
    this.g
      .selectAll<SVGTextElement, (typeof data)[number]>('text')
      .data(data.filter((d) => d.label), (d) => d.species.id)
      .join('text')
      .attr('class', 'hom-range-label')
      .style('--c', (d) => d.species.color)
      .attr('x', (d) => d.label![0])
      .attr('y', (d) => d.label![1])
      .text((d) => d.species.name);
  }

  protected rescale() {
    this.g.selectAll<SVGTextElement, unknown>('text').style('font-size', `${13 / this.k}px`);
  }

  private ring(p: RangePart): [number, number][] {
    return p.ring.flatMap(([lon, lat]) => {
      const q = this.ctx.project(lon, lat);
      return q ? [q] : [];
    });
  }
}

// ── Hominin sites ──────────────────────────────────────────────────────

export class HomininSites extends Overlay {
  readonly id = 'hominin-sites';
  readonly title = 'Hominin sites';
  readonly span = { fromBP: 7_200_000, toBP: PRE_END };
  onSelect: (site: Site) => void = () => {};

  constructor(ctx: OverlayContext) {
    super(ctx, 'hom-sites');
  }

  private states(bp: number) {
    return SITES.flatMap((site) => {
      const state = siteState(site, bp);
      return state ? [{ site, state }] : [];
    });
  }

  protected stateKey(bp: number) {
    return this.states(bp).map((s) => `${SITES.indexOf(s.site)}${s.state[0]}`).join(',');
  }

  protected render(bp: number) {
    // Past sites first, so the current ones draw on top.
    const data = this.states(bp)
      .sort((a, b) => Number(a.state === 'now') - Number(b.state === 'now'))
      .flatMap((s) => {
        const p = this.ctx.project(s.site.lon, s.site.lat);
        return p ? [{ ...s, x: p[0], y: p[1] }] : [];
      });
    this.g
      .selectAll<SVGGElement, (typeof data)[number]>('g.hom-site')
      .data(data, (d) => d.site.name)
      .join((enter) => {
        const g = enter.append('g').attr('class', 'hom-site');
        g.append('circle').attr('r', 4.5);
        g.append('text').attr('x', 8).attr('y', 3.5);
        g.append('title');
        g.on('click', (e: MouseEvent, d) => {
          e.stopPropagation();
          this.onSelect(d.site);
        });
        return g;
      })
      .order()
      .classed('now', (d) => d.state === 'now')
      .attr('data-x', (d) => d.x)
      .attr('data-y', (d) => d.y)
      .style('--c', (d) => SPECIES_BY_ID.get(d.site.species)!.color)
      .call((g) => g.select('text').text((d) => d.site.name))
      .call((g) => g.select('title').text((d) => `${d.site.name}: ${SPECIES_BY_ID.get(d.site.species)!.name}`));
  }

  protected rescale() {
    const k = this.k;
    const sites = this.g.selectAll<SVGGElement, unknown>('g.hom-site');
    sites.attr('transform', function () {
      return `translate(${this.dataset.x},${this.dataset.y}) scale(${1 / k})`;
    });
    // Label current sites greedily, skipping any that would overlap one already placed
    // (boxes in screen px: positions scale with zoom, the text does not).
    const placed: [number, number, number, number][] = [];
    sites.filter('.now').each(function () {
      const x = Number(this.dataset.x) * k;
      const y = Number(this.dataset.y) * k;
      const text = this.querySelector('text')!;
      const box: [number, number, number, number] = [x + 6, y - 8, x + 10 + (text.textContent?.length ?? 0) * 6, y + 6];
      const clash = placed.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]));
      text.classList.toggle('hidden', clash);
      if (!clash) placed.push(box);
    });
  }
}

// ── Journeys ───────────────────────────────────────────────────────────

/** The part of a route travelled by `bp`, as [lon, lat] points; null before it starts. */
export function travelled(route: Route, bp: number): [number, number][] | null {
  const p = route.path;
  if (bp > p[0][2] || (route.endsAt !== undefined && bp < route.endsAt)) return null;
  const out: [number, number][] = [[p[0][0], p[0][1]]];
  for (let i = 1; i < p.length; i++) {
    const [lon, lat, t] = p[i];
    if (bp <= t) {
      out.push([lon, lat]);
      continue;
    }
    // Part-way along this leg (linear in time, along the great circle).
    const t0 = p[i - 1][2];
    const f = (t0 - bp) / (t0 - t);
    if (f > 0) out.push(d3.geoInterpolate([p[i - 1][0], p[i - 1][1]], [lon, lat])(f) as [number, number]);
    break;
  }
  return out;
}

export class Journeys extends Overlay {
  readonly id = 'journeys';
  readonly title = 'Early human journeys';
  readonly span = { fromBP: 2_250_000, toBP: PRE_END };

  constructor(ctx: OverlayContext) {
    super(ctx, 'hom-routes');
  }

  protected stateKey(bp: number) {
    // Routes move continuously; quantise so playback redraws a few hundred times, not every frame.
    return ROUTES.map((r) => {
      const pts = travelled(r, bp);
      return pts ? `${pts.length}:${pts.at(-1)!.map((v) => v.toFixed(1)).join('/')}` : '-';
    }).join(',');
  }

  protected render(bp: number) {
    const path = this.ctx.geoPath();
    const data = ROUTES.flatMap((route) => {
      const pts = travelled(route, bp);
      if (!pts || pts.length < 2) return [];
      const d = path({ type: 'LineString', coordinates: pts });
      const tip = this.ctx.project(...pts.at(-1)!);
      // Heading from a point a little way back along the last leg.
      const back = d3.geoInterpolate(pts.at(-1)!, pts.at(-2)!)(Math.min(1, 0.3));
      const from = this.ctx.project(back[0], back[1]);
      const angle = tip && from ? (Math.atan2(tip[1] - from[1], tip[0] - from[0]) * 180) / Math.PI : 0;
      const done = bp < route.path.at(-1)![2];
      return d && tip ? [{ route, d, tip, angle, done }] : [];
    });
    const color = (r: Route) => SPECIES_BY_ID.get(r.species)!.color;
    this.g
      .selectAll<SVGPathElement, (typeof data)[number]>('path.hom-route')
      .data(data, (d) => d.route.id)
      .join((enter) => enter.append('path').attr('class', 'hom-route').call((p) => p.append('title')))
      .classed('done', (d) => d.done)
      .style('--c', (d) => color(d.route))
      .attr('d', (d) => d.d)
      .call((p) => p.select('title').text((d) => `${d.route.name}. ${d.route.note}`));
    this.g
      .selectAll<SVGGElement, (typeof data)[number]>('g.hom-arrow')
      .data(data.filter((d) => !d.done), (d) => d.route.id)
      .join((enter) => {
        const g = enter.append('g').attr('class', 'hom-arrow');
        g.append('path').attr('d', 'M-7,-4.5 L3,0 L-7,4.5 L-4.5,0Z');
        return g;
      })
      .style('--c', (d) => color(d.route))
      .attr('data-x', (d) => d.tip[0])
      .attr('data-y', (d) => d.tip[1])
      .attr('data-a', (d) => d.angle);
  }

  protected rescale() {
    const k = this.k;
    this.g.selectAll<SVGGElement, unknown>('g.hom-arrow').attr('transform', function () {
      return `translate(${this.dataset.x},${this.dataset.y}) rotate(${this.dataset.a}) scale(${1 / k})`;
    });
  }
}
