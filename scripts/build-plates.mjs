// Builds the plate-tectonic data the map renders land from.
//
// Source: the Merdith et al. (2021) plate model, 1000 Ma to present
// (https://doi.org/10.5281/zenodo.10346399, CC BY 4.0), via the GPlates
// model repository.
//
// Outputs in public/data/:
//   plates-land-{lo,mid,hi}.json  Natural Earth land at 1:110m / 1:50m / 1:10m,
//                                 split along the model's static polygons so
//                                 every piece rides on one plate. Lon/lat.
//                                   land:  polygons {P: plate id, F: from age, T: to age}
//                                   coast: coastline polylines with the same fields
//                                          (the cuts between plates are not coast)
//   plates-blocks.json            the model's continental blocks (terranes), drawn
//                                 instead of today's coastlines for the oldest
//                                 ages, where modern shapes would be anachronistic.
//                                 Same layout as plates-land-*.json.
//   rotations.json                total rotation poles per plate, for the client
//                                 to reconstruct positions at any age.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildPlateIndex, cutAntimeridian, cutFeatures, mapshaper, readGpml } from './geo-utils.mjs';

const RAW = 'data-raw/plates';
const TMP = 'data-raw/.tmp-plates';
const OUT = 'public/data';
const REPO = 'https://repo.gplates.org/webdav/pmm/merdith2021';

mkdirSync(RAW, { recursive: true });
mkdirSync(TMP, { recursive: true });

// ── Download the model ────────────────────────────────────────────────────
const ROT = `${RAW}/Rotations/Rotations/1000_0_rotfile_Merdith_etal.rot`;
const GPML = `${RAW}/StaticPolygons/StaticPolygons/shapes_static_polygons_Merdith_etal.gpml`;
const BLOCKS_GPML = `${RAW}/ContinentalPolygons/ContinentalPolygons/shapes_continents.gpml`;
for (const [name, file] of [['Rotations', ROT], ['StaticPolygons', GPML], ['ContinentalPolygons', BLOCKS_GPML]]) {
  if (existsSync(file)) continue;
  execFileSync('curl', ['-sfL', '-o', `${RAW}/${name}.zip`, `${REPO}/${name}.zip`], { stdio: 'inherit' });
  execFileSync('unzip', ['-o', '-q', `${RAW}/${name}.zip`, '-d', `${RAW}/${name}`], { stdio: 'inherit' });
}

// ── Rotations ─────────────────────────────────────────────────────────────
// Each line: moving plate, age (Ma), pole lat, pole lon, angle (deg), fixed plate.
// A plate can have several sequences with different fixed plates over time.
const rotations = {};
for (const line of readFileSync(ROT, 'utf8').split('\n')) {
  const m = line.trim().match(/^(\d+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+(\d+)/);
  if (!m) continue;
  const [moving, age, lat, lon, angle, fixed] = [+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]];
  if (moving === 999 || fixed === 999) continue; // 999 marks commented-out poles
  const seqs = (rotations[moving] ??= []);
  let seq = seqs[seqs.length - 1];
  if (!seq || seq.fixed !== fixed || age < seq.poles[seq.poles.length - 1][0]) {
    seq = { fixed, poles: [] };
    seqs.push(seq);
  }
  seq.poles.push([age, lat, lon, angle]);
}
writeFileSync(`${OUT}/rotations.json`, JSON.stringify(rotations));

// ── Static polygons (GPML) → GeoJSON ─────────────────────────────────────
const statics = readGpml(GPML);
const STATIC = `${TMP}/static.geojson`;
cutFeatures(statics, STATIC);
console.log(`Static polygons: ${statics.length}, rotation plates: ${Object.keys(rotations).length}`);

// Plate lookup for coastline points: static polygons valid today, bucketed by 5° cells.
const plateIndex = buildPlateIndex(readFeatures(STATIC).filter((f) => f.properties.T <= 0));

// ── Land split by plate, per scale ────────────────────────────────────────
for (const [scale, tier] of [['110m', 'lo'], ['50m', 'mid'], ['10m', 'hi']]) {
  const land = `${TMP}/land${scale}.geojson`;
  cutAntimeridian(`node_modules/world-atlas/land-${scale}.json`, 'land', land);

  // Land inside a static polygon takes its plate; land outside all of them
  // (rare slivers) stays fixed (plate 0).
  mapshaper('-i', STATIC, '-clip', land, '-explode', '-o', `${TMP}/pieces.geojson`, 'force');
  mapshaper('-i', land, '-erase', STATIC, '-explode', '-each', 'P=0, F=4600, T=0', '-filter-slivers', '-o', `${TMP}/rest.geojson`, 'force');
  const pieces = [...readFeatures(`${TMP}/pieces.geojson`), ...readFeatures(`${TMP}/rest.geojson`)];

  const coast = coastLines(readFeatures(land), plateIndex);
  const fc = (features) => ({ type: 'FeatureCollection', features });
  writeFileSync(`${TMP}/land.geojson`, JSON.stringify(fc(pieces)));
  writeFileSync(`${TMP}/coast.geojson`, JSON.stringify(fc(coast)));
  mapshaper(
    '-i', `${TMP}/land.geojson`, `${TMP}/coast.geojson`, 'combine-files',
    '-rename-layers', 'land,coast',
    '-o', 'format=topojson', 'quantization=1000000', `${OUT}/plates-land-${tier}.json`, 'force',
  );
  const area = (f) => Number(execFileSync('npx', ['mapshaper', '-quiet', '-i', f, '-dissolve', '-each', 'console.log(this.area)'], { encoding: 'utf8' }).trim().split('\n').pop());
  console.log(`${scale}: ${pieces.length} pieces, ${coast.length} coast lines, plate coverage ${((1 - area(`${TMP}/rest.geojson`) / area(land)) * 100).toFixed(2)}%`);
}
// ── Continental blocks ────────────────────────────────────────────────────
{
  const BLOCKS = `${TMP}/blocks.geojson`;
  cutFeatures(readGpml(BLOCKS_GPML), BLOCKS);
  mapshaper('-i', BLOCKS, '-explode', '-o', `${TMP}/block-pieces.geojson`, 'force');
  const pieces = readFeatures(`${TMP}/block-pieces.geojson`);
  // Every block edge is drawn: a neighbouring block may not exist yet at a
  // given age, so shared edges can't be dropped the way plate cuts are.
  const outline = pieces.map((f) => ({ type: 'Feature', properties: f.properties, geometry: { type: 'MultiLineString', coordinates: f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat() } }));
  writeFileSync(`${TMP}/land.geojson`, JSON.stringify({ type: 'FeatureCollection', features: pieces }));
  writeFileSync(`${TMP}/coast.geojson`, JSON.stringify({ type: 'FeatureCollection', features: outline }));
  mapshaper(
    '-i', `${TMP}/land.geojson`, `${TMP}/coast.geojson`, 'combine-files',
    '-rename-layers', 'land,coast',
    '-o', 'format=topojson', 'quantization=1000000', `${OUT}/plates-blocks.json`, 'force',
  );
  console.log(`Continental blocks: ${pieces.length} pieces, ${outline.length} outlines`);
}

rmSync(TMP, { recursive: true, force: true });

/** Features of a GeoJSON file (mapshaper writes attribute-less layers as a GeometryCollection). */
function readFeatures(path) {
  const d = JSON.parse(readFileSync(path, 'utf8'));
  const features = d.type === 'GeometryCollection' ? d.geometries.map((g) => ({ type: 'Feature', properties: {}, geometry: g })) : d.features;
  return features.filter((f) => f.geometry);
}

/**
 * Coastline: the real land outline, split into runs that each ride on one plate.
 * (Edges of the plate-split pieces can't be used: where neighbouring pieces
 * split their shared border at different vertices, the cut between two plates
 * would be mistaken for coast.)
 */
function coastLines(land, index) {
  const rings = (g) => (g.type === 'Polygon' ? g.coordinates : g.coordinates.flat());
  // Cuts at ±180° and the closing edge along a pole are not coast.
  const artificial = (a, b) => (Math.abs(a[0]) === 180 && a[0] === b[0]) || (Math.abs(a[1]) === 90 && a[1] === b[1]);
  const lines = [];
  for (const f of land) {
    for (const r of rings(f.geometry)) {
      let run = null;
      let props = null;
      for (let i = 1; i < r.length; i++) {
        const [a, b] = [r[i - 1], r[i]];
        if (artificial(a, b)) {
          run = null;
          continue;
        }
        const p = index.at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        if (!run || p !== props) {
          props = p;
          run = [a];
          lines.push({ type: 'Feature', properties: p, geometry: { type: 'LineString', coordinates: run } });
        }
        run.push(b);
      }
    }
  }
  return lines;
}
