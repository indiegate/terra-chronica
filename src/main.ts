import { MapView, esc, type TerritoryHit } from './map';
import { Timeline } from './timeline';
import { bracket, loadManifest, loadNameIndex } from './data/borders';
import { CIVILISATIONS, ERAS, EVENTS, capitalAt, type Civilisation } from './data/civilisations';
import { EARTH_AGE, GEO_EVENTS, MAX_AGE, PERIODS, ageParts, formatAge, formatAgeShort, periodAt } from './data/geology';
import { formatSpan, formatYear, inkFor } from './format';
import { LayersPanel } from './layers/panel';
import { EPOCHS, PRE_END, PRE_EVENTS, PRE_START, SITES, SPECIES_BY_ID, epochAt, siteState, speciesAt, stageAt, type Site } from './data/prehistory';
import { FIRST_YEAR, LAST_YEAR, deepTime, historyTime, prehistoryTime } from './time';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const MIN_YEAR = FIRST_YEAR;
const MAX_YEAR = LAST_YEAR;

const map = new MapView($('#map'));
// Dev-only handle for profiling in the browser console.
if (import.meta.env.DEV) (window as unknown as { atlas: unknown }).atlas = { map };

// Human history: piecewise scale, recent centuries get more room.
const historyScale = (() => {
  const domain = [MIN_YEAR, -3000, -1000, 1, 1000, 1500, 1800, MAX_YEAR];
  const stops = [0, 0.14, 0.3, 0.46, 0.63, 0.76, 0.88, 1];
  const interp = (xs: number[], ys: number[], v: number) => {
    let i = 1;
    while (i < xs.length - 1 && v > xs[i]) i++;
    return ys[i - 1] + ((v - xs[i - 1]) / (xs[i] - xs[i - 1])) * (ys[i] - ys[i - 1]);
  };
  return { toPos: (y: number) => interp(domain, stops, y), fromPos: (p: number) => interp(stops, domain, p) };
})();

const timeline = new Timeline($('#timeline'), {
  ...historyScale,
  round: (y) => Math.round(y) || 1,
  bands: ERAS,
  events: EVENTS.map((e) => ({ value: e.year, label: e.label })),
  ticks: [-10000, -8000, -6000, -4000, -3000, -2000, -1500, -1000, -500, 1, 500, 1000, 1250, 1500, 1650, 1800, 1900, 2000],
  format: formatYear,
  tickFormat: formatYear,
});

// Deep time: the Earth's first 3.5 billion years (before the plate model) are
// compressed into the left of the slider; from 1 billion years ago a
// square-root scale of age, where the Precambrian takes about a quarter and
// Paleozoic, Mesozoic and Cenozoic share the rest roughly equally.
const EARLY_W = 0.16;
const deepline = new Timeline($('#deepline'), {
  toPos: (a) =>
    a > MAX_AGE
      ? (EARLY_W * (EARTH_AGE - Math.min(a, EARTH_AGE))) / (EARTH_AGE - MAX_AGE)
      : EARLY_W + (1 - EARLY_W) * (1 - Math.sqrt(Math.max(0, a) / MAX_AGE)),
  fromPos: (p) =>
    p < EARLY_W
      ? EARTH_AGE - (p / EARLY_W) * (EARTH_AGE - MAX_AGE)
      : MAX_AGE * (1 - (p - EARLY_W) / (1 - EARLY_W)) ** 2,
  round: (a) => (a >= 1000 ? Math.round(a / 10) * 10 : a >= 10 ? Math.round(a) : a >= 1 ? Math.round(a * 10) / 10 : Math.round(a * 1000) / 1000),
  bands: PERIODS.map((p) => ({ name: p.name, start: Math.min(p.start, EARTH_AGE), end: p.end, color: `color-mix(in srgb, ${p.color} 40%, #f6eedb)` })),
  events: GEO_EVENTS,
  ticks: [4540, 4000, 3000, 2000, 1000, 900, 800, 720, 635, 539, 500, 450, 400, 350, 300, 252, 200, 150, 100, 66, 34, 10, 2.58, 0],
  format: formatAge,
  tickFormat: formatAgeShort,
});

// Prehistory: log scale of years before present, from the first hominins to 10,000 BC.
const LOG_START = Math.log(PRE_START);
const LOG_END = Math.log(PRE_END);
const clampBP = (bp: number) => Math.max(PRE_END, Math.min(PRE_START, bp));

/** A number of years ago, split into number and unit for the date read-out. */
function yearsAgoParts(bp: number): [string, string] {
  if (bp >= 1e6) return [(bp / 1e6).toFixed(2).replace(/\.?0+$/, ''), 'million years ago'];
  const step = bp >= 100_000 ? 1000 : 100;
  return [(Math.round(bp / step) * step).toLocaleString('en-GB'), 'years ago'];
}
const formatYearsAgo = (bp: number) => (bp <= PRE_END ? '10,000 BC' : yearsAgoParts(bp).join(' '));

const preline = new Timeline($('#preline'), {
  toPos: (bp) => (LOG_START - Math.log(clampBP(bp))) / (LOG_START - LOG_END),
  fromPos: (p) => clampBP(Math.exp(LOG_START - p * (LOG_START - LOG_END))),
  round: (bp) => {
    const step = bp >= 1e6 ? 10_000 : bp >= 100_000 ? 1000 : bp >= 20_000 ? 100 : 50;
    return clampBP(Math.round(bp / step) * step);
  },
  bands: EPOCHS.map((e) => ({ ...e, color: `color-mix(in srgb, ${e.color} 40%, #f6eedb)` })),
  events: PRE_EVENTS,
  ticks: [7e6, 5e6, 3e6, 2e6, 1e6, 500e3, 300e3, 200e3, 100e3, 50e3, 30e3, 20e3, PRE_END],
  format: formatYearsAgo,
  tickFormat: (bp) => (bp >= 1e6 ? `${bp / 1e6} Ma` : `${Math.round(bp / 1000)} ka`),
});

const deeplineEl = $('#deepline');
const prelineEl = $('#preline');
const timelineEl = $('#timeline');
const yearEl = $('#year');
const eraEl = $('#era');
const surveyEl = $('#survey');
const playBtn = $<HTMLButtonElement>('#play');
const speedSel = $<HTMLSelectElement>('#speed');
const info = $('#info');

/** Which slider is in charge. */
type Mode = 'deep' | 'pre' | 'history';

let snapshots: number[] = [];
let mode: Mode = 'history';
let year = 117;
/** Geological age in millions of years while in deep time; 0 otherwise. */
let age = 0;
/** Years before present on the prehistory slider. */
let preBP = PRE_START;
let playing = false;
let lastFrame = 0;

// ── Layers ──────────────────────────────────────────────────────────────

const LAYERS_KEY = 'atlas.layers';
const layerOn = new Map<string, boolean>();
const layersPanel = new LayersPanel($('#layers'), $<HTMLButtonElement>('#layers-btn'), map.layerList, (id) => layerOn.get(id) ?? false);

/** Choices saved in this browser: layer id → on. */
function storedLayers(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LAYERS_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

/** Enabled layers from the URL (`layers=a,b`), else this browser's choices, else the defaults. */
function applyLayers(fromUrl: Set<string> | null) {
  const stored = storedLayers();
  for (const l of map.layerList) {
    const on = fromUrl ? fromUrl.has(l.id) : (stored[l.id] ?? l.defaultOn);
    if (layerOn.get(l.id) === on) continue;
    layerOn.set(l.id, on);
    map.setLayerEnabled(l.id, on);
  }
  layersPanel.render();
}

/** The `layers=` URL value, or null while the layers are the defaults. */
function layersParam(): string | null {
  const changed = map.layerList.some((l) => (layerOn.get(l.id) ?? l.defaultOn) !== l.defaultOn);
  return changed ? map.layerList.filter((l) => layerOn.get(l.id)).map((l) => l.id).join(',') : null;
}

layersPanel.onToggle = (id, on) => {
  layerOn.set(id, on);
  map.setLayerEnabled(id, on);
  try {
    localStorage.setItem(LAYERS_KEY, JSON.stringify({ ...storedLayers(), [id]: on }));
  } catch {
    // Storage can be unavailable (private windows); the URL still carries the choice.
  }
  writeHash();
};

// ── URL ─────────────────────────────────────────────────────────────────

const urlMode = readHash();

/** Read the date and layers from the URL; returns the slider it names. */
function readHash(): Mode {
  const a = location.hash.match(/age=([\d.]+)/);
  const k = location.hash.match(/ka=([\d.]+)/);
  const y = location.hash.match(/year=(-?\d+)/);
  const l = location.hash.match(/layers=([\w,-]*)/);
  age = a ? Math.max(0, Math.min(EARTH_AGE, Number(a[1]) || 0)) : 0;
  if (k) preBP = clampBP((Number(k[1]) || 0) * 1000);
  if (y) year = Math.max(MIN_YEAR, Math.min(MAX_YEAR, Number(y[1]) || 1));
  applyLayers(l ? new Set(l[1].split(',').filter(Boolean)) : null);
  return age > 0 ? 'deep' : k ? 'pre' : 'history';
}

function writeHash() {
  const time = mode === 'deep' ? `age=${age}` : mode === 'pre' ? `ka=${+(preBP / 1000).toFixed(3)}` : `year=${year}`;
  const layers = layersParam();
  history.replaceState(null, '', `#${time}${layers !== null ? `&layers=${layers}` : ''}`);
}

/** Hand control to one slider; the others dim. Leaving deep time or prehistory restores the borders. */
function enterMode(m: Mode) {
  if (mode === m) return;
  const wasGeo = mode !== 'history';
  mode = m;
  if (m !== 'deep') age = 0;
  document.body.classList.toggle('deep', m === 'deep');
  document.body.classList.toggle('pre', m === 'pre');
  info.classList.remove('open', 'period', 'epoch');
  if (m === 'history' && wasGeo) void map.setGeoAge(0);
}

/** Keep every slider's handle on the same moment, as far as its range allows. */
function syncHandles() {
  deepline.setValue(mode === 'deep' ? age : mode === 'pre' ? preBP / 1e6 : 0);
  preline.setValue(mode === 'pre' ? preBP : mode === 'deep' ? clampBP(age * 1e6) : PRE_END);
  timeline.setValue(mode === 'history' ? year : MIN_YEAR);
  for (const [el, m] of [[deeplineEl, 'deep'], [prelineEl, 'pre'], [timelineEl, 'history']] as const) el.classList.toggle('active', m === mode);
}

async function setYear(y: number) {
  enterMode('history');
  year = Math.round(y) || 1;
  syncHandles();
  yearEl.textContent = formatYear(year);
  const era = ERAS.find((e) => year >= e.start && year < e.end) ?? ERAS[ERAS.length - 1];
  eraEl.textContent = era.name;
  writeHash();
  layersPanel.setTime(historyTime(year));
  if (!snapshots.length) return;
  const { a, b, t } = bracket(snapshots, year);
  surveyEl.textContent =
    a === b || t < 0.35
      ? `Borders of ${formatYear(a)}`
      : t > 0.65
        ? `Borders of ${formatYear(b)}`
        : `Borders ${formatYear(a)} → ${formatYear(b)}`;
  // Warm the cache for the snapshots either side of the current pair.
  const i = snapshots.indexOf(t < 0.5 ? a : b);
  for (const j of [i - 1, i + 1, i + 2]) if (snapshots[j] !== undefined) map.prefetch(snapshots[j]);
  await map.show(year, a, b, t);
}

/** Show land as it was `a` million years ago; 0 returns to human history. */
async function setAge(a: number) {
  const next = Math.max(0, Math.min(EARTH_AGE, a));
  if (next <= 0) return setYear(year);
  enterMode('deep');
  age = next;
  syncHandles();
  const period = periodAt(age);
  const [num, unit] = ageParts(age);
  yearEl.innerHTML = `${esc(num)} <small>${esc(unit)}</small>`;
  eraEl.textContent = period.name;
  surveyEl.textContent = `${period.era} ${period.rank ?? 'era'}`;
  writeHash();
  layersPanel.setTime(deepTime(age));
  if (info.classList.contains('period')) renderPeriod();
  await map.setGeoAge(age);
}

/** Show the world `bp` years ago on the prehistory slider. */
async function setPre(bp: number) {
  enterMode('pre');
  preBP = clampBP(bp);
  syncHandles();
  const [num, unit] = yearsAgoParts(preBP);
  yearEl.innerHTML = `${esc(num)} <small>${esc(unit)}</small>`;
  eraEl.textContent = epochAt(preBP).name;
  surveyEl.textContent = stageAt(preBP).name;
  writeHash();
  const t = prehistoryTime(preBP);
  layersPanel.setTime(t);
  if (info.classList.contains('epoch')) renderEpoch();
  await map.setGeoAge(preBP / 1e6, t);
}

// ── Playback ────────────────────────────────────────────────────────────

function tick(now: number) {
  if (!playing) return;
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  // Speed is measured along the slider so every stretch of time gets equal screen time.
  const rate = 0.012 * Number(speedSel.value);
  if (mode === 'deep') {
    const next = deepline.fromPos(deepline.toPos(age) + rate * dt);
    // Deep time flows on into prehistory, and prehistory into human history.
    if (next * 1e6 <= PRE_START) void setPre(PRE_START);
    else void setAge(next);
  } else if (mode === 'pre') {
    const p = preline.toPos(preBP) + rate * dt;
    if (p >= 1) void setYear(MIN_YEAR);
    else void setPre(preline.fromPos(p));
  } else {
    let p = timeline.toPos(year) + rate * dt;
    if (p >= 1) {
      p = 1;
      stop();
    }
    void setYear(timeline.fromPos(p));
  }
  requestAnimationFrame(tick);
}

function play() {
  if (mode === 'history' && year >= MAX_YEAR) void setYear(MIN_YEAR);
  playing = true;
  playBtn.classList.add('playing');
  playBtn.setAttribute('aria-label', 'Pause');
  map.setAnimating(true);
  lastFrame = performance.now();
  requestAnimationFrame(tick);
}

function stop() {
  playing = false;
  playBtn.classList.remove('playing');
  playBtn.setAttribute('aria-label', 'Play');
  map.setAnimating(false);
}

playBtn.addEventListener('click', () => (playing ? stop() : play()));
timeline.onScrubStart = stop;
timeline.onChange = (y) => void setYear(y);
deepline.onScrubStart = stop;
deepline.onChange = (a) => void setAge(a);
preline.onScrubStart = stop;
preline.onChange = (bp) => void setPre(bp);

document.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('input, select')) return;
  if (e.key === ' ') {
    e.preventDefault();
    playing ? stop() : play();
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    stop();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    if (mode === 'deep') {
      void setAge(deepline.fromPos(deepline.toPos(age) + dir * 0.004));
    } else if (mode === 'pre') {
      void setPre(preline.fromPos(preline.toPos(preBP) + dir * 0.004));
    } else if (e.shiftKey) {
      // Jump to the next / previous surveyed snapshot.
      const next = dir > 0 ? snapshots.find((s) => s > year) : [...snapshots].reverse().find((s) => s < year);
      if (next !== undefined) void setYear(next);
    } else {
      void setYear(timeline.fromPos(timeline.toPos(year) + dir * 0.004));
    }
  } else if (e.key === 'Escape') {
    map.select(null);
  }
});

// ── Map controls ────────────────────────────────────────────────────────

$('#zoom-in').addEventListener('click', () => map.zoomBy(1.8));
$('#zoom-out').addEventListener('click', () => map.zoomBy(1 / 1.8));
$('#zoom-reset').addEventListener('click', () => map.resetView());

// ── Info panel ──────────────────────────────────────────────────────────

map.onSelect = (hit) => renderInfo(hit);

function wikiLink(title: string) {
  return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(title)}`;
}

/** Capitals in order, the one in use at the current year highlighted. */
function seatList(civ: Civilisation) {
  const now = capitalAt(civ, year);
  if (civ.capitals.length <= 1) return esc(civ.capitals[0]?.name ?? '');
  return civ.capitals
    .map((k) => {
      const label = `${esc(k.name)} <span class="muted">${formatSpan(k.from, k.to)}</span>`;
      return k === now ? `<strong>${label}</strong>` : label;
    })
    .join('<br>');
}

function renderInfo(hit: TerritoryHit | null) {
  if (!hit) {
    info.classList.remove('open', 'period', 'epoch');
    return;
  }
  info.classList.remove('period', 'epoch');
  const civ = hit.civ;
  const title = civ?.name ?? hit.name;
  const ink = inkFor(civ?.id ?? hit.subjectOf ?? hit.name);
  const rows: string[] = [];
  if (civ) {
    rows.push(`<dt>Flourished</dt><dd>${formatSpan(civ.start, civ.end)}</dd>`);
    rows.push(`<dt>Zenith</dt><dd>c. ${formatYear(civ.peak)}</dd>`);
    if (civ.capitals.length) rows.push(`<dt>${civ.capitals.length > 1 ? 'Capitals' : 'Seat'}</dt><dd>${seatList(civ)}</dd>`);
    rows.push(`<dt>Region</dt><dd>${esc(civ.region)}</dd>`);
  }
  if (civ && civ.name !== hit.name) rows.push(`<dt>Shown as</dt><dd>${esc(hit.name)}</dd>`);
  if (hit.subjectOf) rows.push(`<dt>Subject of</dt><dd>${esc(hit.subjectOf)}</dd>`);
  if (hit.partOf && hit.partOf !== hit.subjectOf) rows.push(`<dt>Part of</dt><dd>${esc(hit.partOf)}</dd>`);
  if (hit.snapshot && !civ) rows.push(`<dt>Survey</dt><dd>${formatYear(hit.snapshot)}</dd>`);
  if (hit.precision !== null) {
    const p = ['', 'Approximate', 'Moderately certain', 'Precise'][hit.precision] ?? '';
    if (p) rows.push(`<dt>Borders</dt><dd>${p}</dd>`);
  }

  info.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <div class="swatch" style="--fill:${ink}"></div>
    <h2>${esc(title)}</h2>
    ${civ ? `<p class="summary">${esc(civ.summary)}</p>` : `<p class="summary muted">A polity or people recorded on the ${formatYear(hit.snapshot)} survey.</p>`}
    <dl>${rows.join('')}</dl>
    <div class="actions">
      ${civ ? `<button class="btn" data-act="peak">Visit its zenith</button>` : ''}
      <a class="btn" href="${wikiLink(title)}" target="_blank" rel="noopener">Read more ↗</a>
    </div>`;
  info.classList.add('open');
  info.querySelector('.close')!.addEventListener('click', () => map.select(null));
  info.querySelector('[data-act="peak"]')?.addEventListener('click', () => civ && goToCiv(civ));
}

/** Geological period card, shown when the map is clicked in deep time. */
function renderPeriod() {
  const p = periodAt(age);
  const events = GEO_EVENTS.filter((e) => e.value <= p.start && e.value >= p.end);
  info.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <div class="swatch" style="--fill:${p.color}"></div>
    <h2>${esc(p.name)}</h2>
    <p class="summary">${esc(p.summary)}</p>
    <dl>
      <dt>${p.rank === 'eon' ? 'Eon' : 'Era'}</dt><dd>${esc(p.era)}</dd>
      <dt>Span</dt><dd>${formatAgeShort(p.start)} – ${formatAgeShort(p.end)}</dd>
      ${events.length ? `<dt>Events</dt><dd>${events.map((e) => `${esc(e.label)} <span class="muted">${formatAgeShort(e.value)}</span>`).join('<br>')}</dd>` : ''}
    </dl>
    <div class="actions">
      <a class="btn" href="${wikiLink(`${p.name} period`)}" target="_blank" rel="noopener">Read more ↗</a>
    </div>`;
  info.classList.add('open', 'period');
  info.querySelector('.close')!.addEventListener('click', () => info.classList.remove('open', 'period'));
}

/** A span of years ago, e.g. "3.2 – 3.18 million years ago" or "46,000 – 43,000 years ago". */
function spanAgo(from: number, to: number) {
  const [a, unitA] = yearsAgoParts(from);
  const [b, unitB] = yearsAgoParts(to);
  if (a === b && unitA === unitB) return `${a} ${unitA}`;
  return unitA === unitB ? `${a} – ${b} ${unitA}` : `${a} ${unitA} – ${b} ${unitB}`;
}

/** Epoch card, shown when the map is clicked in prehistory: who was alive and where. */
function renderEpoch() {
  const ep = epochAt(preBP);
  const alive = speciesAt(preBP);
  const sites = SITES.filter((s) => siteState(s, preBP) === 'now');
  const swatch = (c: string) => `<span class="dot" style="--c:${c}"></span>`;
  info.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <div class="swatch" style="--fill:${ep.color}"></div>
    <h2>${esc(ep.name)}</h2>
    <p class="summary">${esc(formatYearsAgo(preBP))} · ${esc(stageAt(preBP).name)}</p>
    <dl>
      <dt>Span</dt><dd>${spanAgo(ep.start, ep.end)}</dd>
      ${alive.length ? `<dt>Human species</dt><dd>${alive.map((s) => `${swatch(s.color)}${esc(s.name)} <span class="muted">${esc(s.note)}</span>`).join('<br>')}</dd>` : ''}
      ${sites.length ? `<dt>Sites of this time</dt><dd>${sites.map((s, i) => `<a href="#" data-site="${i}">${esc(s.name)}</a>`).join('<br>')}</dd>` : ''}
    </dl>
    <div class="actions">
      <a class="btn" href="${wikiLink(ep.name)}" target="_blank" rel="noopener">Read more ↗</a>
    </div>`;
  info.classList.add('open', 'epoch');
  info.querySelector('.close')!.addEventListener('click', () => info.classList.remove('open', 'epoch'));
  info.querySelectorAll<HTMLAnchorElement>('[data-site]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      renderSite(sites[Number(a.dataset.site)]);
    }),
  );
}

/** Card for one hominin site. */
function renderSite(site: Site) {
  const sp = SPECIES_BY_ID.get(site.species)!;
  info.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <div class="swatch" style="--fill:${sp.color}"></div>
    <h2>${esc(site.name)}</h2>
    <p class="summary">${esc(site.summary)}</p>
    <dl>
      <dt>Date</dt><dd>${spanAgo(site.from, site.to)}</dd>
      <dt>Species</dt><dd>${esc(sp.name)} <span class="muted">${esc(sp.note)}</span></dd>
    </dl>
    <div class="actions">
      <button class="btn" data-act="go">Go to this time</button>
      <a class="btn" href="${wikiLink(site.name)}" target="_blank" rel="noopener">Read more ↗</a>
    </div>`;
  info.classList.remove('epoch', 'period');
  info.classList.add('open');
  info.querySelector('.close')!.addEventListener('click', () => info.classList.remove('open'));
  info.querySelector('[data-act="go"]')!.addEventListener('click', () => {
    stop();
    void setPre(Math.sqrt(site.from * site.to));
  });
}

map.onSite = (site) => renderSite(site);

// The map's own click handler runs first and clears any selection.
$('#map').addEventListener('click', (e) => {
  if ((e.target as Element).closest('.info, .zoom-controls, .playbar, .layers-panel')) return;
  if (mode === 'deep') renderPeriod();
  else if (mode === 'pre') renderEpoch();
});

// ── Search ──────────────────────────────────────────────────────────────

const searchInput = $<HTMLInputElement>('#search');
const results = $('#results');
let nameIndex: Record<string, number[]> = {};
let active = -1;

interface Result {
  label: string;
  sub: string;
  go: () => void;
}

function searchResults(q: string): Result[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const out: Result[] = [];
  const seen = new Set<string>();
  for (const c of CIVILISATIONS) {
    if (c.name.toLowerCase().includes(s) || c.match.some((m) => m.toLowerCase().includes(s))) {
      out.push({ label: c.name, sub: formatSpan(c.start, c.end), go: () => goToCiv(c) });
      c.match.forEach((m) => seen.add(m));
    }
  }
  const names = Object.keys(nameIndex)
    .filter((n) => !seen.has(n) && n.toLowerCase().includes(s))
    .sort((a, b) => Number(!a.toLowerCase().startsWith(s)) - Number(!b.toLowerCase().startsWith(s)) || a.length - b.length);
  for (const n of names.slice(0, 30)) {
    const ys = nameIndex[n];
    const sub = ys.length === 1 ? formatYear(ys[0]) : `${formatYear(ys[0])} – ${formatYear(ys[ys.length - 1])}`;
    out.push({ label: n, sub, go: () => goToName(n) });
  }
  return out.slice(0, 40);
}

function renderResults() {
  const list = searchResults(searchInput.value);
  active = list.length ? 0 : -1;
  results.innerHTML = list
    .map((r, i) => `<li data-i="${i}" class="${i === active ? 'active' : ''}"><span>${esc(r.label)}</span><small>${esc(r.sub)}</small></li>`)
    .join('');
  results.classList.toggle('open', list.length > 0);
  results.querySelectorAll('li').forEach((li) =>
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      choose(list[Number(li.dataset.i)]);
    }),
  );
  (results as any)._list = list;
}

function choose(r: Result | undefined) {
  if (!r) return;
  searchInput.value = r.label;
  results.classList.remove('open');
  searchInput.blur();
  r.go();
}

searchInput.addEventListener('input', renderResults);
searchInput.addEventListener('focus', renderResults);
searchInput.addEventListener('blur', () => results.classList.remove('open'));
searchInput.addEventListener('keydown', (e) => {
  const list: Result[] = (results as any)._list ?? [];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    active = (active + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % Math.max(1, list.length);
    results.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === active));
    results.querySelector('li.active')?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    choose(list[active]);
  } else if (e.key === 'Escape') {
    searchInput.blur();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
});

/** Nearest snapshot in which any of `names` appears. */
function snapshotWith(names: string[], target: number): number | undefined {
  const ys = names.flatMap((n) => nameIndex[n] ?? []);
  if (!ys.length) return undefined;
  return ys.reduce((best, y) => (Math.abs(y - target) < Math.abs(best - target) ? y : best));
}

async function goToCiv(c: Civilisation) {
  stop();
  const snap = snapshotWith(c.match, c.peak);
  const y = snap !== undefined && snap >= c.start - 200 && snap <= c.end + 100 ? snap : c.peak;
  await setYear(y);
  // Only a surveyed year has borders to fit the view to.
  const focused = snapshots.includes(y) && c.match.length > 0 && (await map.focus(c.match, y));
  const cap = capitalAt(c, y) ?? c.capitals[0];
  const at = cap ? [cap.lon, cap.lat] : c.place;
  if (!focused && at) map.focusPoint(at[0], at[1], 4);
  const name = c.match.find((n) => nameIndex[n]?.includes(y));
  if (name) map.select(name, y);
  else renderInfo({ name: c.name, subjectOf: null, partOf: null, precision: null, snapshot: y, civ: c });
}

async function goToName(n: string) {
  stop();
  const snap = snapshotWith([n], year)!;
  await setYear(snap);
  await map.focus([n], snap);
  map.select(n, snap);
}

window.addEventListener('hashchange', () => {
  const before = [mode, year, age, preBP].join();
  const want = readHash();
  if ([want, year, age, preBP].join() === before) return;
  stop();
  void (want === 'deep' ? setAge(age) : want === 'pre' ? setPre(preBP) : setYear(year));
});

// ── Boot ────────────────────────────────────────────────────────────────

(async () => {
  [snapshots, nameIndex] = await Promise.all([loadManifest(), loadNameIndex()]);
  snapshots = snapshots.filter((y) => y >= MIN_YEAR);
  timeline.setSnaps(snapshots);
  // Go straight to the date in the URL (going through human history first would rewrite the URL meanwhile).
  if (urlMode === 'deep') await setAge(age);
  else if (urlMode === 'pre') await setPre(preBP);
  else await setYear(year);
  document.body.classList.add('ready');
})();

// Compass rose ticks
{
  const g = document.querySelector('.compass .c-ticks')!;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const r0 = i % 8 === 0 ? 36 : i % 2 === 0 ? 39 : 41;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(Math.sin(a) * r0));
    line.setAttribute('y1', String(-Math.cos(a) * r0));
    line.setAttribute('x2', String(Math.sin(a) * 44));
    line.setAttribute('y2', String(-Math.cos(a) * 44));
    g.appendChild(line);
  }
}
