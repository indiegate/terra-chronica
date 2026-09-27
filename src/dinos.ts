import * as d3 from 'd3';
import { rotateLonLat, type Plates } from './plates';
import type { MapLayer } from './layers/layer';
import type { TimeState } from './time';

/*
 * Dinosaur habitat zones: fossil sites (Paleobiology Database) alive around the
 * current age are moved with their plates, then drawn as density contours per
 * group, each marked with a small silhouette.
 */

interface Group {
  id: string;
  name: string;
  example: string;
}
interface Data {
  groups: Group[];
  /** [lon, lat, plate, oldestMa, youngestMa, group] */
  finds: [number, number, number, number, number, number][];
  impact: { lon: number; lat: number; plate: number };
}

const COLOURS: Record<string, string> = {
  theropods: '#9b3b2a',
  sauropods: '#5f7f4e',
  ceratopsians: '#b0782a',
  thyreophorans: '#4a6a8a',
  ornithopods: '#8a5a7a',
};

/** Simple side-on silhouettes (viewBox 0 0 100 60), drawn for this atlas. */
const SILHOUETTES: Record<string, string> = {
  theropods:
    'M2 31 C20 25 40 21 55 21 C62 13 72 9 84 10 C92 11 98 15 98 20 C98 24 94 25 88 25 L86 28 C80 29 74 29 70 31 C68 37 66 41 64 45 L69 57 L63 57 L58 46 L54 46 L52 57 L46 57 L48 45 C42 41 38 37 34 35 C24 35 12 34 2 31 Z M72 33 L78 37 L76 38 L70 35 Z',
  sauropods:
    'M0 39 C12 37 24 33 34 31 C40 25 54 23 64 27 C70 19 76 9 84 6 C88 4 94 5 95 8 C95 11 91 11 88 12 C82 15 78 23 76 33 C76 39 74 43 72 45 L72 57 L66 57 L65 46 L50 47 L49 57 L43 57 L42 45 C36 43 30 41 22 41 C14 42 6 41 0 39 Z',
  ceratopsians:
    'M4 35 C10 31 20 27 34 25 C46 21 58 23 66 27 L70 15 L77 11 L78 19 C85 17 93 19 96 23 L100 21 L98 27 C96 31 92 33 88 33 L90 37 C86 41 80 41 76 39 C74 43 72 45 70 47 L70 57 L64 57 L62 47 L40 47 L38 57 L32 57 L31 46 C24 43 16 39 4 35 Z',
  thyreophorans:
    'M2 41 C12 39 22 35 30 33 L32 25 L36 31 L40 21 L45 29 L50 19 L55 28 L60 21 L64 30 L68 25 L70 33 C78 33 86 35 92 39 C96 41 98 43 96 45 C92 46 86 45 82 45 C80 47 78 49 76 49 L76 57 L70 57 L69 49 L44 49 L43 57 L37 57 L36 47 C26 45 14 43 2 41 Z',
  ornithopods:
    'M2 35 C16 31 30 27 44 25 C52 19 60 15 68 13 L74 5 L76 13 C84 13 92 15 95 19 C96 22 92 23 86 23 C80 25 76 29 72 33 C70 39 68 43 66 45 L70 57 L64 57 L60 47 L55 47 L54 57 L48 57 L49 45 C40 41 30 38 20 37 C12 36 6 36 2 35 Z',
};

/** Finds count if the age lies within their range, widened by this much (Ma). */
const WINDOW = 3;
/** Kernel width for the zones, in CSS px at the world view (~250 km). */
const BANDWIDTH = 9;
/** Recompute at most this often while the age changes (ms). */
const THROTTLE = 120;
/** Non-avian dinosaurs end with the Chicxulub impact (Ma). */
export const EXTINCTION = 66;

export class Dinosaurs implements MapLayer {
  readonly id = 'dinosaurs';
  readonly title = 'Dinosaurs';
  readonly group = 'life';
  readonly span = { fromBP: 252e6, toBP: EXTINCTION * 1e6 };
  readonly defaultOn = true;
  private enabled = true;
  private data: Data | null = null;
  private loading: Promise<void> | null = null;
  private layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  private key: HTMLDivElement;
  private timer = 0;
  private last = 0;
  private age = 0;
  private k = 1;
  private fading = false;

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    host: HTMLElement,
    private plates: () => Plates | null,
    private project: (lon: number, lat: number) => [number, number] | null,
    private size: () => [number, number],
    private url: string,
  ) {
    const defs = svg.insert('defs', ':first-child');
    for (const [id, d] of Object.entries(SILHOUETTES)) {
      defs.append('symbol').attr('id', `dino-${id}`).attr('viewBox', '0 0 100 60').append('path').attr('d', d);
    }
    this.layer = parent.append('g').attr('class', 'dinosaurs');
    this.key = document.createElement('div');
    this.key.className = 'dino-key';
    host.appendChild(this.key);
  }

  /** Where Chicxulub was at the current age (projected, k=1 px). */
  impactPoint(): [number, number] | null {
    const plates = this.plates();
    if (!this.data || !plates) return null;
    const { lon, lat, plate } = this.data.impact;
    const [rl, rt] = rotateLonLat(plates.rotation(plate), lon, lat);
    return this.project(rl, rt);
  }

  async load() {
    this.loading ??= fetch(this.url)
      .then((r) => r.json())
      .then((d: Data) => {
        this.data = d;
        queueMicrotask(() => this.render());
        this.key.innerHTML = d.groups
          .map((g) => `<div><svg viewBox="0 0 100 60" style="color:${COLOURS[g.id]}"><use href="#dino-${g.id}"/></svg>${g.name}</div>`)
          .join('');
      });
    return this.loading;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on && this.age > 0 && this.age < 260) void this.load();
    this.render();
  }

  /** Show zones for the current age; outside deep time they are hidden. Throttled while the age keeps changing. */
  update(t: TimeState) {
    const age = t.mode === 'deep' ? t.age : 0;
    this.age = age;
    if (this.enabled && age > 0 && age < 260) void this.load();
    const due = this.last + THROTTLE - performance.now();
    clearTimeout(this.timer);
    if (due <= 0) this.render();
    else this.timer = window.setTimeout(() => this.render(), due);
  }

  scale(k: number) {
    this.k = k;
    this.layer.selectAll<SVGGElement, unknown>('g.dino-icon').attr('transform', function () {
      return `translate(${this.dataset.x},${this.dataset.y}) scale(${1 / k})`;
    });
  }

  /** Let the zones die out with the impact: keep them while it strikes, then fade. */
  fadeOut(delay: number) {
    this.fading = true;
    this.layer
      .interrupt()
      .transition()
      .delay(delay)
      .duration(1600)
      .style('opacity', 0)
      .on('end interrupt', () => {
        this.fading = false;
        this.layer.style('opacity', null);
        this.render();
      });
  }

  render() {
    if (this.fading) return;
    this.last = performance.now();
    const plates = this.plates();
    const age = this.age;
    const [w, h] = this.size();
    const groups = this.enabled && this.data && plates && age >= EXTINCTION ? this.data.groups : [];
    const zones: { group: Group; paths: d3.ContourMultiPolygon; count: number }[] = [];
    for (const [gi, group] of groups.entries()) {
      const pts: [number, number][] = [];
      for (const [lon, lat, plate, oldest, youngest, g] of this.data!.finds) {
        if (g !== gi || age > oldest + WINDOW || age < youngest - WINDOW) continue;
        const [rl, rt] = rotateLonLat(plates!.rotation(plate), lon, lat);
        const p = this.project(rl, rt);
        if (p) pts.push(p);
      }
      if (pts.length < 2) continue;
      // A zone needs roughly two or more nearby sites.
      const threshold = 1.2 / (2 * Math.PI * BANDWIDTH * BANDWIDTH);
      const [contour] = d3.contourDensity<[number, number]>().x((d) => d[0]).y((d) => d[1]).size([w, h]).bandwidth(BANDWIDTH).thresholds([threshold])(pts);
      if (contour?.coordinates.length) zones.push({ group, paths: contour, count: pts.length });
    }

    const path = d3.geoPath();
    this.layer
      .selectAll<SVGPathElement, (typeof zones)[number]>('path.dino-zone')
      .data(zones, (d) => d.group.id)
      .join('path')
      .attr('class', 'dino-zone')
      .style('--dino', (d) => COLOURS[d.group.id])
      .attr('d', (d) => path(d.paths));

    // A silhouette on each group's two largest zones, nudged apart if they collide.
    const icons: { group: Group; x: number; y: number; count: number }[] = [];
    for (const z of zones) {
      z.paths.coordinates
        .map((poly) => ({ ring: poly[0] as [number, number][], area: Math.abs(d3.polygonArea(poly[0] as [number, number][])) }))
        .filter((p) => p.area > 120)
        .sort((a, b) => b.area - a.area)
        .slice(0, 2)
        .forEach(({ ring }) => {
          let [x, y] = d3.polygonCentroid(ring);
          while (icons.some((i) => Math.hypot(i.x - x, i.y - y) < 26)) y += 18;
          icons.push({ group: z.group, x, y, count: z.count });
        });
    }
    this.layer
      .selectAll<SVGGElement, (typeof icons)[number]>('g.dino-icon')
      .data(icons)
      .join((enter) => {
        const g = enter.append('g').attr('class', 'dino-icon');
        g.append('use').attr('x', -19).attr('y', -11.5).attr('width', 38).attr('height', 23);
        g.append('title');
        return g;
      })
      .attr('data-x', (d) => d.x)
      .attr('data-y', (d) => d.y)
      .style('color', (d) => COLOURS[d.group.id])
      .call((g) => g.select('use').attr('href', (d) => `#dino-${d.group.id}`))
      .call((g) => g.select('title').text((d) => `${d.group.name}: ${d.group.example}. ${d.count} fossil sites near this age.`));
    this.scale(this.k);
    this.key.classList.toggle('shown', zones.length > 0);
  }
}
