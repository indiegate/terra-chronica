// Builds public/data/ from the historical-basemaps GeoJSON snapshots in data-raw/.
//
// - Borders are kept at full source resolution (no simplification).
// - Each territory is clipped to the Natural Earth 1:10m coastline, so coasts
//   are exact even where the source outline is rough.
// - 1994, 2000 and 2010 use Natural Earth 1:10m country shapes, named after the
//   source polygon they overlap most.
// - Known naming errors in the source are corrected (scripts/corrections.mjs).
// - Output is pre-projected to Natural Earth (metres) so the browser doesn't
//   have to project tens of thousands of points on every snapshot change.
// - Each snapshot also gets a simplified .lo.json for the zoomed-out view.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { cutAntimeridian, mapshaper } from './geo-utils.mjs';
import { CORRECTIONS, MODERN_OVERRIDES, MODERN_SUBJECTS, REMOVALS } from './corrections.mjs';

const RAW = 'data-raw';
const OUT = 'public/data';
const TMP = 'data-raw/.tmp';
const MODERN = new Set([1994, 2000, 2010]);
const QUANT = 'quantization=400000';

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

// Natural Earth land (for clipping territories) and countries (modern borders).
// Land for drawing is built by build-plates.mjs.
// world-atlas joins shapes across the 180° meridian (Chukotka, Wrangel Island,
// Fiji). Planar tools read such a ring as spanning the whole map, so cut them.
const LAND10 = `${TMP}/land10.geojson`;
const COUNTRIES10 = `${TMP}/countries10.geojson`;
cutAntimeridian('node_modules/world-atlas/land-10m.json', 'land', LAND10);
cutAntimeridian('node_modules/world-atlas/countries-10m.json', 'countries', COUNTRIES10, crimeaToUkraine);

/**
 * Natural Earth shows Crimea as Russian (de facto since 2014). The latest
 * snapshot is 2010, when it was part of Ukraine, so move it back.
 */
function crimeaToUkraine(features) {
  const russia = features.find((f) => f.properties.name === 'Russia');
  const ukraine = features.find((f) => f.properties.name === 'Ukraine');
  const inCrimea = (poly) => {
    const xs = poly[0].map((p) => p[0]);
    const ys = poly[0].map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return cx > 32 && cx < 37 && cy > 44 && cy < 46.5;
  };
  const parts = russia.geometry.coordinates.filter(inCrimea);
  if (!parts.length) throw new Error('Crimea not found in Natural Earth Russia');
  russia.geometry.coordinates = russia.geometry.coordinates.filter((p) => !inCrimea(p));
  const ua = ukraine.geometry.type === 'Polygon' ? [ukraine.geometry.coordinates] : ukraine.geometry.coordinates;
  ukraine.geometry = { type: 'MultiPolygon', coordinates: [...ua, ...parts] };
}

// Source schemas vary between files; keep four fields.
const NORMALISE =
  'n=NAME; s=typeof SUBJECTO!=="undefined"?SUBJECTO:null; p=typeof PARTOF!=="undefined"?PARTOF:null; ' +
  'bp=typeof BORDERPRECISION!=="undefined"?BORDERPRECISION:null; delete this.properties; ' +
  'NAME=n; SUBJECTO=s; PARTOF=p; BORDERPRECISION=bp';

const yearOf = (f) => {
  const m = f.match(/^world_(bc)?(\d+)\.geojson$/);
  return m ? (m[1] ? -Number(m[2]) : Number(m[2])) : null;
};

const files = readdirSync(RAW)
  .map((f) => ({ f, year: yearOf(f) }))
  .filter((x) => x.year !== null && x.year >= -10000)
  .sort((a, b) => a.year - b.year);

for (const { f, year } of files) {
  const out = `${OUT}/borders_${year}.json`;
  if (MODERN.has(year)) {
    const over = MODERN_OVERRIDES[year] ?? {};
    const expr = `if (${JSON.stringify(over)}[name] !== undefined) { NAME = ${JSON.stringify(over)}[name]; SUBJECTO = NAME; PARTOF = NAME; } NAME = NAME || name; BORDERPRECISION = 3`;
    mapshaper(
      '-i', COUNTRIES10,
      '-filter', 'name !== "Antarctica"',
      '-join', `${RAW}/${f}`, 'largest-overlap', 'fields=NAME,SUBJECTO,PARTOF',
      '-each', expr,
      '-dissolve', 'NAME', 'copy-fields=SUBJECTO,PARTOF,BORDERPRECISION',
      '-filter-fields', 'NAME,SUBJECTO,PARTOF,BORDERPRECISION',
      '-o', 'format=topojson', QUANT, out,
    );
  } else {
    mapshaper(
      '-i', `${RAW}/${f}`,
      '-filter', 'NAME != null && NAME != "" && NAME != "?"',
      '-each', NORMALISE,
      '-filter-fields', 'NAME,SUBJECTO,PARTOF,BORDERPRECISION',
      '-clip', LAND10,
      '-o', 'format=topojson', QUANT, out,
    );
  }
  correct(out, year);
  project(out);
  simplified(out, `${OUT}/borders_${year}.lo.json`);
}

/**
 * World-view version: simplified to a 2 km tolerance, well under a pixel until
 * zoomed in about 4×. Feature order and count must match the full version,
 * since the app swaps between them by index.
 */
function simplified(src, dest) {
  mapshaper('-i', src, '-simplify', 'interval=2000', 'keep-shapes', '-o', 'format=topojson', QUANT, dest, 'force');
  const count = (f) => Object.values(JSON.parse(readFileSync(f, 'utf8')).objects)[0].geometries.length;
  if (count(src) !== count(dest)) throw new Error(`Simplified ${dest} lost features`);
}

/** Pre-project to Natural Earth so the browser only has to scale coordinates. */
function project(path, extra = []) {
  mapshaper('-i', path, ...extra, '-proj', '+proj=natearth', '-o', 'format=topojson', QUANT, path, 'force');
}

/** Apply name corrections and drop empty geometries. */
function correct(path, year) {
  const topo = JSON.parse(readFileSync(path, 'utf8'));
  const obj = Object.values(topo.objects)[0];
  obj.geometries = obj.geometries.filter((g) => g.type && g.properties?.NAME);
  for (const r of REMOVALS) {
    if (!r.years.includes(year)) continue;
    const before = obj.geometries.length;
    obj.geometries = obj.geometries.filter((g) => g.properties.NAME !== r.name);
    if (obj.geometries.length === before) throw new Error(`Removal "${r.name}" not found in ${year}`);
  }
  for (const g of obj.geometries) {
    const p = g.properties;
    for (const k of ['NAME', 'SUBJECTO', 'PARTOF']) if (p[k] === '') p[k] = null;
    p.SUBJECTO ??= p.NAME;
    p.PARTOF ??= p.NAME;
  }
  for (const c of CORRECTIONS) {
    if (!c.years.includes(year)) continue;
    let hit = false;
    for (const g of obj.geometries) {
      const p = g.properties;
      if (p.NAME === c.from) {
        hit = true;
        p.NAME = c.to;
        if (c.subject !== undefined) p.SUBJECTO = c.subject ?? c.to;
        else if (p.SUBJECTO === c.from) p.SUBJECTO = c.to;
        if (p.PARTOF === c.from) p.PARTOF = c.to;
      } else if (c.from !== c.to) {
        if (p.SUBJECTO === c.from) p.SUBJECTO = c.to;
        if (p.PARTOF === c.from) p.PARTOF = c.to;
      }
    }
    if (!hit) throw new Error(`Correction "${c.from}" not found in ${year}`);
  }
  for (const [name, subject] of Object.entries(MODERN_SUBJECTS[year] ?? {})) {
    for (const g of obj.geometries) if (g.properties.NAME === name) g.properties.SUBJECTO = subject ?? name;
  }
  writeFileSync(path, JSON.stringify(topo));
}

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(files.map((x) => x.year)));

// Name index: which snapshots each polity appears in (used by search).
const index = {};
for (const { year } of files) {
  const topo = JSON.parse(readFileSync(`${OUT}/borders_${year}.lo.json`, 'utf8'));
  for (const g of Object.values(topo.objects)[0].geometries) {
    const n = g.properties.NAME.trim();
    (index[n] ??= []).includes(year) || index[n].push(year);
  }
}
writeFileSync(`${OUT}/names.json`, JSON.stringify(index));
rmSync(TMP, { recursive: true, force: true });
console.log(`Built ${files.length} snapshots, indexed ${Object.keys(index).length} names`);
