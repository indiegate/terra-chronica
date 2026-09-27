// Builds public/data/dinosaurs.json: dinosaur fossil finds, for habitat zones.
//
// Source: the Paleobiology Database (https://paleobiodb.org, CC BY 4.0), queried
// by clade. Each find keeps its present-day position, the plate it sits on and
// its age range; the app moves it with the plate model, like the land.
//
// Output: {
//   groups: [{ id, name, example }],
//   finds:  [[lon, lat, plateId, oldestMa, youngestMa, groupIndex], …],
//   impact: { lon, lat, plate }   // Chicxulub crater, for the K–Pg animation
// }
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildPlateIndex, readGpml } from './geo-utils.mjs';

const RAW = 'data-raw/pbdb';
const GPML = 'data-raw/plates/StaticPolygons/StaticPolygons/shapes_static_polygons_Merdith_etal.gpml';
mkdirSync(RAW, { recursive: true });
if (!existsSync(GPML)) throw new Error('Run npm run data:plates first (it downloads the plate model).');

// Birds are theropods too; they are excluded so zones end with the non-avian dinosaurs.
const GROUPS = [
  { id: 'theropods', name: 'Theropods', example: 'meat-eaters such as Allosaurus and Tyrannosaurus', clade: 'Theropoda^Aves' },
  { id: 'sauropods', name: 'Sauropodomorphs', example: 'long-necked giants such as Brachiosaurus', clade: 'Sauropodomorpha' },
  { id: 'ceratopsians', name: 'Horned dinosaurs', example: 'ceratopsians such as Triceratops', clade: 'Ceratopsia' },
  { id: 'thyreophorans', name: 'Armoured dinosaurs', example: 'stegosaurs and ankylosaurs', clade: 'Thyreophora' },
  { id: 'ornithopods', name: 'Ornithopods', example: 'Iguanodon and the duck-billed hadrosaurs', clade: 'Ornithopoda' },
];

/** Finds dated to within this many million years; vaguer dates would smear the zones. */
const MAX_AGE_SPREAD = 25;

const plates = buildPlateIndex(readGpml(GPML).filter((f) => f.properties.T <= 0));
const finds = [];
const seen = new Set();
for (const [g, group] of GROUPS.entries()) {
  const file = `${RAW}/${group.id}.json`;
  if (!existsSync(file)) {
    const url = `https://paleobiodb.org/data1.2/occs/list.json?base_name=${encodeURIComponent(group.clade)}&show=coords&vocab=pbdb`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PBDB ${group.clade}: ${res.status}`);
    writeFileSync(file, await res.text());
  }
  const records = JSON.parse(readFileSync(file, 'utf8')).records;
  let kept = 0;
  for (const r of records) {
    const lon = +r.lng, lat = +r.lat, oldest = +r.max_ma, youngest = +r.min_ma;
    if (!isFinite(lon) || !isFinite(lat) || !(oldest >= youngest) || oldest - youngest > MAX_AGE_SPREAD) continue;
    // One find per site, age range and group: many sites list dozens of specimens.
    const key = `${g}:${lon.toFixed(1)},${lat.toFixed(1)}:${oldest}:${youngest}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const plate = plates.at(lon, lat).P;
    finds.push([+lon.toFixed(2), +lat.toFixed(2), plate, oldest, youngest, g]);
    kept++;
  }
  console.log(`${group.name}: ${records.length} occurrences → ${kept} dated sites`);
}

const chicxulub = { lon: -89.5, lat: 21.4 };
const out = {
  source: 'Paleobiology Database, https://paleobiodb.org (CC BY 4.0)',
  groups: GROUPS.map(({ id, name, example }) => ({ id, name, example })),
  finds,
  impact: { ...chicxulub, plate: plates.at(chicxulub.lon, chicxulub.lat).P },
};
writeFileSync('public/data/dinosaurs.json', JSON.stringify(out));
console.log(`dinosaurs.json: ${finds.length} sites, Chicxulub on plate ${out.impact.plate}`);
