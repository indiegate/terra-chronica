// Corrections to anachronistic or mislabelled polygons in historical-basemaps.
// Each rename was checked against the polygon's actual location (see README).
//
//   years   – snapshots the correction applies to
//   from    – NAME in the source data
//   to      – corrected NAME (references in SUBJECTO / PARTOF are renamed too)
//   subject – optional: overlord to set; null = independent
//   why     – the reason, kept for review

export const CORRECTIONS = [
  // ── Ancient ────────────────────────────────────────────────────────────
  { years: [-4000], from: 'Egypt', to: 'Naqada culture', why: 'Egypt was unified c. 3100 BC; 4000 BC is the predynastic Naqada period' },
  { years: [-4000], from: 'Minoan', to: 'Neolithic Crete', why: 'Minoan civilisation begins c. 3100 BC' },
  { years: [-1500], from: 'Greek city-states', to: 'Mycenaean Greece', why: 'City-states (poleis) emerge after c. 800 BC' },
  { years: [-1500], from: 'Kingdom of David and Solomon', to: 'Canaanite city-states', why: 'The United Monarchy dates to c. 1000–930 BC' },
  { years: [-700], from: 'Kingdom of David and Solomon', to: 'Levantine kingdoms', why: 'The United Monarchy split c. 930 BC; Israel fell to Assyria in 722 BC' },
  { years: [-1000, -700], from: 'Hittites', to: 'Syro-Hittite states', why: 'The Hittite Empire collapsed c. 1180 BC' },
  { years: [-400], from: 'Xiongnu', to: 'Slab Grave culture', why: 'The Xiongnu confederation formed c. 209 BC' },
  { years: [-100], from: 'Kushan Empire', to: 'Yuezhi and Indo-Scythians', why: 'The Kushan Empire was founded c. AD 30' },
  { years: [-323, -300, -200], from: 'Teotihuacan', to: 'Basin of Mexico chiefdoms', why: 'Teotihuacan grew into a city from c. 100 BC' },
  { years: [-100], from: 'Mauryan Empire', to: 'Shunga Empire', why: 'The Maurya dynasty ended in 185 BC' },
  { years: [-1], from: 'Moche', to: 'Gallinazo culture', why: 'Moche culture begins c. AD 100' },

  // ── Late antiquity & medieval ──────────────────────────────────────────
  { years: [300], from: 'Parthian Empire', to: 'Sasanian Empire', why: 'The Sasanians overthrew the Parthians in AD 224' },
  { years: [500], from: 'Western Roman Empire', to: 'Romano-British kingdoms', why: 'The Western Empire ended in 476; the polygon covers western Britain' },
  { years: [500], from: 'Jin Empire', to: 'Southern Qi', why: 'The Jin dynasty ended in 420; south China was ruled by the Southern Qi (479–502)' },
  { years: [700], from: 'Sui Empire', to: 'Tang Empire', why: 'The Sui dynasty ended in 618' },
  { years: [700], from: 'Sasanian Empire', to: 'Umayyad Caliphate', why: 'The Sasanian Empire fell to the Arab conquest in 651; the polygon covers Iran and Iraq' },
  { years: [700], from: 'Sasanian dependencies', to: 'Umayyad Caliphate', why: 'Sasanian rule in Yemen ended c. 628; the polygon covers Yemen' },
  { years: [1200], from: 'Mongol Empire', to: 'Mongol tribes', why: 'The Mongol Empire was proclaimed in 1206' },
  { years: [1200], from: 'Toltec Empire', to: 'Chichimec states', why: 'Tula fell c. 1168' },
  { years: [1279, 1300], from: 'Seljuk Caliphate', to: 'Sultanate of Rum', why: 'The Seljuks never held the caliphate; central Anatolia was the Sultanate of Rum (to 1308)' },
  { years: [1400], from: 'Seljuk Caliphate', to: 'Anatolian beyliks', why: 'The Sultanate of Rum ended in 1308' },
  { years: [1300], from: 'Chola Empire', to: 'Pandya state', why: 'The Chola dynasty ended in 1279; the region passed to the Pandyas' },
  { years: [1400], from: 'Chola Empire', to: 'Vijayanagara', why: 'The Chola dynasty ended in 1279; Vijayanagara ruled the region from the 1360s' },
  { years: [1400], from: 'Srivijaya Empire', to: 'Majapahit', why: 'Srivijaya fell to Majapahit in 1377' },
  { years: [1400], from: 'Great Khanate', to: 'Ming Empire and Northern Yuan', subject: null, why: 'The Yuan dynasty fell in 1368; the polygon covers both Ming China and Mongolia' },
  { years: [1400], from: 'Shogun Japan (Kamakura)', to: 'Ashikaga Shogunate', why: 'The Kamakura shogunate ended in 1333' },
  ...['Tibet', 'Novgorod', 'Blue Horde', 'White Horde', 'Chagatai Khanate'].map((n) => ({
    years: [1400], from: n, to: n, subject: null, why: 'No unified Mongol Empire existed in 1400',
  })),

  // ── Early modern ───────────────────────────────────────────────────────
  { years: [1600], from: 'Inca Empire', to: 'Viceroyalty of Peru', subject: 'Spain', why: 'The Inca Empire fell in 1533 (last Neo-Inca stronghold 1572)' },
  { years: [1600], from: 'Songhai', to: 'Pashalik of Timbuktu', subject: 'Morocco', why: 'The Songhai Empire fell to Morocco in 1591; the polygon covers the Niger bend around Gao and Timbuktu' },
  { years: [1650, 1700, 1715, 1783, 1800], from: 'Songhai', to: 'Dendi Kingdom', why: 'The Songhai Empire fell in 1591; its successor in the south was Dendi' },
  { years: [1700, 1715], from: 'Mali', to: 'Kangaba (Mali remnant)', why: 'The Mali Empire broke up c. 1670' },
  { years: [1783, 1800, 1815], from: 'Zulu', to: 'Northern Nguni chiefdoms', why: 'The Zulu Kingdom was founded by Shaka in 1816' },
  { years: [1650, 1700, 1715, 1815, 1880, 1900], from: 'Manchu Empire', to: 'Qing Empire', why: 'Same state is called "Qing Empire" in other snapshots' },

  // ── Modern ─────────────────────────────────────────────────────────────
  { years: [1914], from: 'Manchu Empire', to: 'Republic of China', why: 'The Qing dynasty ended in 1912' },
  { years: [1945], from: 'Mali', to: 'French Sudan', why: 'Mali became independent in 1960' },
  { years: [1945], from: 'Zaire', to: 'Belgian Congo', subject: 'Belgium', why: 'Independent in 1960; renamed Zaire only in 1971' },
  { years: [1960], from: 'Zaire', to: 'Republic of the Congo (Léopoldville)', why: 'Renamed Zaire in 1971' },
  { years: [1920], from: 'USSR', to: 'Russian SFSR', why: 'The USSR was founded in December 1922' },
  ...['Georgia', 'Armenia', 'Azerbaijan'].map((n) => ({
    years: [1920], from: n, to: n, subject: null, why: 'Independent in early 1920; joined the USSR at its founding in 1922',
  })),
  { years: [1930], from: 'White Russia', to: 'USSR', why: 'The whole Soviet Union was mislabelled with the name of Belarus' },
  { years: [1930], from: 'Far Eastern SSR', to: 'USSR', why: 'The Far Eastern Republic joined Soviet Russia in 1922' },
  { years: [1994, 2000, 2010], from: 'Byelarus', to: 'Belarus', why: 'Official name since 1991' },
  { years: [1994, 2000], from: 'Serbia', to: 'FR Yugoslavia', why: 'Serbia and Montenegro formed one state until 2006' },
  { years: [1994, 2000], from: 'Montenegro', to: 'FR Yugoslavia', why: 'Serbia and Montenegro formed one state until 2006' },
  { years: [2000, 2010], from: 'Zaire', to: 'DR Congo', why: 'Renamed in 1997' },
  { years: [2000, 2010], from: 'Hong Kong', to: 'Hong Kong', subject: 'China', why: 'Returned to China in 1997' },
];

// Polygons dropped entirely: not polities, and only named in some snapshots,
// so they flicker in and out as a "country" when scrubbing.
export const REMOVALS = [
  { years: [1945, 1960], name: 'Antarctica', why: 'Never a state; the land is drawn by the coastline layer at every date' },
];

// Modern snapshots use Natural Earth 1:10m country shapes. These Natural Earth
// countries keep their own name (or take a fixed one) instead of the source's.
export const MODERN_OVERRIDES = {
  1994: { 'Timor-Leste': 'Indonesia', 'S. Sudan': 'Sudan', Kosovo: 'FR Yugoslavia', Macao: 'Macao' },
  2000: { 'Timor-Leste': 'East Timor', 'S. Sudan': 'Sudan', Kosovo: 'FR Yugoslavia', Macao: 'Macao' },
  2010: { 'Timor-Leste': 'Timor-Leste', 'S. Sudan': 'Sudan', Kosovo: 'Kosovo', Macao: 'Macao' },
};

export const MODERN_SUBJECTS = {
  1994: { Macao: 'Portugal', 'Hong Kong': 'United Kingdom', 'East Timor': null },
  2000: { Macao: 'China', 'East Timor': 'United Nations' },
  2010: { Macao: 'China' },
};
