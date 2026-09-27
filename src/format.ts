export function formatYear(y: number): string {
  const r = Math.round(y);
  if (r < 0) return `${(-r).toLocaleString('en-GB')} BC`;
  if (r === 0) return '1 BC';
  return `AD ${r}`;
}

export function formatSpan(a: number, b: number): string {
  if (a < 0 && b < 0) return `${(-a).toLocaleString('en-GB')} – ${(-b).toLocaleString('en-GB')} BC`;
  if (a > 0 && b > 0) return `AD ${a} – ${b}`;
  return `${formatYear(a)} – ${formatYear(b)}`;
}

/** Muted watercolour inks for territories. */
const INKS = [
  '#b5533c', // madder red
  '#c98f3a', // ochre
  '#5f7f4e', // sap green
  '#4a6a8a', // indigo wash
  '#8a5a7a', // plum
  '#a8743f', // burnt sienna
  '#6f8f8a', // verdigris
  '#9a8a3a', // olive gold
  '#7a4a3a', // umber
  '#5a6f9a', // cornflower
  '#b0705a', // terracotta
  '#6a7a4a', // moss
  '#8f6a9a', // lavender
  '#c07a5a', // salmon
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function inkFor(key: string): string {
  return INKS[hash(key) % INKS.length];
}

const PEOPLES_WORDS =
  /hunter|gatherer|forager|culture|farmers|nomad|tribes|peoples|pastoral|fishers|fichers|aboriginal|chiefdoms|complex/i;

// Peoples and ethnic groupings named without any state-like word.
const PEOPLES_NAMES = new Set([
  'Ainu', 'Ainus', 'Alans', 'Arabs', 'Arameans', 'Arawaks', 'Austronesians', 'Azandes', 'Balts', 'Bantu', 'Bashkirs',
  'Bedouins', 'Berbers', 'Blemmyes', 'Burmese', 'Celts', 'Chuds', 'Cimerians', 'Curonians', 'Cushites', 'Czechs', 'Dacians',
  'Danes', 'Dravidians', 'Ests', 'Finns', 'Frisians', 'Geats', 'Gepids', 'Goths', 'Guanches', 'Huns', 'Illyrians', 'Inuit',
  'Karakalpaks', 'Karelians', 'Karluks', 'Khitans', 'Khoisan', 'Koreans', 'Kryvichs', 'Kurs', 'Kurykans', 'Leks', 'Magyars',
  'Malays', 'Mandes', 'Maori', 'Maoris', 'Mongols', 'Mongol tribes', 'Moravians', 'Mordvinians', 'Norsemen', 'Northmen',
  'Oghuz', 'Paleo-Koreans', 'Papuan', 'Papuans', 'Pechenegs', 'Permians', 'Picts', 'Polyanians', 'Polynesians', 'Prussians',
  'Pueblos', 'Saami', 'Sami', 'Samis', 'Sarmates', 'Saxons', 'Scots', 'Scythians', 'Semites', 'Severians', 'Siberians',
  'Slavs', 'Swedes', 'Thai', 'Tibetans', 'Touareg', 'Tuaregs', 'Tungus', 'Tupis', 'Veps', 'Welsh',
]);

const STATE_WORDS = /\b(states?|kingdoms?|empire|sultanate|caliphate|khanate|republic|dynasty)\b/i;

/** Non-state societies (cultures, peoples) are drawn hatched rather than solid. */
export function isPeoples(name: string): boolean {
  if (STATE_WORDS.test(name)) return false;
  return PEOPLES_NAMES.has(name) || PEOPLES_WORDS.test(name);
}
