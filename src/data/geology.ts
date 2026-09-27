// Deep-time content: geological periods (International Chronostratigraphic
// Chart dates and colours), events, and labels for past continents and oceans.
// Ages are in millions of years ago (Ma).

/** Oldest age the plate model reaches (Merdith et al. 2021); before it the map is schematic. */
export const MAX_AGE = 1000;
/** The age of the Earth, where the deep-time slider starts. */
export const EARTH_AGE = 4540;

export interface Period {
  name: string;
  /** The larger division it belongs to, and whether that is an era or an eon. */
  era: string;
  rank?: 'era' | 'eon';
  start: number; // Ma, older end
  end: number;
  color: string; // ICS colour
  summary: string;
}

export const PERIODS: Period[] = [
  // Before the plate model: eons and eras of the Precambrian (ICS dates; the Hadean starts with the Solar System).
  { name: 'Hadean', era: 'Hadean', rank: 'eon', start: 4567, end: 4031, color: '#AE027E',
    summary: 'Earth forms about 4.54 billion years ago. A collision with a Mars-sized body, Theia, throws out the debris that becomes the Moon, and the surface melts into a magma ocean. As it cools, a crust and the first oceans form: zircon crystals from Jack Hills in Australia show continental crust and liquid water by 4.4 billion years ago. No rocks survive from this eon.' },
  { name: 'Eoarchean', era: 'Archean', rank: 'eon', start: 4031, end: 3600, color: '#DA037F',
    summary: 'The oldest surviving rocks, the Acasta Gneiss of Canada, date from the start of this era. Life may already have begun: chemical traces in Greenland rocks about 3.7 billion years old are debated. The air holds almost no oxygen.' },
  { name: 'Paleoarchean', era: 'Archean', rank: 'eon', start: 3600, end: 3200, color: '#F444A9',
    summary: 'The oldest widely accepted fossils: stromatolites, mounds built by microbial mats, in the Pilbara of Australia (3.48 billion years). Small continents, among them the Kaapvaal and Pilbara cratons (perhaps joined as “Vaalbara”), rise from an almost global ocean.' },
  { name: 'Mesoarchean', era: 'Archean', rank: 'eon', start: 3200, end: 2800, color: '#F768A9',
    summary: 'Cratons grow and collide. Cyanobacteria may already be making oxygen by photosynthesis, but it is soaked up by iron dissolved in the sea, which settles as banded iron formations.' },
  { name: 'Neoarchean', era: 'Archean', rank: 'eon', start: 2800, end: 2500, color: '#F99BC1',
    summary: 'Many cratons gather into larger landmasses, sometimes reconstructed as a supercontinent called Kenorland or as several “supercratons”. Oxygen-making life is widespread, yet oxygen barely lasts in the air.' },
  { name: 'Paleoproterozoic', era: 'Proterozoic', rank: 'eon', start: 2500, end: 1600, color: '#F74370',
    summary: 'The Great Oxidation Event, about 2.4 billion years ago, brings free oxygen into the atmosphere and is followed by the Huronian glaciation. The first eukaryotes, cells with a nucleus, appear, and by 1.8 billion years ago the supercontinent Columbia (Nuna) has assembled.' },
  { name: 'Mesoproterozoic', era: 'Proterozoic', rank: 'eon', start: 1600, end: 1000, color: '#FDB462',
    summary: 'Much of the “Boring Billion”, a long stretch of stable climate and low oxygen. Columbia breaks apart; the red alga Bangiomorpha (about 1.05 billion years ago) is the oldest known multicellular organism with sexual reproduction. Rodinia begins to assemble.' },
  { name: 'Tonian', era: 'Neoproterozoic', start: 1000, end: 720, color: '#FEBF4E',
    summary: 'The supercontinent Rodinia, assembled around a billion years ago, sits in the vast Mirovia ocean and slowly begins to rift apart. Life is microbial and algal; the first signs of simple animals may date from late in the period.' },
  { name: 'Cryogenian', era: 'Neoproterozoic', start: 720, end: 635, color: '#FECC5C',
    summary: 'The “Snowball Earth” glaciations: ice sheets reach the tropics, possibly covering almost the whole planet, twice. Rodinia breaks up as the ice advances and retreats.' },
  { name: 'Ediacaran', era: 'Neoproterozoic', start: 635, end: 538.8, color: '#FED96A',
    summary: 'The first large, complex multicellular organisms: the soft-bodied Ediacaran biota of the sea floor.' },
  { name: 'Cambrian', era: 'Paleozoic', start: 538.8, end: 485.4, color: '#7FA056',
    summary: 'The “Cambrian explosion”: most major animal groups appear in the fossil record, trilobites among them. Life is almost entirely marine; the land is bare rock, and the large continent of Gondwana lies in the south.' },
  { name: 'Ordovician', era: 'Paleozoic', start: 485.4, end: 443.8, color: '#009270',
    summary: 'A great diversification of marine life. The first simple, moss-like plants reach land. The period ends in an ice age and one of the largest mass extinctions.' },
  { name: 'Silurian', era: 'Paleozoic', start: 443.8, end: 419.2, color: '#B3E1B6',
    summary: 'Reefs flourish and jawed fishes spread. The first vascular plants and land-dwelling arthropods appear.' },
  { name: 'Devonian', era: 'Paleozoic', start: 419.2, end: 358.9, color: '#CB8C37',
    summary: 'The “Age of Fishes”. The first forests and seed plants grow, and the first four-limbed vertebrates move onto land. Late in the period, mass extinctions strike the reefs.' },
  { name: 'Carboniferous', era: 'Paleozoic', start: 358.9, end: 298.9, color: '#67A599',
    summary: 'Vast swamp forests later become coal. High oxygen levels allow giant insects; the first reptiles lay shelled eggs. The continents converge into Pangaea.' },
  { name: 'Permian', era: 'Paleozoic', start: 298.9, end: 251.902, color: '#F04028',
    summary: 'Pangaea is complete and the ancestors of mammals dominate the land. The period ends with the end-Permian extinction, the worst in Earth’s history, linked to the Siberian Traps eruptions.' },
  { name: 'Triassic', era: 'Mesozoic', start: 251.902, end: 201.4, color: '#812B92',
    summary: 'Life recovers from the Great Dying. The first dinosaurs and the first mammals appear. Pangaea begins to rift apart, with massive eruptions at the period’s end.' },
  { name: 'Jurassic', era: 'Mesozoic', start: 201.4, end: 145, color: '#34B2C9',
    summary: 'Dinosaurs dominate, and the first birds evolve from them. Pangaea splits into Laurasia in the north and Gondwana in the south as the Atlantic begins to open.' },
  { name: 'Cretaceous', era: 'Mesozoic', start: 145, end: 66, color: '#7FC64E',
    summary: 'Flowering plants spread and seas stand high, flooding the continents. It ends with the Chicxulub asteroid impact, which wipes out the non-avian dinosaurs.' },
  { name: 'Paleogene', era: 'Cenozoic', start: 66, end: 23.03, color: '#FD9A52',
    summary: 'Mammals diversify to fill the world left by the dinosaurs. India collides with Asia, raising the Himalaya, and an ice sheet forms on Antarctica.' },
  { name: 'Neogene', era: 'Cenozoic', start: 23.03, end: 2.58, color: '#FFE619',
    summary: 'Grasslands spread and the climate cools. The Isthmus of Panama joins the Americas, and the earliest hominins appear in Africa.' },
  { name: 'Quaternary', era: 'Cenozoic', start: 2.58, end: 0, color: '#F9F97F',
    summary: 'Repeated ice ages. The genus Homo evolves; Homo sapiens appears about 300,000 years ago and spreads across the world.' },
];

export function periodAt(age: number): Period {
  return PERIODS.find((p) => age <= p.start && age >= p.end) ?? PERIODS[PERIODS.length - 1];
}

export const GEO_EVENTS: { value: number; label: string }[] = [
  { value: 4540, label: 'Earth forms' },
  { value: 4500, label: 'Theia collides with Earth; the Moon forms from the debris' },
  { value: 4400, label: 'Oldest known mineral grains (Jack Hills zircons): crust and water' },
  { value: 4000, label: 'Oldest surviving rocks (Acasta Gneiss)' },
  { value: 3900, label: 'Late Heavy Bombardment (debated)' },
  { value: 3700, label: 'Earliest possible traces of life (debated)' },
  { value: 3480, label: 'Oldest widely accepted fossils: stromatolites' },
  { value: 2400, label: 'Great Oxidation Event: oxygen enters the air' },
  { value: 2290, label: 'Huronian glaciation' },
  { value: 2023, label: 'Vredefort impact, the largest known crater' },
  { value: 1800, label: 'Supercontinent Columbia (Nuna) assembled' },
  { value: 1650, label: 'Oldest undisputed eukaryote fossils' },
  { value: 1350, label: 'Columbia breaks apart' },
  { value: 1050, label: 'Bangiomorpha: first known multicellular, sexually reproducing organism' },
  { value: 990, label: 'Rodinia supercontinent assembled' },
  { value: 750, label: 'Rodinia begins to break apart' },
  { value: 717, label: 'Sturtian “Snowball Earth” glaciation begins' },
  { value: 650, label: 'Marinoan “Snowball Earth” glaciation' },
  { value: 575, label: 'Ediacaran biota: first large complex organisms' },
  { value: 538.8, label: 'Cambrian explosion: most animal groups appear' },
  { value: 518, label: 'Earliest fish-like vertebrates' },
  { value: 470, label: 'First plants on land' },
  { value: 445, label: 'End-Ordovician mass extinction' },
  { value: 372, label: 'Late Devonian mass extinction' },
  { value: 365, label: 'First four-limbed vertebrates on land' },
  { value: 335, label: 'Pangaea assembles' },
  { value: 312, label: 'First reptiles' },
  { value: 252, label: 'End-Permian extinction, the “Great Dying”' },
  { value: 233, label: 'First dinosaurs' },
  { value: 201, label: 'End-Triassic extinction as Pangaea breaks apart' },
  { value: 150, label: 'Archaeopteryx, among the first birds' },
  { value: 130, label: 'First flowering plants' },
  { value: 66, label: 'Asteroid impact ends the age of dinosaurs' },
  { value: 50, label: 'India collides with Asia' },
  { value: 34, label: 'Ice sheet forms on Antarctica' },
  { value: 7, label: 'Earliest hominins' },
  { value: 2.58, label: 'Quaternary ice ages begin' },
  { value: 0.3, label: 'Homo sapiens appears' },
];

/** Present-day point on a plate: [plate id, lon, lat]. */
type Anchor = [number, number, number];
const AFRICA: Anchor = [701, 20, 0];
const NORTH_AMERICA: Anchor = [101, -100, 45];
const GREENLAND: Anchor = [102, -40, 72];
const SOUTH_AMERICA: Anchor = [201, -60, -10];
const BALTICA: Anchor = [302, 32, 57];
const SIBERIA: Anchor = [401, 100, 62];
const INDIA: Anchor = [501, 78, 20];
const NORTH_CHINA: Anchor = [601, 112, 38];
const AUSTRALIA: Anchor = [801, 135, -25];

export interface PaleoLabel {
  name: string;
  kind: 'continent' | 'ocean';
  from: number; // Ma
  to: number;
  /** Placed at the mean of these anchors as reconstructed; oceans may take the antipode. */
  anchors: Anchor[];
  antipode?: boolean;
}

export const PALEO_LABELS: PaleoLabel[] = [
  { name: 'Rodinia', kind: 'continent', from: 1000, to: 760, anchors: [NORTH_AMERICA, GREENLAND, BALTICA, SIBERIA, AUSTRALIA, AFRICA, SOUTH_AMERICA] },
  { name: 'Gondwana', kind: 'continent', from: 600, to: 320, anchors: [AFRICA, SOUTH_AMERICA, INDIA, AUSTRALIA] },
  { name: 'Laurentia', kind: 'continent', from: 750, to: 420, anchors: [NORTH_AMERICA, GREENLAND] },
  { name: 'Baltica', kind: 'continent', from: 750, to: 420, anchors: [BALTICA] },
  { name: 'Siberia', kind: 'continent', from: 750, to: 300, anchors: [SIBERIA] },
  { name: 'Laurussia', kind: 'continent', from: 420, to: 320, anchors: [NORTH_AMERICA, GREENLAND, BALTICA] },
  { name: 'Pangaea', kind: 'continent', from: 320, to: 180, anchors: [AFRICA, NORTH_AMERICA, SOUTH_AMERICA, BALTICA] },
  { name: 'Laurasia', kind: 'continent', from: 180, to: 60, anchors: [NORTH_AMERICA, BALTICA, SIBERIA] },
  { name: 'Gondwana', kind: 'continent', from: 180, to: 100, anchors: [AFRICA, SOUTH_AMERICA, AUSTRALIA] },
  { name: 'Iapetus Ocean', kind: 'ocean', from: 600, to: 420, anchors: [NORTH_AMERICA, BALTICA] },
  { name: 'Rheic Ocean', kind: 'ocean', from: 480, to: 330, anchors: [BALTICA, AFRICA] },
  { name: 'Panthalassa', kind: 'ocean', from: 750, to: 180, anchors: [AFRICA, NORTH_AMERICA, SOUTH_AMERICA, BALTICA, SIBERIA], antipode: true },
  { name: 'Tethys Ocean', kind: 'ocean', from: 250, to: 40, anchors: [NORTH_CHINA, INDIA] },
  { name: 'Atlantic Ocean', kind: 'ocean', from: 140, to: 0.001, anchors: [NORTH_AMERICA, AFRICA] },
  { name: 'Pacific Ocean', kind: 'ocean', from: 180, to: 0.001, anchors: [AFRICA, BALTICA], antipode: true },
  { name: 'Indian Ocean', kind: 'ocean', from: 120, to: 0.001, anchors: [AFRICA, AUSTRALIA] },
];

/** Age split into a number and its unit, e.g. ["252", "million years ago"]. */
export function ageParts(ma: number): [string, string] {
  if (ma <= 0) return ['Today', ''];
  if (ma >= 1000) return [(ma / 1000).toFixed(2).replace(/\.?0+$/, ''), 'billion years ago'];
  if (ma >= 10) return [Math.round(ma).toLocaleString('en-GB'), 'million years ago'];
  if (ma >= 1) return [ma.toFixed(1).replace(/\.0$/, ''), 'million years ago'];
  return [Math.round(ma * 1000).toLocaleString('en-GB'), 'thousand years ago'];
}

export function formatAge(ma: number): string {
  return ageParts(ma).join(' ').trim();
}

export function formatAgeShort(ma: number): string {
  if (ma <= 0) return 'Today';
  if (ma >= 1000) return `${(ma / 1000).toFixed(2).replace(/\.?0+$/, '')} Ga`;
  if (ma >= 1) return `${ma >= 10 ? Math.round(ma) : ma.toFixed(1).replace(/\.0$/, '')} Ma`;
  return `${Math.round(ma * 1000)} ka`;
}
