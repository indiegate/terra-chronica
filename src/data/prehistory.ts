// Human prehistory, 7 million years ago to 10,000 BC: the slider's epochs and
// stages, milestone events, key hominin sites, approximate species ranges and
// the routes of the great dispersals.
//
// All times are in years before present (BP). Dates are the ones usually cited
// in the literature; where they are debated, the summary says so. Ranges and
// routes are schematic: drawn from the sites that anchor them, not surveyed.

/** The slider's span: from the earliest known hominins to the start of human history (10,000 BC). */
export const PRE_START = 7_000_000;
export const PRE_END = 11_950;

// ── Slider bands and stages ─────────────────────────────────────────────

/** Geological epochs, with International Chronostratigraphic Chart colours. */
export const EPOCHS = [
  { name: 'Late Miocene', start: 7_000_000, end: 5_333_000, color: '#FFFF66',
    summary: 'Africa’s forests shrink as the climate cools and dries. The human and chimpanzee lineages have just split: the earliest known hominins, such as Sahelanthropus, walk upright at least some of the time.' },
  { name: 'Pliocene', start: 5_333_000, end: 2_580_000, color: '#FFFF99',
    summary: 'A warmer world than today. Australopiths such as “Lucy” walk upright across the savannas of East and southern Africa; the first stone tools appear about 3.3 million years ago, and the first members of the genus Homo about 2.8 million.' },
  { name: 'Early Pleistocene', start: 2_580_000, end: 774_000, color: '#FFEDB3',
    summary: 'The ice ages begin. Homo erectus, tall and long-legged, makes hand-axes and spreads out of Africa as far as China and Java; fire is tamed by about a million years ago.' },
  { name: 'Middle Pleistocene', start: 774_000, end: 129_000, color: '#FFF2C7',
    summary: 'Longer, harsher glacial cycles. Middle Pleistocene Homo gives rise to the Neanderthals in Europe, the Denisovans in Asia and, in Africa about 300,000 years ago, Homo sapiens.' },
  { name: 'Late Pleistocene', start: 129_000, end: PRE_END, color: '#FFF2D3',
    summary: 'The last ice age. Homo sapiens spreads from Africa to every continent but Antarctica, making art, ornaments and boats; the Neanderthals, Denisovans and island hominins disappear, and many giant animals die out.' },
];

/**
 * Stone-tool stages. They overlapped and varied by region; these are the
 * broad, world-wide sequence used for the date read-out (in Africa the last
 * two are called the Middle and Later Stone Age).
 */
export const STAGES = [
  { name: 'Before stone tools', start: 7_000_000, end: 3_300_000 },
  { name: 'Earliest stone tools', start: 3_300_000, end: 2_600_000 },
  { name: 'Oldowan', start: 2_600_000, end: 1_760_000 },
  { name: 'Acheulean', start: 1_760_000, end: 300_000 },
  { name: 'Middle Palaeolithic', start: 300_000, end: 50_000 },
  { name: 'Upper Palaeolithic', start: 50_000, end: PRE_END },
];

export function epochAt(bp: number) {
  return EPOCHS.find((e) => bp <= e.start && bp >= e.end) ?? EPOCHS[EPOCHS.length - 1];
}

export function stageAt(bp: number) {
  return STAGES.find((s) => bp <= s.start && bp >= s.end) ?? STAGES[STAGES.length - 1];
}

// ── Milestones on the slider ────────────────────────────────────────────

export const PRE_EVENTS: { value: number; label: string }[] = [
  { value: 7_000_000, label: 'Sahelanthropus: one of the earliest known hominins' },
  { value: 4_400_000, label: '“Ardi”: Ardipithecus walks upright but still climbs' },
  { value: 3_660_000, label: 'Laetoli footprints: fully upright walking' },
  { value: 3_300_000, label: 'Lomekwi: the oldest known stone tools' },
  { value: 3_200_000, label: '“Lucy” (Australopithecus afarensis)' },
  { value: 2_800_000, label: 'Earliest known member of the genus Homo (Ledi-Geraru)' },
  { value: 2_580_000, label: 'Ice ages begin: the Quaternary' },
  { value: 2_100_000, label: 'Hominins reach China (Shangchen stone tools)' },
  { value: 1_800_000, label: 'Homo erectus at Dmanisi, in the Caucasus' },
  { value: 1_760_000, label: 'First hand-axes (Acheulean)' },
  { value: 1_000_000, label: 'Earliest evidence of controlled fire (Wonderwerk Cave)' },
  { value: 430_000, label: 'Sima de los Huesos: early Neanderthal lineage' },
  { value: 300_000, label: 'Wooden hunting spears at Schöningen' },
  { value: 315_000, label: 'Earliest known Homo sapiens (Jebel Irhoud)' },
  { value: 120_000, label: 'Homo sapiens in the Levant (Skhul and Qafzeh)' },
  { value: 100_000, label: 'Engraved ochre and shell beads (Blombos Cave)' },
  { value: 74_000, label: 'Toba super-eruption' },
  { value: 65_000, label: 'Main dispersal out of Africa begins' },
  { value: 51_200, label: 'Oldest known figurative art (Sulawesi)' },
  { value: 45_000, label: 'Homo sapiens reaches Europe' },
  { value: 40_000, label: 'Neanderthals disappear' },
  { value: 36_000, label: 'Chauvet Cave paintings' },
  { value: 26_000, label: 'Last Glacial Maximum begins' },
  { value: 20_000, label: 'Oldest known pottery (Xianrendong, China)' },
  { value: 16_000, label: 'People move south into the Americas' },
  { value: 14_700, label: 'Bølling–Allerød warming' },
  { value: 12_900, label: 'Younger Dryas cold snap' },
];

// ── Species ─────────────────────────────────────────────────────────────

export type SpeciesId =
  | 'early'
  | 'australopith'
  | 'early-homo'
  | 'erectus'
  | 'heidelbergensis'
  | 'naledi'
  | 'neanderthal'
  | 'denisovan'
  | 'island'
  | 'sapiens';

export interface Species {
  id: SpeciesId;
  name: string;
  note: string;
  color: string;
}

export const SPECIES: Species[] = [
  { id: 'early', name: 'Earliest hominins', note: 'Sahelanthropus, Orrorin and Ardipithecus', color: '#8a6a4a' },
  { id: 'australopith', name: 'Australopiths', note: 'Australopithecus and Paranthropus', color: '#b0782a' },
  { id: 'early-homo', name: 'Early Homo', note: 'Homo habilis and Homo rudolfensis', color: '#9a8a3a' },
  { id: 'erectus', name: 'Homo erectus', note: 'including African “ergaster” and Asian erectus', color: '#b5533c' },
  { id: 'heidelbergensis', name: 'Middle Pleistocene Homo', note: 'Homo antecessor and Homo heidelbergensis', color: '#7a4a3a' },
  { id: 'naledi', name: 'Homo naledi', note: 'a small-brained species of southern Africa', color: '#a8743f' },
  { id: 'neanderthal', name: 'Neanderthals', note: 'Homo neanderthalensis', color: '#4a6a8a' },
  { id: 'denisovan', name: 'Denisovans', note: 'known from a few fossils and from DNA', color: '#6f8f8a' },
  { id: 'island', name: 'Island hominins', note: 'Homo floresiensis and Homo luzonensis', color: '#8a5a7a' },
  { id: 'sapiens', name: 'Homo sapiens', note: 'modern humans', color: '#8a2d1c' },
];

export const SPECIES_BY_ID = new Map(SPECIES.map((s) => [s.id, s]));

// ── Sites ───────────────────────────────────────────────────────────────

export interface Site {
  name: string;
  lon: number;
  lat: number;
  /** Oldest and youngest dates of what the site is known for (BP). */
  from: number;
  to: number;
  species: SpeciesId;
  summary: string;
}

export const SITES: Site[] = [
  // Earliest hominins and australopiths (Africa)
  { name: 'Toros-Menalla', lon: 17.8, lat: 16.2, from: 7_200_000, to: 6_800_000, species: 'early',
    summary: 'The skull nicknamed Toumaï (Sahelanthropus tchadensis), one of the oldest known possible hominins, found in the Djurab Desert of Chad.' },
  { name: 'Tugen Hills', lon: 35.8, lat: 0.8, from: 6_100_000, to: 5_700_000, species: 'early',
    summary: 'Orrorin tugenensis: its thigh bones suggest it already walked on two legs.' },
  { name: 'Aramis, Middle Awash', lon: 40.5, lat: 10.5, from: 4_420_000, to: 4_390_000, species: 'early',
    summary: '“Ardi” (Ardipithecus ramidus), a partial skeleton showing a mix of upright walking and tree climbing.' },
  { name: 'Kanapoi', lon: 36.07, lat: 2.32, from: 4_200_000, to: 4_100_000, species: 'australopith',
    summary: 'Australopithecus anamensis, the earliest known species of Australopithecus.' },
  { name: 'Laetoli', lon: 35.2, lat: -3.2, from: 3_670_000, to: 3_650_000, species: 'australopith',
    summary: 'Footprints left in wet volcanic ash, made by upright-walking hominins, probably Australopithecus afarensis.' },
  { name: 'Koro Toro', lon: 18.5, lat: 16.0, from: 3_600_000, to: 3_400_000, species: 'australopith',
    summary: 'Australopithecus bahrelghazali, showing that australopiths lived far west of the Rift Valley.' },
  { name: 'Lomekwi 3', lon: 35.8, lat: 3.9, from: 3_300_000, to: 3_300_000, species: 'australopith',
    summary: 'The oldest known stone tools, 700,000 years older than the Oldowan. Who made them is unknown.' },
  { name: 'Hadar', lon: 40.6, lat: 11.1, from: 3_200_000, to: 3_180_000, species: 'australopith',
    summary: '“Lucy”, a 40% complete skeleton of Australopithecus afarensis, found in 1974.' },
  { name: 'Ledi-Geraru', lon: 40.9, lat: 11.4, from: 2_800_000, to: 2_750_000, species: 'early-homo',
    summary: 'A jawbone that is the earliest known fossil of the genus Homo.' },
  { name: 'Taung', lon: 24.8, lat: -27.6, from: 2_800_000, to: 2_500_000, species: 'australopith',
    summary: 'The “Taung Child” (Australopithecus africanus), the first australopith ever described, in 1925.' },
  { name: 'Gona', lon: 40.4, lat: 11.05, from: 2_600_000, to: 2_500_000, species: 'early-homo',
    summary: 'Among the oldest Oldowan tools: flakes struck from cobbles to cut meat and work wood.' },
  { name: 'Drimolen', lon: 27.75, lat: -25.97, from: 2_040_000, to: 1_950_000, species: 'erectus',
    summary: 'The oldest known Homo erectus skull, living alongside Paranthropus robustus.' },
  { name: 'Koobi Fora', lon: 36.2, lat: 3.9, from: 1_950_000, to: 1_500_000, species: 'early-homo',
    summary: 'Fossils of several species living side by side on the shore of Lake Turkana, among them Homo rudolfensis (KNM-ER 1470).' },
  { name: 'Olduvai Gorge', lon: 35.35, lat: -2.99, from: 1_900_000, to: 1_700_000, species: 'early-homo',
    summary: 'Type site of Homo habilis and of the Oldowan tool industry; also home to Paranthropus boisei (“Zinj”).' },

  // Homo erectus in Africa and Asia
  { name: 'Shangchen', lon: 109.4, lat: 34.1, from: 2_120_000, to: 1_260_000, species: 'erectus',
    summary: 'Stone tools in the Chinese loess, the oldest evidence of hominins outside Africa. The toolmakers are unknown.' },
  { name: 'Dmanisi', lon: 44.34, lat: 41.34, from: 1_850_000, to: 1_770_000, species: 'erectus',
    summary: 'Five small-brained Homo erectus skulls in Georgia: the earliest hominin fossils outside Africa.' },
  { name: 'Kokiselei', lon: 35.9, lat: 4.0, from: 1_760_000, to: 1_700_000, species: 'erectus',
    summary: 'The earliest known hand-axes, the start of the Acheulean tradition.' },
  { name: 'Nariokotome', lon: 35.85, lat: 4.18, from: 1_530_000, to: 1_500_000, species: 'erectus',
    summary: '“Turkana Boy”, the most complete early Homo erectus skeleton, tall and long-legged like people today.' },
  { name: '‘Ubeidiya', lon: 35.55, lat: 32.68, from: 1_500_000, to: 1_300_000, species: 'erectus',
    summary: 'Hand-axes in the Jordan Valley, on the corridor out of Africa.' },
  { name: 'Sangiran', lon: 110.83, lat: -7.45, from: 1_500_000, to: 1_000_000, species: 'erectus',
    summary: 'Java’s richest Homo erectus site, occupied when low seas joined the island to mainland Asia.' },
  { name: 'Wonderwerk Cave', lon: 23.55, lat: -27.85, from: 1_000_000, to: 1_000_000, species: 'erectus',
    summary: 'Burnt bone and plant ash deep inside a cave: the earliest good evidence of controlled fire.' },
  { name: 'Zhoukoudian', lon: 115.93, lat: 39.69, from: 780_000, to: 400_000, species: 'erectus',
    summary: '“Peking Man”: dozens of Homo erectus individuals from a cave system near Beijing.' },
  { name: 'Trinil', lon: 111.35, lat: -7.37, from: 540_000, to: 430_000, species: 'erectus',
    summary: '“Java Man”, found in 1891, and a mussel shell engraved with a zigzag, the oldest known deliberate marking.' },
  { name: 'Mata Menge', lon: 121.1, lat: -8.68, from: 700_000, to: 700_000, species: 'island',
    summary: 'Tiny jaw and teeth on Flores, probably ancestors of Homo floresiensis, dwarfed after reaching the island.' },

  // Middle Pleistocene: Europe and Africa
  { name: 'Happisburgh', lon: 1.53, lat: 52.83, from: 950_000, to: 850_000, species: 'heidelbergensis',
    summary: 'Footprints on an ancient estuary in Norfolk: the earliest known humans in northern Europe.' },
  { name: 'Gran Dolina, Atapuerca', lon: -3.52, lat: 42.35, from: 900_000, to: 780_000, species: 'heidelbergensis',
    summary: 'Homo antecessor, among the earliest Europeans, with cut marks suggesting cannibalism.' },
  { name: 'Mauer', lon: 8.83, lat: 49.34, from: 610_000, to: 600_000, species: 'heidelbergensis',
    summary: 'The jaw that named Homo heidelbergensis, found in a sand pit in 1907.' },
  { name: 'Boxgrove', lon: -0.66, lat: 50.86, from: 500_000, to: 480_000, species: 'heidelbergensis',
    summary: 'Hundreds of finely made hand-axes and butchered horse bones on an ancient English shore.' },
  { name: 'Sima de los Huesos, Atapuerca', lon: -3.51, lat: 42.36, from: 430_000, to: 430_000, species: 'neanderthal',
    summary: 'At least 28 individuals at the bottom of a shaft; their DNA places them early on the Neanderthal line.' },
  { name: 'Rising Star Cave', lon: 27.73, lat: -26.02, from: 335_000, to: 236_000, species: 'naledi',
    summary: 'Homo naledi, a small-brained species alive at the same time as the first Homo sapiens.' },
  { name: 'Kabwe', lon: 28.43, lat: -14.45, from: 320_000, to: 270_000, species: 'heidelbergensis',
    summary: 'The “Broken Hill” skull, a late archaic human of central Africa.' },
  { name: 'Schöningen', lon: 10.95, lat: 52.14, from: 300_000, to: 300_000, species: 'heidelbergensis',
    summary: 'Wooden throwing spears preserved in a lakeside peat, beside butchered horses.' },

  // Homo sapiens in Africa and the first excursions
  { name: 'Jebel Irhoud', lon: -8.87, lat: 31.85, from: 350_000, to: 280_000, species: 'sapiens',
    summary: 'The oldest known Homo sapiens fossils: modern faces, but longer, older-style skulls.' },
  { name: 'Omo Kibish', lon: 35.95, lat: 5.4, from: 233_000, to: 195_000, species: 'sapiens',
    summary: 'Omo I, long the oldest known modern human skull, beside the Omo River in Ethiopia.' },
  { name: 'Misliya Cave', lon: 34.98, lat: 32.7, from: 194_000, to: 177_000, species: 'sapiens',
    summary: 'A Homo sapiens jaw on Mount Carmel: an early foray out of Africa, long before the main dispersal.' },
  { name: 'Denisova Cave', lon: 84.68, lat: 51.4, from: 200_000, to: 50_000, species: 'denisovan',
    summary: 'The cave that revealed the Denisovans through DNA, and “Denny”, the daughter of a Neanderthal mother and a Denisovan father.' },
  { name: 'Baishiya Karst Cave', lon: 102.57, lat: 35.45, from: 160_000, to: 160_000, species: 'denisovan',
    summary: 'A Denisovan jaw 3,280 m up on the Tibetan Plateau.' },
  { name: 'Qafzeh', lon: 35.3, lat: 32.7, from: 120_000, to: 90_000, species: 'sapiens',
    summary: 'Early modern humans buried with red ochre and shells, in a region Neanderthals later occupied.' },
  { name: 'Blombos Cave', lon: 21.22, lat: -34.41, from: 100_000, to: 72_000, species: 'sapiens',
    summary: 'Engraved ochre, shell beads and an ochre “paint kit”: some of the earliest symbolic behaviour.' },

  // Late Pleistocene: Neanderthals and island species
  { name: 'Shanidar Cave', lon: 44.22, lat: 36.83, from: 75_000, to: 45_000, species: 'neanderthal',
    summary: 'Neanderthal burials in the Zagros, including a man who survived for years with severe injuries.' },
  { name: 'Liang Bua', lon: 120.44, lat: -8.53, from: 100_000, to: 50_000, species: 'island',
    summary: 'Homo floresiensis, the “hobbit”: about a metre tall, living alongside dwarf elephants and Komodo dragons.' },
  { name: 'Callao Cave', lon: 121.83, lat: 17.7, from: 67_000, to: 50_000, species: 'island',
    summary: 'Homo luzonensis, a small hominin of the Philippines, isolated on its island.' },
  { name: 'La Chapelle-aux-Saints', lon: 1.72, lat: 45.0, from: 60_000, to: 47_000, species: 'neanderthal',
    summary: 'An elderly Neanderthal man laid in a dug grave, evidence that Neanderthals buried their dead.' },
  { name: 'Gorham’s Cave', lon: -5.34, lat: 36.12, from: 50_000, to: 40_000, species: 'neanderthal',
    summary: 'One of the last Neanderthal refuges, on Gibraltar, with an engraved cross-hatching on the floor.' },
  { name: 'Feldhofer Cave, Neander Valley', lon: 6.95, lat: 51.23, from: 42_000, to: 39_000, species: 'neanderthal',
    summary: 'The type specimen of the Neanderthals, found by quarry workers in 1856.' },

  // The dispersal of Homo sapiens
  { name: 'Madjedbebe', lon: 132.9, lat: -12.5, from: 65_000, to: 50_000, species: 'sapiens',
    summary: 'Australia’s oldest dated occupation. The 65,000-year date is debated; most agree people were here by 50,000 years ago.' },
  { name: 'Tam Pà Ling', lon: 103.4, lat: 20.2, from: 70_000, to: 46_000, species: 'sapiens',
    summary: 'Early modern humans in the forests of Laos, on the way into Southeast Asia.' },
  { name: 'Leang Karampuang', lon: 119.6, lat: -4.9, from: 51_200, to: 51_200, species: 'sapiens',
    summary: 'A painted scene of people and a pig on Sulawesi, the oldest known figurative art.' },
  { name: 'Bacho Kiro', lon: 25.43, lat: 42.95, from: 46_000, to: 43_000, species: 'sapiens',
    summary: 'Among the earliest Homo sapiens in Europe, with Neanderthal ancestors a few generations back.' },
  { name: 'Ust’-Ishim', lon: 71.17, lat: 57.7, from: 45_000, to: 45_000, species: 'sapiens',
    summary: 'A thigh bone from Siberia that gave the oldest complete modern human genome.' },
  { name: 'Lake Mungo', lon: 143.0, lat: -33.7, from: 42_000, to: 40_000, species: 'sapiens',
    summary: 'Mungo Lady, cremated, and Mungo Man, buried with ochre: among the oldest burials in the world.' },
  { name: 'Hohle Fels', lon: 9.75, lat: 48.38, from: 40_000, to: 35_000, species: 'sapiens',
    summary: 'A mammoth-ivory figurine and a bone flute, among the oldest known sculpture and musical instruments.' },
  { name: 'Tianyuan Cave', lon: 115.88, lat: 39.65, from: 40_000, to: 39_000, species: 'sapiens',
    summary: 'One of the earliest modern humans in East Asia, whose DNA links to people of Asia and the Americas.' },
  { name: 'Niah Cave', lon: 113.78, lat: 3.82, from: 40_000, to: 35_000, species: 'sapiens',
    summary: 'The “Deep Skull” of Borneo, from rainforest foragers.' },
  { name: 'Chauvet Cave', lon: 4.42, lat: 44.39, from: 36_000, to: 33_000, species: 'sapiens',
    summary: 'Hundreds of painted lions, rhinos, horses and mammoths, sealed by a rockfall.' },
  { name: 'Sungir', lon: 40.5, lat: 56.17, from: 35_000, to: 33_000, species: 'sapiens',
    summary: 'Burials decorated with thousands of ivory beads, near today’s Vladimir.' },
  { name: 'Yana', lon: 135.4, lat: 70.7, from: 32_000, to: 32_000, species: 'sapiens',
    summary: 'Mammoth hunters above the Arctic Circle, at the height of an ice age.' },
  { name: 'Dolní Věstonice', lon: 16.65, lat: 48.88, from: 31_000, to: 25_000, species: 'sapiens',
    summary: 'Gravettian mammoth hunters; their fired-clay Venus is one of the oldest ceramic objects.' },
  { name: 'Ohalo II', lon: 35.56, lat: 32.72, from: 23_000, to: 23_000, species: 'sapiens',
    summary: 'Brushwood huts by the Sea of Galilee, with wild wheat and barley, 11,000 years before farming.' },
  { name: 'White Sands', lon: -106.3, lat: 32.8, from: 23_000, to: 21_000, species: 'sapiens',
    summary: 'Human footprints in New Mexico. If their dates hold (they are debated), people reached the Americas before the ice age peaked.' },
  { name: 'Xianrendong', lon: 117.1, lat: 28.7, from: 20_000, to: 19_000, species: 'sapiens',
    summary: 'Pottery sherds from a cave in Jiangxi, the oldest known pottery, made by hunter-gatherers.' },
  { name: 'Lascaux', lon: 1.17, lat: 45.05, from: 19_000, to: 17_000, species: 'sapiens',
    summary: 'The painted cave of aurochs, horses and deer in the Dordogne.' },
  { name: 'Monte Verde', lon: -73.2, lat: -41.5, from: 14_600, to: 14_200, species: 'sapiens',
    summary: 'A camp in southern Chile, showing that people reached the far end of the Americas soon after the ice retreated.' },
  { name: 'Paisley Caves', lon: -120.5, lat: 42.75, from: 14_300, to: 14_000, species: 'sapiens',
    summary: 'Preserved human coprolites with ancient DNA, among the oldest evidence of people in North America.' },
  { name: 'Blackwater Draw', lon: -103.33, lat: 34.28, from: 13_100, to: 12_700, species: 'sapiens',
    summary: 'The Clovis site: fluted spear points among the bones of mammoths.' },
];

// ── Species ranges (schematic) ─────────────────────────────────────────

export interface RangePart {
  species: SpeciesId;
  /** When this part of the range was occupied (BP). */
  from: number;
  to: number;
  /** Rough outline, [lon, lat] (no ring may cross the antimeridian). */
  ring: [number, number][];
}

// Reused outlines
const EAST_AFRICA: [number, number][] = [[36, 15], [43, 12.5], [42, 5], [40, -2], [37.5, -8], [33, -6], [33.5, 2], [34, 8]];
const SOUTH_AFRICA: [number, number][] = [[23, -24], [31, -23], [31, -29], [23, -30]];
const AFRICA: [number, number][] = [
  [-10, 30], [0, 34], [10, 34], [22, 32], [32, 31], [38, 18], [44, 11], [51, 11], [42, -2], [40, -15], [35, -25], [28, -33],
  [19, -34], [15, -25], [12, -12], [9, 3], [-5, 5], [-15, 11], [-17, 21],
];
const EUROPE: [number, number][] = [
  [-9, 37], [-9, 43], [-4, 48], [-3, 52], [5, 54], [15, 53], [25, 50], [35, 48], [40, 45], [30, 41], [22, 39], [15, 38], [5, 40],
];
const NEAR_EAST: [number, number][] = [[33, 31], [36, 36], [44, 41], [50, 38], [48, 30], [38, 29]];

export const RANGES: RangePart[] = [
  { species: 'early', from: 7_200_000, to: 6_800_000, ring: [[15, 18], [20, 18], [20, 14], [15, 14]] },
  { species: 'early', from: 6_200_000, to: 4_300_000, ring: EAST_AFRICA },
  { species: 'australopith', from: 4_200_000, to: 1_200_000, ring: EAST_AFRICA },
  { species: 'australopith', from: 3_700_000, to: 1_200_000, ring: SOUTH_AFRICA },
  { species: 'australopith', from: 3_600_000, to: 3_400_000, ring: [[15, 18], [20, 18], [20, 14], [15, 14]] },
  { species: 'early-homo', from: 2_800_000, to: 1_450_000, ring: EAST_AFRICA },
  { species: 'early-homo', from: 2_000_000, to: 1_600_000, ring: SOUTH_AFRICA },
  { species: 'erectus', from: 2_000_000, to: 900_000, ring: AFRICA },
  { species: 'erectus', from: 1_850_000, to: 1_200_000, ring: NEAR_EAST },
  { species: 'erectus', from: 2_100_000, to: 250_000, ring: [[70, 25], [78, 34], [100, 40], [120, 42], [122, 30], [112, 20], [100, 12], [95, 18], [80, 10], [68, 22]] },
  { species: 'erectus', from: 1_500_000, to: 108_000, ring: [[104, -5.5], [115, -6.5], [115, -9], [105, -8]] },
  { species: 'heidelbergensis', from: 900_000, to: 300_000, ring: EUROPE },
  { species: 'heidelbergensis', from: 700_000, to: 250_000, ring: AFRICA },
  { species: 'naledi', from: 335_000, to: 236_000, ring: SOUTH_AFRICA },
  { species: 'neanderthal', from: 430_000, to: 40_000, ring: EUROPE },
  { species: 'neanderthal', from: 130_000, to: 45_000, ring: [[36, 31], [40, 38], [50, 43], [62, 42], [72, 40], [85, 52], [88, 49], [75, 37], [60, 35], [48, 32]] },
  { species: 'denisovan', from: 300_000, to: 40_000, ring: [[80, 53], [90, 54], [104, 46], [106, 35], [104, 25], [107, 15], [101, 12], [97, 20], [92, 29], [85, 32], [80, 40]] },
  { species: 'island', from: 700_000, to: 50_000, ring: [[118.9, -8.2], [123, -8.2], [123, -8.95], [118.9, -8.95]] },
  { species: 'island', from: 70_000, to: 50_000, ring: [[119.8, 18.6], [122.5, 18.6], [124, 13.5], [120, 14.5]] },
  // Homo sapiens: Africa first, then each region as it was reached (see ROUTES).
  { species: 'sapiens', from: 315_000, to: 0, ring: AFRICA },
  { species: 'sapiens', from: 190_000, to: 90_000, ring: [[33, 30], [36, 34], [37, 31]] },
  { species: 'sapiens', from: 65_000, to: 0, ring: [[43, 13], [52, 16], [57, 23], [59, 25], [55, 27], [48, 30], [38, 29], [36, 20]] },
  { species: 'sapiens', from: 60_000, to: 0, ring: [[57, 26], [62, 32], [75, 36], [88, 28], [92, 22], [80, 8], [72, 18], [66, 24]] },
  { species: 'sapiens', from: 55_000, to: 0, ring: [[92, 22], [100, 24], [110, 22], [110, 10], [118, 5], [120, -8], [104, -8], [98, 5]] },
  { species: 'sapiens', from: 50_000, to: 0, ring: [[114, -22], [130, -11], [142, -10], [153, -27], [150, -37], [140, -38], [130, -32], [115, -34]] },
  { species: 'sapiens', from: 50_000, to: 0, ring: [[40, 30], [44, 40], [55, 42], [68, 42], [70, 32], [60, 26], [48, 28]] },
  { species: 'sapiens', from: 45_000, to: 0, ring: EUROPE },
  { species: 'sapiens', from: 45_000, to: 0, ring: [[55, 42], [60, 56], [80, 56], [95, 52], [105, 48], [120, 45], [122, 30], [110, 22], [95, 30], [75, 36], [65, 40]] },
  { species: 'sapiens', from: 38_000, to: 0, ring: [[130, 31], [135, 34], [141, 41], [142, 36], [135, 33]] },
  { species: 'sapiens', from: 32_000, to: 0, ring: [[60, 56], [75, 70], [110, 73], [140, 72], [160, 69], [160, 60], [135, 55], [110, 52], [85, 54]] },
  { species: 'sapiens', from: 25_000, to: 0, ring: [[160, 60], [160, 69], [180, 68], [180, 60]] },
  { species: 'sapiens', from: 25_000, to: 0, ring: [[-180, 60], [-180, 68], [-160, 70], [-150, 64], [-160, 57]] },
  { species: 'sapiens', from: 16_000, to: 0, ring: [[-150, 60], [-135, 58], [-124, 48], [-117, 32], [-105, 20], [-95, 16], [-83, 9], [-80, 25], [-75, 40], [-70, 45], [-95, 50], [-115, 55], [-140, 62]] },
  { species: 'sapiens', from: 14_600, to: 0, ring: [[-80, 9], [-60, 10], [-35, -6], [-40, -22], [-58, -38], [-68, -52], [-74, -45], [-72, -30], [-80, -5]] },
];

// ── Routes of the great dispersals ─────────────────────────────────────

export interface Route {
  id: string;
  name: string;
  species: SpeciesId;
  /** [lon, lat, bp]: each point with when it was reached; times decrease along the route. */
  path: [number, number, number][];
  /** Routes that faded out again (early excursions), and when they did. */
  endsAt?: number;
  note: string;
}

export const ROUTES: Route[] = [
  {
    id: 'erectus-out', name: 'First hominins out of Africa', species: 'erectus',
    note: 'Early Homo left Africa more than 2 million years ago, reaching China and the Caucasus. The exact route and species are unknown.',
    path: [[36.2, 3.9, 2_250_000], [38, 14, 2_220_000], [35.5, 31, 2_200_000], [50, 36, 2_170_000], [70, 38, 2_150_000], [95, 36, 2_130_000], [109.4, 34.1, 2_120_000]],
  },
  {
    id: 'erectus-java', name: 'Homo erectus reaches Java', species: 'erectus',
    note: 'With sea levels low, Java was joined to mainland Asia.',
    path: [[109.4, 34.1, 1_700_000], [106, 22, 1_620_000], [102, 8, 1_560_000], [110.8, -7.45, 1_500_000]],
  },
  {
    id: 'levant', name: 'Early Homo sapiens in the Levant', species: 'sapiens',
    note: 'Homo sapiens reached the Levant by 190,000 and again by 120,000 years ago, but these groups left little trace in people alive today.',
    path: [[35.95, 5.4, 200_000], [37, 17, 196_000], [33.5, 29, 194_000], [35, 32.7, 190_000]],
    endsAt: 90_000,
  },
  {
    id: 'southern', name: 'The southern route to Asia and Sahul', species: 'sapiens',
    note: 'Most people outside Africa descend from a dispersal around 60,000 years ago. Sea levels were lower, but reaching Australia still meant crossing open water.',
    path: [[40, 9, 68_000], [43.4, 12.6, 65_000], [50, 15, 63_000], [56.3, 26.5, 61_000], [67, 25, 59_000], [78, 12, 57_000], [90, 22, 55_000], [101, 5, 53_000], [110, -1, 52_000], [124, -9, 51_000], [132.9, -12.5, 50_000], [143, -33.7, 43_000], [147, -42, 40_000]],
  },
  {
    id: 'europe', name: 'Into Europe', species: 'sapiens',
    note: 'Homo sapiens spread into Europe around 46,000 years ago and lived alongside Neanderthals for several thousand years.',
    path: [[35, 32.5, 55_000], [33, 39, 49_000], [25.4, 43, 46_000], [15.4, 48.3, 43_500], [4.4, 44.4, 42_000], [-4, 40, 40_000], [-3.5, 51, 40_000]],
  },
  {
    id: 'north-asia', name: 'Across northern Asia', species: 'sapiens',
    note: 'From Iran and Central Asia people moved into Siberia and North China, reaching Japan by 38,000 years ago.',
    path: [[52, 34, 52_000], [65, 40, 48_000], [71.2, 57.7, 45_000], [85, 51, 44_000], [105, 47, 42_000], [115.9, 39.7, 40_000], [127, 37, 39_000], [135, 35, 38_000]],
  },
  {
    id: 'arctic', name: 'Into the Arctic and Beringia', species: 'sapiens',
    note: 'By 32,000 years ago people were hunting mammoth above the Arctic Circle. Beringia, the land bridge to America, was then dry land.',
    path: [[115.9, 39.7, 38_000], [125, 55, 34_000], [135.4, 70.7, 32_000], [160, 67, 28_000], [-170, 66, 25_000]],
  },
  {
    id: 'americas', name: 'Into the Americas', species: 'sapiens',
    note: 'Once the coast was free of ice, people moved south fast, most likely along the Pacific coast, reaching Chile by 14,500 years ago.',
    path: [[-170, 66, 17_500], [-150, 60, 16_800], [-132, 54, 16_300], [-120, 38, 15_800], [-106, 22, 15_400], [-80, 8, 15_000], [-80, -8, 14_800], [-73.2, -41.5, 14_500]],
  },
];

// ── Queries ─────────────────────────────────────────────────────────────

/**
 * A site counts as "now" while the date is within this factor of its own dates
 * (so the window widens with depth, matching the log-scale slider).
 */
const NOW_FACTOR = 1.2;

/** Whether a site is current at `bp`, already in the past, or not yet. */
export function siteState(site: Site, bp: number): 'now' | 'past' | null {
  if (site.from < bp / NOW_FACTOR) return null;
  return site.to > bp * NOW_FACTOR ? 'past' : 'now';
}

/** Species with any range part occupied at `bp`, in SPECIES order. */
export function speciesAt(bp: number): Species[] {
  const ids = new Set(RANGES.filter((r) => bp <= r.from && bp >= r.to).map((r) => r.species));
  return SPECIES.filter((s) => ids.has(s.id));
}
