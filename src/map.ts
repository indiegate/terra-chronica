import * as d3 from 'd3';
import earcut from 'earcut';
import { CIVILISATIONS, capitalAt, civFor, type Capital, type Civilisation } from './data/civilisations';
import { inkFor, isPeoples } from './format';
import { Plates, rotateLonLat, type RotationModel } from './plates';
import { PALEO_LABELS } from './data/geology';
import { Dinosaurs } from './dinos';
import { playImpact } from './impact';
import { Renderer, type Colours, type LandLayer, type RGBA, type TerritoryLayer, type View } from './gl/renderer';
import type { LandMesh, TerritoryMesh, TerritoryMeta, WorkerRequest } from './gl/types';
import { toggleLayer, type MapLayer } from './layers/layer';
import { HISTORY_SPAN, deepTime, historyTime, type TimeState } from './time';
import { HomininSites, Journeys, SpeciesRanges } from './layers/prehistory';
import { PRE_END, type Site } from './data/prehistory';

/*
 * The map is drawn with WebGL (see gl/renderer.ts): land comes from Natural
 * Earth coastlines split by tectonic plate, rotated to the current age in the
 * vertex shader; territories are drawn from pre-projected snapshot meshes.
 * Meshes are built in a worker. Labels and capitals are an SVG overlay.
 */

interface LabelItem {
  name: string;
  x: number; // CSS px at k=1
  y: number;
  area: number; // px² at k=1
  el?: SVGTextElement;
}

type Tint = { fill: number[]; hover: number[]; dim: number[]; selected: number[]; stroke: number[]; strokeDim: number[]; peoples: boolean; approx: boolean };

interface Snapshot {
  year: number;
  meta: TerritoryMeta[];
  order: number[];
  lo: TerritoryLayer;
  hi: TerritoryLayer | null;
  hiLoading: boolean;
  tints: Tint[];
  labels: d3.Selection<SVGGElement, unknown, null, undefined>;
  items: LabelItem[];
  opacity: number;
}

export interface TerritoryHit {
  name: string;
  subjectOf: string | null;
  partOf: string | null;
  precision: number | null;
  snapshot: number;
  civ?: Civilisation;
}

/** The Chicxulub impact (Ma): crossing it plays the impact animation. */
const IMPACT_AGE = 66;

/** Sphere radius used when pre-projecting the data (metres). */
const EARTH_RADIUS = 6378137;
/** Full-detail territory borders from this zoom level. */
const ZOOM_DETAIL = 4;
/** Coastline scale by zoom level. */
const LAND_TIERS: [number, 'lo' | 'mid' | 'hi'][] = [[1, 'lo'], [1.6, 'mid'], [2.5, 'hi']];
/** Dashed ("uncertain") borders from this zoom level. */
const ZOOM_DASHES = 2;
/**
 * Before the Cambrian, today's coastline shapes would be anachronistic: the map
 * fades to the plate model's continental blocks between these ages (Ma).
 */
const BLOCKS_FROM = 540;
const BLOCKS_FULL = 600;

const DATA = (file: string) => new URL(`${import.meta.env.BASE_URL}data/${file}`, location.href).href;

export class MapView {
  private stage: HTMLDivElement;
  private renderer: Renderer;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private world: d3.Selection<SVGGElement, unknown, null, undefined>;
  private labelRoot: d3.Selection<SVGGElement, unknown, null, undefined>;
  private capitalRoot: d3.Selection<SVGGElement, unknown, null, undefined>;
  private paleoRoot: d3.Selection<SVGGElement, unknown, null, undefined>;
  private dinos: Dinosaurs;
  private layers: MapLayer[] = [];
  private time: TimeState = historyTime(1);
  private showBorders = true;
  private lastImpact = 0;
  private tooltip: HTMLDivElement;
  private projection = d3.geoNaturalEarth1();
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private t = d3.zoomIdentity;
  private width = 0;
  private height = 0;
  private snapshots = new Map<number, Snapshot>();
  private pending = new Map<number, Promise<Snapshot>>();
  private meshes = new Map<number, Promise<TerritoryMesh>>();
  private dominant: number | null = null;
  private year = 0;
  private selected: string | null = null;
  private selectedNames = new Set<string>();
  private hovered = -1;
  private lands = new Map<string, LandLayer>();
  private blocks: LandLayer | null = null;
  private blocksLoading = false;
  private landsLoading = new Set<string>();
  private plates: Plates | null = null;
  private plateIndex: Record<number, number> = { 0: 0 };
  private plateIds: number[] = [0];
  private age = 0;
  private frame = 0;
  /** Pointer position still to be hit-tested (picking reads back from the GPU, so only after it moves). */
  private pointer: { x: number; y: number; ev: PointerEvent } | null = null;
  private worker: Worker;
  private requests = new Map<number, (r: { result?: unknown; error?: string }) => void>();
  private nextRequest = 1;
  private ready: Promise<void>;
  private colours: Record<'ink' | 'land' | 'inkSoft' | 'sea' | 'seaInk', number[]>;

  onSelect: (hit: TerritoryHit | null) => void = () => {};
  /** A hominin site was clicked. */
  onSite: (site: Site) => void = () => {};

  constructor(private host: HTMLElement) {
    const css = getComputedStyle(document.documentElement);
    const hex = (n: string) => parseHex(css.getPropertyValue(n).trim());
    this.colours = { ink: hex('--ink'), inkSoft: hex('--ink-soft'), land: hex('--land'), sea: hex('--sea'), seaInk: hex('--sea-ink') };

    this.stage = document.createElement('div');
    this.stage.className = 'stage';
    host.prepend(this.stage);
    const canvas = document.createElement('canvas');
    canvas.className = 'gl';
    this.stage.appendChild(canvas);
    const c = this.colours;
    const rgba = (rgb: number[], a: number): RGBA => [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, a];
    const palette: Colours = {
      sea: rgba(c.sea, 1),
      seaInk: rgba(c.seaInk, 0.22),
      land: rgba(c.land, 1),
      coast: rgba(c.ink, 0.75),
      graticule: rgba(c.inkSoft, 0.35),
      edge: rgba(c.inkSoft, 0.6),
    };
    this.renderer = new Renderer(canvas, sphereGeometry(), palette);

    this.svg = d3.select(this.stage).append('svg').attr('class', 'map-svg');
    this.world = this.svg.append('g').attr('class', 'world');
    this.capitalRoot = this.world.append('g').attr('class', 'capitals');
    this.labelRoot = this.world.append('g').attr('class', 'labels');
    const dinoRoot = this.world.insert('g', '.labels').attr('class', 'dino-root');
    const prehistoryRoot = this.world.insert('g', '.labels').attr('class', 'prehistory');
    this.paleoRoot = this.world.append('g').attr('class', 'paleo-labels');
    this.dinos = new Dinosaurs(
      this.svg,
      dinoRoot,
      host,
      () => this.plates,
      (lon, lat) => this.projection([lon, lat]) as [number, number] | null,
      () => [this.width, this.height],
      DATA('dinosaurs.json'),
    );

    this.addLayer(
      toggleLayer({ id: 'borders', title: 'Realms & peoples', group: 'people', span: HISTORY_SPAN, defaultOn: true }, (on) => {
        this.showBorders = on;
        this.labelRoot.classed('layer-off', !on);
        if (!on) this.setHovered(-1);
        this.invalidate();
      }),
    );
    this.addLayer(
      toggleLayer({ id: 'capitals', title: 'Capitals', group: 'people', span: HISTORY_SPAN, defaultOn: true }, (on) => {
        this.capitalRoot.classed('layer-off', !on);
      }),
    );
    this.addLayer(
      toggleLayer(
        { id: 'paleo-names', title: 'Past continents & oceans', group: 'earth', span: { fromBP: 1000e6, toBP: PRE_END }, defaultOn: true },
        (on) => void this.paleoRoot.classed('layer-off', !on),
      ),
    );
    this.addLayer(this.dinos);
    const ctx = {
      root: prehistoryRoot,
      project: (lon: number, lat: number) => this.projection([lon, lat]) as [number, number] | null,
      geoPath: () => d3.geoPath(this.projection),
    };
    const sites = new HomininSites(ctx);
    sites.onSelect = (s) => this.onSite(s);
    for (const layer of [new SpeciesRanges(ctx), new Journeys(ctx), sites]) this.addLayer(layer);

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'map-tooltip';
    host.appendChild(this.tooltip);

    this.worker = new Worker(new URL('./gl/mesh.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
      this.requests.get(e.data.id)?.(e.data);
      this.requests.delete(e.data.id);
    };

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 48])
      .on('zoom', (e) => {
        this.t = e.transform;
        this.world.attr('transform', e.transform.toString());
        this.host.style.setProperty('--k', String(this.t.k));
        this.scaleOverlays();
        this.setHovered(-1);
        this.invalidate();
      })
      .on('end', () => {
        this.layoutLabels();
        this.ensureDetail();
      });
    this.svg.call(this.zoom).on('dblclick.zoom', null);
    this.svg.on('click', (e: MouseEvent) => {
      const id = this.pickAt(e);
      const snap = this.dominant !== null ? this.snapshots.get(this.dominant) : undefined;
      if (snap && id >= 0) this.select(snap.meta[id].name, snap.year);
      else this.select(null);
    });
    this.svg.on('pointermove', (e: PointerEvent) => {
      if (e.buttons) return; // dragging
      const [x, y] = d3.pointer(e, this.svg.node());
      this.pointer = { x, y, ev: e };
      this.invalidate();
    });
    this.svg.on('pointerleave', () => {
      this.pointer = null;
      this.setHovered(-1);
    });

    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();

    // Plate ids → rows of the rotation texture.
    this.ready = fetch(DATA('rotations.json'))
      .then((r) => r.json())
      .then((model: RotationModel) => {
        this.plates = new Plates(model);
        for (const id of Object.keys(model).map(Number)) {
          if (this.plateIndex[id] !== undefined) continue;
          this.plateIndex[id] = this.plateIds.length;
          this.plateIds.push(id);
        }
        this.ensureDetail();
      });
  }

  // ── Layers ───────────────────────────────────────────────────────────

  /** Switchable layers, in the order they were added. */
  get layerList(): readonly MapLayer[] {
    return this.layers;
  }

  addLayer(layer: MapLayer) {
    this.layers.push(layer);
    layer.setEnabled(layer.defaultOn);
    layer.update(this.time);
    layer.scale?.(this.t.k);
  }

  setLayerEnabled(id: string, on: boolean) {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.setEnabled(on);
    layer.update(this.time);
  }

  private updateLayers() {
    for (const layer of this.layers) layer.update(this.time);
  }

  // ── Worker ───────────────────────────────────────────────────────────

  private request<T>(req: WorkerRequest): Promise<T> {
    const id = this.nextRequest++;
    return new Promise((resolve, reject) => {
      this.requests.set(id, (r) => (r.error ? reject(new Error(r.error)) : resolve(r.result as T)));
      this.worker.postMessage({ ...req, id });
    });
  }

  // ── Layout ───────────────────────────────────────────────────────────

  private resize() {
    const r = this.host.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    this.width = r.width;
    this.height = r.height;
    this.renderer.resize(r.width, r.height, Math.min(2, window.devicePixelRatio || 1));
    this.svg.attr('width', r.width).attr('height', r.height);
    this.projection.fitExtent([[24, 24], [r.width - 24, r.height - 24]], { type: 'Sphere' });
    this.zoom.translateExtent([[0, 0], [r.width, r.height]]).extent([[0, 0], [r.width, r.height]]);
    for (const snap of this.snapshots.values()) {
      snap.items = this.labelItems(snap.meta);
      this.renderLabels(snap);
    }
    this.renderCapitals();
    this.layoutLabels();
    this.renderPaleoLabels();
    this.dinos?.render();
    for (const layer of this.layers) layer.resize?.();
    this.invalidate();
  }

  /** Projected metres → CSS px at the current zoom. */
  private view(): View {
    const s = this.projection.scale() / EARTH_RADIUS;
    const [tx, ty] = this.projection.translate();
    const { k, x, y } = this.t;
    return { a: k * s, bx: k * tx + x, by: k * ty + y, panX: x, panY: y };
  }

  /** Projected metres → CSS px at k=1 (label and overlay space). */
  private toPx(mx: number, my: number): [number, number] {
    const s = this.projection.scale() / EARTH_RADIUS;
    const [tx, ty] = this.projection.translate();
    return [tx + s * mx, ty - s * my];
  }

  // ── Drawing ──────────────────────────────────────────────────────────

  private invalidate() {
    if (!this.frame) this.frame = requestAnimationFrame(() => this.draw());
  }

  private draw() {
    this.frame = 0;
    // Hover is resolved at most once per frame, and only after the pointer moved.
    if (this.pointer) {
      this.setHovered(this.pickAt(this.pointer), this.pointer.ev);
      this.pointer = null;
    }
    const visible = [...this.snapshots.values()].filter((s) => s.opacity > 0.01).sort((a, b) => a.year - b.year);
    this.renderer.draw({
      view: this.view(),
      age: this.age,
      lands: this.landLayers(),
      territories: this.age > 0 || !this.showBorders ? [] : visible.map((s) => ({ layer: this.tier(s), opacity: s.opacity })),
      dashes: this.t.k >= ZOOM_DASHES,
    });
  }

  /**
   * Continental blocks fade in under the coastlines, then the coastlines fade
   * out, so land never turns see-through mid-transition.
   */
  private landLayers() {
    const w = Math.max(0, Math.min(1, (this.age - BLOCKS_FROM) / (BLOCKS_FULL - BLOCKS_FROM)));
    const coast = this.land();
    const out: { layer: LandLayer; alpha: number }[] = [];
    if (this.blocks && w > 0) out.push({ layer: this.blocks, alpha: Math.min(1, 2 * w) });
    if (coast && (w < 1 || !this.blocks)) out.push({ layer: coast, alpha: this.blocks ? Math.min(1, 2 * (1 - w)) : 1 });
    return out;
  }

  /** Coastline at the right scale for the zoom level, or the nearest one loaded. */
  private land(): LandLayer | null {
    const want = this.landTier();
    if (this.lands.has(want)) return this.lands.get(want)!;
    for (const tier of ['mid', 'lo', 'hi']) if (this.lands.has(tier)) return this.lands.get(tier)!;
    return null;
  }

  private landTier() {
    return [...LAND_TIERS].reverse().find(([k]) => this.t.k >= k)![1];
  }

  private tier(s: Snapshot) {
    return this.t.k >= ZOOM_DETAIL && s.hi ? s.hi : s.lo;
  }

  /** Load the coastline and full-detail borders the current zoom needs. */
  private ensureDetail() {
    if (!this.plates) return;
    const tier = this.landTier();
    if (!this.lands.has(tier) && !this.landsLoading.has(tier)) {
      this.landsLoading.add(tier);
      void this.request<LandMesh>({ kind: 'land', url: DATA(`plates-land-${tier}.json`), plateIndex: this.plateIndex }).then((mesh) => {
        this.lands.set(tier, this.renderer.landLayer(mesh));
        this.invalidate();
      });
    }
    if (this.age > BLOCKS_FROM && !this.blocks && !this.blocksLoading) {
      this.blocksLoading = true;
      void this.request<LandMesh>({ kind: 'land', url: DATA('plates-blocks.json'), plateIndex: this.plateIndex }).then((mesh) => {
        this.blocks = this.renderer.landLayer(mesh);
        this.invalidate();
      });
    }
    if (this.t.k < ZOOM_DETAIL) return;
    for (const snap of this.snapshots.values()) {
      if (snap.hi || snap.hiLoading || snap.opacity <= 0.01) continue;
      snap.hiLoading = true;
      void this.request<TerritoryMesh>({ kind: 'territories', url: DATA(`borders_${snap.year}.json`), order: snap.order }).then((mesh) => {
        if (!this.snapshots.has(snap.year)) return;
        snap.hi = this.renderer.territoryLayer(mesh);
        this.uploadColours(snap);
        this.invalidate();
      });
    }
  }

  // ── Geological age (plate reconstruction) ────────────────────────────

  /**
   * Show land as it was `ma` million years ago. Territories, labels and
   * capitals are hidden for any age above zero (they belong to human history).
   */
  async setGeoAge(ma: number, time?: TimeState) {
    await this.ready;
    const previous = this.age;
    this.age = Math.max(0, ma);
    this.time = time ?? (this.age > 0 ? deepTime(this.age) : historyTime(this.year));
    this.plates!.setAge(this.age);
    const quats = new Float32Array(this.plateIds.length * 4);
    this.plateIds.forEach((id, i) => quats.set(this.plates!.rotation(id), i * 4));
    this.renderer.setRotations(quats);
    this.host.classList.toggle('deep-time', this.age > 0);
    if (this.age > 0) {
      this.setHovered(-1);
      this.select(null);
    }
    this.renderPaleoLabels();
    // Moving forward in time past the impact (or landing exactly on it) replays it.
    const crossed = previous > IMPACT_AGE && this.age <= IMPACT_AGE && this.age > IMPACT_AGE - 6;
    const impact = (crossed || (this.age === IMPACT_AGE && previous !== IMPACT_AGE)) && performance.now() - this.lastImpact > 5000;
    if (!impact) this.updateLayers();
    this.ensureDetail();
    this.invalidate();
    if (impact) {
      this.lastImpact = performance.now();
      this.dinos.fadeOut(900);
      this.updateLayers(); // the dinosaurs apply it once their fade ends
      void this.dinos.load().then(() => {
        const p = this.dinos.impactPoint();
        if (p) playImpact(this.stage, this.t.applyX(p[0]), this.t.applyY(p[1]));
      });
    }
  }

  /** Names of past continents and oceans, placed where their plates were at this age. */
  private renderPaleoLabels() {
    const plates = this.plates;
    const active = plates && this.age > 0 ? PALEO_LABELS.filter((l) => this.age <= l.from && this.age >= l.to) : [];
    const RAD = Math.PI / 180;
    const placed = active.flatMap((l) => {
      // Mean direction of the reconstructed anchors (on the sphere, so it works across ±180°).
      let x = 0, y = 0, z = 0;
      for (const [plate, lon, lat] of l.anchors) {
        const [plon, plat] = rotateLonLat(plates!.rotation(plate), lon, lat);
        x += Math.cos(plat * RAD) * Math.cos(plon * RAD);
        y += Math.cos(plat * RAD) * Math.sin(plon * RAD);
        z += Math.sin(plat * RAD);
      }
      const s = l.antipode ? -1 : 1;
      const p = this.projection([(Math.atan2(s * y, s * x)) / RAD, Math.asin((s * z) / Math.hypot(x, y, z)) / RAD]);
      return p ? [{ ...l, x: p[0], y: p[1] }] : [];
    });
    this.paleoRoot
      .selectAll<SVGTextElement, (typeof placed)[number]>('text')
      .data(placed, (d) => d.name)
      .join('text')
      .attr('class', (d) => `paleo ${d.kind}`)
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .text((d) => d.name);
    this.scaleOverlays();
  }

  // ── Year & snapshots ─────────────────────────────────────────────────

  /** Show a blend of snapshots `a` and `b` with weight `t` towards `b`. */
  async show(year: number, a: number, b: number, t: number) {
    this.year = year;
    if (this.age === 0) {
      this.time = historyTime(year);
      this.updateLayers();
    }
    // The later survey inks in over the earlier one, then the earlier one fades.
    const w = b === a ? 0 : smoothstep(0.25, 0.75, t);
    const wanted = new Map<number, number>([[a, w < 0.5 ? 1 : 2 * (1 - w)]]);
    if (b !== a) wanted.set(b, w < 0.5 ? 2 * w : 1);

    const [sa, sb] = await Promise.all([this.snapshot(a), b !== a ? this.snapshot(b) : null]);
    if (this.year !== year) return; // superseded while loading

    for (const [y, snap] of this.snapshots) {
      snap.opacity = wanted.get(y) ?? 0;
      snap.labels.style('display', 'none');
    }
    const dom = w >= 0.5 && sb ? sb : sa;
    dom.labels.style('display', null);
    if (this.dominant !== dom.year) {
      this.dominant = dom.year;
      this.setHovered(-1); // the territory under the pointer belongs to the old survey
      this.layoutLabels();
      this.dropStaleSelection(dom);
      this.applySelection();
    }
    this.renderCapitals();
    this.evict([a, b]);
    this.ensureDetail();
    this.invalidate();
  }

  private mesh(year: number) {
    let m = this.meshes.get(year);
    if (!m) {
      m = this.request<TerritoryMesh>({ kind: 'territories', url: DATA(`borders_${year}.lo.json`) });
      this.meshes.set(year, m);
      // Keep a handful of prepared meshes around for scrubbing back and forth.
      if (this.meshes.size > 8) this.meshes.delete(this.meshes.keys().next().value!);
    }
    return m;
  }

  private snapshot(year: number): Promise<Snapshot> {
    const have = this.snapshots.get(year);
    if (have) return Promise.resolve(have);
    let p = this.pending.get(year);
    if (!p) {
      p = this.mesh(year).then((mesh) => this.buildSnapshot(year, mesh));
      this.pending.set(year, p);
      p.finally(() => this.pending.delete(year));
    }
    return p;
  }

  prefetch(year: number) {
    void this.mesh(year);
  }

  private buildSnapshot(year: number, mesh: TerritoryMesh): Snapshot {
    const existing = this.snapshots.get(year);
    if (existing) return existing;
    const labels = this.labelRoot.append('g').attr('class', 'snapshot-labels').style('display', 'none');
    const snap: Snapshot = {
      year,
      meta: mesh.meta,
      order: mesh.order,
      lo: this.renderer.territoryLayer(mesh),
      hi: null,
      hiLoading: false,
      tints: mesh.meta.map((m) => this.tintFor(m, year)),
      labels,
      items: this.labelItems(mesh.meta),
      opacity: 0,
    };
    this.renderLabels(snap);
    this.uploadColours(snap);
    this.snapshots.set(year, snap);
    return snap;
  }

  private evict(keep: number[]) {
    if (this.snapshots.size <= 4) return;
    for (const [y, snap] of this.snapshots) {
      if (keep.includes(y)) continue;
      snap.labels.remove();
      snap.lo.dispose();
      snap.hi?.dispose();
      this.snapshots.delete(y);
      if (this.snapshots.size <= 4) break;
    }
  }

  // ── Colours ──────────────────────────────────────────────────────────

  private tintFor(m: TerritoryMeta, year: number): Tint {
    const civ = civFor(m.name, year);
    const base = parseHex(inkFor(civ?.id ?? (m.subjecto && m.subjecto !== m.name ? m.subjecto : m.name)));
    const { ink, land } = this.colours;
    const peoples = isPeoples(m.name);
    return {
      fill: peoples ? mix(base, land, 0.37) : base,
      hover: peoples ? mix(base, land, 0.7) : mix(base, ink, 0.82),
      dim: mix(base, land, 0.33),
      selected: mix(base, ink, 0.8),
      stroke: peoples ? mix(base, land, 0.55) : mix(base, ink, 0.75),
      strokeDim: mix(base, land, 0.4),
      peoples,
      approx: (m.precision ?? 1) <= 1,
    };
  }

  /** Per-feature fill and stroke for the current hover and selection state. */
  private uploadColours(snap: Snapshot) {
    const data = new Uint8Array(snap.meta.length * 8);
    const hasSel = this.selectedNames.size > 0;
    const hovered = snap.year === this.dominant ? this.hovered : -1;
    snap.meta.forEach((m, i) => {
      const t = snap.tints[i];
      const sel = hasSel && this.selectedNames.has(m.name);
      const fill = sel ? t.selected : hasSel ? t.dim : i === hovered ? t.hover : t.fill;
      const stroke = sel ? this.colours.ink : hasSel ? t.strokeDim : t.stroke;
      const width = sel ? 2 : t.peoples ? 0.7 : 1.1;
      const dashed = t.approx && !sel;
      data.set([fill[0], fill[1], fill[2], 255, stroke[0], stroke[1], stroke[2], Math.round((width / 5) * 255) + (dashed ? 128 : 0)], i * 8);
    });
    snap.lo.setColours(data);
    snap.hi?.setColours(data);
  }

  // ── Labels ───────────────────────────────────────────────────────────

  private labelItems(meta: TerritoryMeta[]): LabelItem[] {
    const s = this.projection.scale() / EARTH_RADIUS;
    const best = new Map<string, LabelItem>();
    for (const m of meta) {
      if (m.label.area <= 0) continue;
      const area = m.label.area * s * s;
      const prev = best.get(m.name);
      if (prev && prev.area >= area) continue;
      const [x, y] = this.toPx(m.label.x, m.label.y);
      best.set(m.name, { name: m.name, x, y, area });
    }
    // States outrank loosely-bounded peoples when labels compete for room.
    const score = (l: LabelItem) => l.area * (isPeoples(l.name) ? 0.3 : 1);
    return [...best.values()].sort((a, b) => score(b) - score(a));
  }

  private renderLabels(snap: Snapshot) {
    snap.labels.selectAll('*').remove();
    for (const item of snap.items) {
      item.el = snap.labels
        .append('text')
        .attr('class', isPeoples(item.name) ? 'label peoples' : 'label')
        .attr('x', item.x)
        .attr('y', item.y)
        .text(item.name)
        .node()!;
    }
  }

  /** Greedy, collision-aware label culling in screen space. */
  private layoutLabels() {
    const snap = this.dominant !== null ? this.snapshots.get(this.dominant) : undefined;
    if (!snap) return;
    const t = this.t;
    const k = t.k;
    const placed: [number, number, number, number][] = [];
    for (const item of snap.items) {
      const el = item.el!;
      const span = Math.sqrt(item.area) * k;
      const peoples = isPeoples(item.name);
      // Fit the label within roughly the territory's width, shrinking long names.
      const chars = item.name.length * (peoples ? 0.5 : 0.68);
      const size = Math.min(peoples ? 14 : 18, span / 8 + 6, (span * (peoples ? 1.1 : 1.35)) / chars);
      const sx = t.applyX(item.x);
      const sy = t.applyY(item.y);
      const w = chars * size;
      const box: [number, number, number, number] = [sx - w / 2, sy - size / 2, sx + w / 2, sy + size / 2];
      const onScreen = box[2] > 0 && box[0] < this.width && box[3] > 0 && box[1] < this.height;
      const bigEnough = size >= (peoples ? 9.5 : 8.5) && span > 18;
      const clash = placed.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]));
      if (onScreen && bigEnough && !clash) {
        placed.push(box);
        el.style.display = '';
        el.style.fontSize = `${size / k}px`;
      } else {
        el.style.display = 'none';
      }
    }
  }

  // ── Capitals ─────────────────────────────────────────────────────────

  private renderCapitals() {
    const active = CIVILISATIONS.flatMap((civ) => {
      const cap = capitalAt(civ, this.year);
      return cap ? [{ civ, cap }] : [];
    });
    const g = this.capitalRoot
      .selectAll<SVGGElement, { civ: Civilisation; cap: Capital }>('g.capital')
      .data(active, (d) => `${d.civ.id}:${d.cap.name}`)
      .join((enter) => {
        const e = enter.append('g').attr('class', 'capital');
        e.append('path').attr('class', 'capital-mark').attr('d', d3.symbol(d3.symbolStar, 60)()!);
        e.append('text').attr('class', 'capital-name').attr('x', 7).attr('y', 3);
        e.on('click', (ev: MouseEvent, d) => {
          ev.stopPropagation();
          this.onSelect({ name: d.civ.name, subjectOf: null, partOf: null, precision: null, snapshot: this.dominant ?? 0, civ: d.civ });
        });
        e.append('title');
        return e;
      });
    g.each((d, i, nodes) => {
      const p = this.projection([d.cap.lon, d.cap.lat]);
      d3.select(nodes[i]).attr('data-x', p?.[0] ?? 0).attr('data-y', p?.[1] ?? 0);
    });
    g.select('text').text((d) => d.cap.name);
    g.select('title').text((d) => `${d.cap.name} — capital of ${d.civ.name}`);
    this.scaleOverlays();
  }

  private scaleOverlays() {
    const k = this.t.k;
    this.capitalRoot.selectAll<SVGGElement, unknown>('g.capital').attr('transform', function () {
      return `translate(${this.getAttribute('data-x')},${this.getAttribute('data-y')}) scale(${1 / k})`;
    });
    this.capitalRoot.classed('show-names', k >= 3);
    for (const layer of this.layers) layer.scale?.(k);
    this.paleoRoot.selectAll<SVGTextElement, { kind: string }>('text').style('font-size', (d) => `${(d.kind === 'ocean' ? 13 : 17) / k}px`);
  }

  // ── Interaction ──────────────────────────────────────────────────────

  /** Territory id under a point on the dominant snapshot (GPU picking), or -1. */
  private pickAt(p: { x: number; y: number } | MouseEvent): number {
    if (this.age > 0 || !this.showBorders) return -1;
    const snap = this.dominant !== null ? this.snapshots.get(this.dominant) : undefined;
    if (!snap) return -1;
    const [x, y] = p instanceof MouseEvent ? d3.pointer(p, this.svg.node()) : [p.x, p.y];
    return this.renderer.pickAt(this.tier(snap), this.view(), x, y);
  }

  private setHovered(id: number, e?: PointerEvent) {
    const snap = this.dominant !== null ? this.snapshots.get(this.dominant) : undefined;
    this.svg.style('cursor', id >= 0 ? 'pointer' : '');
    if (id < 0 || !snap || !e) {
      this.tooltip.style.opacity = '0';
    } else {
      const m = snap.meta[id];
      const civ = civFor(m.name, this.year);
      const [x, y] = d3.pointer(e, this.host);
      const sub = m.subjecto && m.subjecto !== m.name ? `<small>under ${esc(m.subjecto)}</small>` : '';
      const civLine = civ && civ.name !== m.name ? `<small>${esc(civ.name)}</small>` : '';
      this.tooltip.innerHTML = `<strong>${esc(m.name)}</strong>${civLine}${sub}`;
      this.tooltip.style.opacity = '1';
      const tx = Math.min(x + 16, this.width - this.tooltip.offsetWidth - 8);
      this.tooltip.style.transform = `translate(${tx}px, ${y + 14}px)`;
    }
    if (id === this.hovered) return;
    this.hovered = id;
    if (snap) {
      this.uploadColours(snap);
      this.invalidate();
    }
  }

  select(name: string | null, snapshot?: number) {
    this.selected = name;
    this.applySelection();
    if (!name) return this.onSelect(null);
    const snap = this.snapshots.get(snapshot ?? this.dominant ?? -1);
    const m = snap?.meta.find((x) => x.name === name);
    this.onSelect({
      name,
      subjectOf: m?.subjecto && m.subjecto !== name ? m.subjecto : null,
      partOf: m?.partof && m.partof !== name ? m.partof : null,
      precision: m?.precision ?? null,
      snapshot: snap?.year ?? 0,
      civ: civFor(name, this.year),
    });
  }

  /** Close the selection once its realm has vanished from the map and from history. */
  private dropStaleSelection(dom: Snapshot) {
    const sel = this.selected;
    if (!sel) return;
    const civ = civFor(sel, this.year) ?? CIVILISATIONS.find((c) => c.match.includes(sel));
    const alive = civ ? this.year >= civ.start - 100 && this.year <= civ.end + 100 : false;
    const names = new Set(civ ? civ.match : [sel]);
    if (!alive && !dom.meta.some((m) => names.has(m.name))) this.select(null);
  }

  private applySelection() {
    const sel = this.selected;
    const civ = sel ? civFor(sel, this.year) : undefined;
    this.selectedNames = new Set(civ ? civ.match : sel ? [sel] : []);
    for (const snap of this.snapshots.values()) this.uploadColours(snap);
    this.invalidate();
  }

  /** Zoom to fit all territories whose names are in `names` on the given snapshot. */
  async focus(names: string[], snapshot: number) {
    const snap = await this.snapshot(snapshot);
    const set = new Set(names);
    const boxes = snap.meta.filter((m) => set.has(m.name) && isFinite(m.bbox[0])).map((m) => m.bbox);
    if (!boxes.length) return false;
    const [x0, y1] = this.toPx(Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])));
    const [x1, y0] = this.toPx(Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3])));
    this.zoomToBox(x0, y0, x1, y1);
    return true;
  }

  focusPoint(lon: number, lat: number, k = 4) {
    const p = this.projection([lon, lat]);
    if (!p) return;
    const t = d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(k).translate(-p[0], -p[1]);
    this.svg.transition().duration(1200).ease(d3.easeCubicInOut).call(this.zoom.transform, t);
  }

  private zoomToBox(x0: number, y0: number, x1: number, y1: number) {
    const k = Math.max(1, Math.min(24, 0.8 / Math.max((x1 - x0) / this.width, (y1 - y0) / this.height)));
    const t = d3.zoomIdentity
      .translate(this.width / 2, this.height / 2)
      .scale(k)
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    this.svg.transition().duration(1200).ease(d3.easeCubicInOut).call(this.zoom.transform, t);
  }

  zoomBy(f: number) {
    this.svg.transition().duration(350).call(this.zoom.scaleBy, f);
  }

  resetView() {
    this.svg.transition().duration(900).ease(d3.easeCubicInOut).call(this.zoom.transform, d3.zoomIdentity);
  }

  setAnimating(on: boolean) {
    this.host.classList.toggle('animating', on);
  }
}

/**
 * Sphere outline (triangulated, for the sea), its edge, and the 10° graticule,
 * all in projected metres. Built once; the view transform does the rest.
 */
function sphereGeometry() {
  const proj = d3.geoNaturalEarth1().scale(EARTH_RADIUS).translate([0, 0]);
  const polylines = (obj: d3.GeoPermissibleObjects) => {
    const lines: number[][][] = [];
    let cur: number[][] = [];
    const ctx = {
      moveTo(x: number, y: number) {
        cur = [[x, -y]];
        lines.push(cur);
      },
      lineTo(x: number, y: number) {
        cur.push([x, -y]);
      },
      closePath() {
        cur.push([...cur[0]]);
      },
      arc() {},
      rect() {},
    };
    d3.geoPath(proj, ctx as unknown as d3.GeoContext)(obj);
    return lines;
  };
  const segments = (lines: number[][][]) => {
    const out: number[] = [];
    for (const line of lines) {
      let along = 0;
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = line[i - 1];
        const [bx, by] = line[i];
        out.push(ax, ay, bx, by, along);
        along += Math.hypot(bx - ax, by - ay);
      }
    }
    return new Float32Array(out);
  };
  const outline = polylines({ type: 'Sphere' })[0];
  const flat = outline.slice(0, -1).flat();
  const tris = earcut(flat);
  const sea = new Float32Array(tris.length * 2);
  tris.forEach((v, i) => sea.set([flat[v * 2], flat[v * 2 + 1]], i * 2));
  return { seaTriangles: sea, edge: segments([outline]), graticule: segments(polylines(d3.geoGraticule10())) };
}

function parseHex(c: string): number[] {
  const m = c.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
}

/** `w` of colour a, the rest b. */
function mix(a: number[], b: number[], w: number): number[] {
  return a.map((v, i) => Math.round(v * w + b[i] * (1 - w)));
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
