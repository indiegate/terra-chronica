// Curated metadata for major civilisations. Borders come from the
// historical-basemaps snapshots; `match` lists the polygon NAMEs in those
// snapshots that belong to each civilisation. A polygon is linked only when the
// snapshot year falls within the civilisation's own start–end dates.

import { areasFor, type Area } from './regions';
import { NOTES, NOTE_EVENTS } from './notes';
import UMBRELLA from './notes/umbrella.json';

export interface Capital {
  name: string;
  lon: number;
  lat: number;
  from: number;
  to: number;
}

export interface Civilisation {
  id: string;
  name: string;
  start: number; // negative = BC
  end: number;
  peak: number;
  capitals: Capital[];
  /** Shown in the info panel. */
  region: string;
  /** World areas the note covers (see regions.ts). */
  areas: Area[];
  match: string[];
  summary: string;
  /** Where to fly to for cultures without a capital (a key site), [lon, lat]. */
  place?: [number, number];
  /**
   * Umbrella notes: unclaimed polygons whose largest part lies in `box`
   * ([lon0, lat0, lon1, lat1]) between `from` and `to` (default: the note's
   * dates) are linked to this note (scripts/umbrella.ts).
   */
  covers?: { box: [number, number, number, number]; from?: number; to?: number };
}

export type CapitalInput = [name: string, lon: number, lat: number, from?: number, to?: number];
/** As written in the data files: capitals as tuples, areas usually derived from the region. */
export type CivInput = Omit<Civilisation, 'capitals' | 'areas'> & { capitals: CapitalInput[]; areas?: Area[] };

const DATA: CivInput[] = [
  // ── Cradles of civilisation ──────────────────────────────────────────
  { id: 'sumer', name: 'Sumer', start: -4500, end: -1900, peak: -2500, region: 'Mesopotamia',
    capitals: [['Uruk', 45.64, 31.32, -4500, -2112], ['Ur', 46.1, 30.96, -2112, -1900]],
    match: ['Ur', 'city-states'],
    summary: 'The first urban civilisation of southern Mesopotamia. Sumerians developed cuneiform writing, large-scale irrigation, early wheeled vehicles and some of the earliest monumental temples (ziggurats).' },
  { id: 'egypt', name: 'Ancient Egypt', start: -3100, end: -30, peak: -1450, region: 'North Africa',
    capitals: [['Memphis', 31.25, 29.85, -3100, -2055], ['Thebes', 32.64, 25.7, -2055, -1070], ['Tanis', 31.88, 30.98, -1070, -664], ['Sais', 30.77, 30.97, -664, -332]],
    match: ['Egypt'],
    summary: 'A Nile-valley state unified around 3100 BC that endured for three millennia through the Old, Middle and New Kingdoms, leaving pyramids, hieroglyphic writing and a remarkably stable culture.' },
  { id: 'indus', name: 'Indus Valley Civilisation', start: -3300, end: -1300, peak: -2500, region: 'South Asia',
    capitals: [['Mohenjo-daro', 68.14, 27.33]], match: ['Indus valley civilization'],
    summary: 'A Bronze Age culture of planned cities with grid streets, drainage and standardised weights. Its script remains undeciphered.' },
  { id: 'elam', name: 'Elam', start: -3200, end: -539, peak: -1200, region: 'Iran',
    capitals: [['Susa', 48.25, 32.19]], match: ['Elam'],
    summary: 'An ancient kingdom in south-western Iran, long a rival and partner of the Mesopotamian states before its absorption by the Persians.' },
  { id: 'minoan', name: 'Minoan Crete', start: -3100, end: -1100, peak: -1700, region: 'Aegean',
    capitals: [['Knossos', 25.16, 35.3]], match: ['Minoan'],
    summary: 'A seafaring Bronze Age culture on Crete known for palace complexes, vivid frescoes and the Linear A script.' },
  { id: 'norte-chico', name: 'Norte Chico (Caral)', start: -3500, end: -1800, peak: -2600, region: 'Andes',
    capitals: [['Caral', -77.52, -10.89]], match: ['Norte Chico'],
    summary: 'The oldest known civilisation in the Americas, building monumental platform mounds on the Peruvian coast before the use of pottery.' },
  { id: 'xia-shang', name: 'Xia & Shang China', start: -2070, end: -1046, peak: -1250, region: 'East Asia',
    capitals: [['Erlitou', 112.69, 34.7, -2070, -1600], ['Zhengzhou (Ao)', 113.65, 34.76, -1600, -1300], ['Yin (Anyang)', 114.32, 36.12, -1300, -1046]],
    match: ['Xia', 'Shang', 'Sinic'],
    summary: 'The earliest Chinese dynasties of the Yellow River. The Xia is known mainly from later texts and its existence is debated; the Shang left oracle bones, the earliest Chinese writing, and sophisticated bronze casting.' },
  { id: 'hittites', name: 'Hittite Empire', start: -1650, end: -1180, peak: -1300, region: 'Anatolia',
    capitals: [['Hattusa', 34.61, 40.02]], match: ['Hittites'],
    summary: 'An Anatolian power that rivalled Egypt, fought at Kadesh and concluded one of the earliest recorded peace treaties.' },
  { id: 'babylon', name: 'Babylonia', start: -1894, end: -539, peak: -1750, region: 'Mesopotamia',
    capitals: [['Babylon', 44.42, 32.54]], match: ['Babylonia'],
    summary: 'Home of Hammurabi’s law code and later Nebuchadnezzar’s great city; a centre of astronomy and mathematics.' },
  { id: 'assyria', name: 'Assyria', start: -2025, end: -609, peak: -670, region: 'Mesopotamia',
    capitals: [['Assur', 43.26, 35.46, -2025, -879], ['Nimrud', 43.33, 36.1, -879, -705], ['Nineveh', 43.15, 36.36, -705, -612], ['Harran', 39.03, 36.86, -612, -609]],
    match: ['Assyria'],
    summary: 'A militaristic Mesopotamian empire that at its height ruled from Egypt to Iran, famed for its palaces and the library of Ashurbanipal.' },
  { id: 'olmec', name: 'Olmec', start: -1600, end: -350, peak: -900, region: 'Mesoamerica',
    capitals: [['San Lorenzo', -94.76, 17.75, -1600, -900], ['La Venta', -94.04, 18.1, -900, -350]],
    match: ['Olmec'],
    summary: 'The “mother culture” of Mesoamerica, known for colossal stone heads and early ball-game and calendar traditions.' },
  { id: 'kush', name: 'Kingdom of Kush', start: -2500, end: 350, peak: -700, region: 'Nubia',
    capitals: [['Kerma', 30.41, 19.6, -2500, -1500], ['Napata', 31.83, 18.53, -1070, -590], ['Meroë', 33.75, 16.94, -590, 350]],
    match: ['Kush', 'Kerma', 'Meroe'],
    summary: 'Rooted in the Kerma culture, this Nubian kingdom south of Egypt produced kings who ruled Egypt as its 25th dynasty; it was later famed for iron-working and the pyramids of Meroë.' },
  { id: 'chavin', name: 'Chavín', start: -900, end: -200, peak: -500, region: 'Andes',
    capitals: [['Chavín de Huántar', -77.18, -9.59]], match: ['Chavin'],
    summary: 'An Andean religious culture whose temple centre spread a shared art style across much of Peru.' },
  { id: 'zhou', name: 'Zhou China', start: -1046, end: -256, peak: -950, region: 'East Asia',
    capitals: [['Haojing', 108.77, 34.23, -1046, -771], ['Luoyang', 112.45, 34.62, -771, -256]],
    match: ['Sinic', 'Zhou', 'Zhou states', 'Northern Chinese states and pastoralists'],
    summary: 'The longest-lasting Chinese dynasty. The Zhou justified their rule by the Mandate of Heaven; in the Eastern Zhou, royal power faded while rival states fought, the age of Confucius and Laozi.' },

  // ── Classical antiquity ──────────────────────────────────────────────
  { id: 'greece', name: 'Greek City-States', start: -800, end: -146, peak: -430, region: 'Aegean',
    capitals: [['Athens', 23.73, 37.98]], match: ['Greek city-states', 'Greek colonies'],
    summary: 'Independent poleis such as Athens and Sparta that gave rise to democracy, philosophy, drama and the Olympic Games.' },
  { id: 'achaemenid', name: 'Achaemenid Persia', start: -550, end: -330, peak: -500, region: 'Iran',
    capitals: [['Pasargadae', 53.18, 30.2, -550, -518], ['Persepolis', 52.89, 29.93, -518, -330]],
    match: ['Achaemenid Empire'],
    summary: 'Founded by Cyrus the Great, the first Persian empire was the largest the world had yet seen, linked by the Royal Road.' },
  { id: 'alexander', name: 'Empire of Alexander', start: -336, end: -323, peak: -323, region: 'Near East',
    capitals: [['Pella', 22.52, 40.76, -336, -331], ['Babylon', 44.42, 32.54, -331, -323]],
    match: ['Empire of Alexander', 'Macedon and Hellenic League'],
    summary: 'Alexander of Macedon conquered Persia and reached India in just over a decade; his empire split among his generals at his death.' },
  { id: 'seleucid', name: 'Seleucid Empire', start: -312, end: -63, peak: -300, region: 'Near East',
    capitals: [['Seleucia', 44.52, 33.1, -312, -240], ['Antioch', 36.16, 36.2, -240, -63]],
    match: ['Seleucid Kingdom'],
    summary: 'The largest successor state of Alexander’s empire, spreading Hellenistic culture from Syria to Central Asia.' },
  { id: 'ptolemaic', name: 'Ptolemaic Egypt', start: -305, end: -30, peak: -250, region: 'North Africa',
    capitals: [['Alexandria', 29.92, 31.2]], match: ['Ptolemaic Kingdom'],
    summary: 'The Greek dynasty of Egypt, patrons of the Library of Alexandria; its last ruler was Cleopatra VII.' },
  { id: 'carthage', name: 'Carthage', start: -814, end: -146, peak: -300, region: 'Mediterranean', areas: ['North Africa'],
    capitals: [['Carthage', 10.32, 36.85]], match: ['Carthaginian Empire', 'Carthage'],
    summary: 'A Phoenician colony that became a western Mediterranean trading empire and Rome’s great rival in the Punic Wars.' },
  { id: 'rome', name: 'Rome', start: -509, end: 476, peak: 117, region: 'Mediterranean', areas: ['Europe', 'Near East', 'North Africa'],
    capitals: [['Rome', 12.5, 41.9, -509, 402], ['Ravenna', 12.2, 44.42, 402, 476]],
    match: ['Rome', 'Roman Republic', 'Roman Empire', 'Western Roman Empire', 'Rome (Constantinus)', 'Rome (Maximian)', 'Rome (Galerius)', 'Rome (Diocletianus)'],
    summary: 'From republic to empire, Rome united the Mediterranean world, leaving law, roads, Latin and a template for later states.' },
  { id: 'maurya', name: 'Maurya Empire', start: -322, end: -185, peak: -250, region: 'South Asia',
    capitals: [['Pataliputra', 85.14, 25.6]], match: ['Mauryan Empire', 'Hindu kingdoms and republics'],
    summary: 'The first empire to unify most of the Indian subcontinent; under Ashoka it promoted Buddhism through rock-cut edicts.' },
  { id: 'qin-han', name: 'Qin & Han China', start: -221, end: 220, peak: -100, region: 'East Asia',
    capitals: [['Xianyang', 108.71, 34.33, -221, -206], ['Chang’an', 108.94, 34.26, -202, 25], ['Luoyang', 112.45, 34.62, 25, 220]],
    match: ['Han Empire', 'Han'],
    summary: 'The Qin unified China in 221 BC; the Han that followed opened the Silk Road and gave its name to the Chinese people.' },
  { id: 'parthia', name: 'Parthian Empire', start: -247, end: 224, peak: 1, region: 'Iran',
    capitals: [['Nisa', 58.21, 37.95, -247, -129], ['Ctesiphon', 44.58, 33.09, -129, 224]],
    match: ['Parthia', 'Parthian Empire'],
    summary: 'An Iranian empire of horse archers that checked Roman expansion in the east and controlled Silk Road trade.' },
  { id: 'xiongnu', name: 'Xiongnu', start: -209, end: 93, peak: -150, region: 'Steppe',
    capitals: [['Longcheng (site uncertain)', 102.8, 47.2]], match: ['Xiongnu', 'Southern Xiongnu', 'Turcik tribes'],
    summary: 'A nomadic confederation of the eastern steppe whose raids shaped Han China’s frontier policy, from wall-building to marriage alliances.' },
  { id: 'kushan', name: 'Kushan Empire', start: 30, end: 375, peak: 150, region: 'Central Asia',
    capitals: [['Purushapura', 71.57, 34.01]], match: ['Kushan Empire'],
    summary: 'A crossroads empire linking Rome, Persia, India and China; patron of Gandharan Greco-Buddhist art.' },
  { id: 'axum', name: 'Kingdom of Aksum', start: -50, end: 940, peak: 350, region: 'East Africa',
    capitals: [['Aksum', 38.72, 14.13]], match: ['Axum', 'Ethiopian Highland Peoples'],
    summary: 'A Red Sea trading power famed for its towering stelae and early adoption of Christianity in the 4th century.' },
  { id: 'teotihuacan', name: 'Teotihuacan', start: -100, end: 550, peak: 450, region: 'Mesoamerica',
    capitals: [['Teotihuacan', -98.84, 19.69]], match: ['Teotihuacan'],
    summary: 'One of the largest cities of the ancient world, built around the Pyramids of the Sun and Moon.' },
  { id: 'maya', name: 'Maya', start: -750, end: 1697, peak: 750, region: 'Mesoamerica',
    capitals: [['Tikal', -89.62, 17.22, -750, 900], ['Chichén Itzá', -88.57, 20.68, 900, 1220], ['Mayapán', -89.46, 20.63, 1220, 1450], ['Nojpetén', -89.89, 16.93, 1450, 1697]],
    match: ['Maya chiefdoms and states', 'Maya states', 'Maya city-states'],
    summary: 'A network of city-states in the Yucatán with a fully developed writing system, advanced astronomy and a sophisticated calendar.' },
  { id: 'moche', name: 'Moche', start: 100, end: 800, peak: 500, region: 'Andes',
    capitals: [['Huacas de Moche', -78.99, -8.13]], match: ['Moche'],
    summary: 'A north-coast Peruvian culture of irrigation engineers and master potters.' },

  // ── Late antiquity & medieval ────────────────────────────────────────
  { id: 'sasanian', name: 'Sasanian Empire', start: 224, end: 651, peak: 620, region: 'Iran',
    capitals: [['Ctesiphon', 44.58, 33.09]], match: ['Sasanian Empire', 'Sasanian dependencies', 'Persia'],
    summary: 'The last pre-Islamic Persian empire, a great rival of Rome and Byzantium and a patron of Zoroastrianism.' },
  { id: 'gupta', name: 'Gupta Empire', start: 240, end: 550, peak: 400, region: 'South Asia',
    capitals: [['Pataliputra', 85.14, 25.6]], match: ['Gupta Empire'],
    summary: 'From a small kingdom founded around 240, Chandragupta I (from 320) and his successors built an empire across northern India: its classical “golden age” of Aryabhata’s mathematics and astronomy, Kalidasa’s poetry, and a flowering of Hindu and Buddhist art.' },
  { id: 'byzantium', name: 'Byzantine Empire', start: 395, end: 1453, peak: 555, region: 'Mediterranean', areas: ['Europe', 'Near East'],
    capitals: [['Constantinople', 28.98, 41.01, 395, 1204], ['Nicaea', 29.72, 40.43, 1204, 1261], ['Constantinople', 28.98, 41.01, 1261, 1453]],
    match: ['Eastern Roman Empire', 'Byzantine Empire'],
    summary: 'The eastern half of the Roman Empire, which survived a thousand years after the fall of the west and preserved Greek learning.' },
  { id: 'ghana', name: 'Ghana Empire', start: 300, end: 1240, peak: 1000, region: 'West Africa',
    capitals: [['Koumbi Saleh', -7.99, 15.77]], match: ['Empire of Ghana'],
    summary: 'The “land of gold”, a Sahelian empire that grew rich from trans-Saharan trade in gold and salt.' },
  { id: 'franks', name: 'Frankish Realm', start: 481, end: 987, peak: 814, region: 'Western Europe',
    capitals: [['Tournai', 3.39, 50.61, 481, 508], ['Paris', 2.35, 48.86, 508, 794], ['Aachen', 6.08, 50.78, 794, 888]],
    match: ['Franks', 'Frankish Kingdom', 'Carolingian Empire', 'Neustria', 'Carolingian Empire', 'East Francia', 'West Francia'],
    summary: 'The kingdom of Clovis and Charlemagne, crowned emperor in 800, which laid the foundations of France and Germany.' },
  { id: 'sui-tang', name: 'Sui & Tang China', start: 581, end: 907, peak: 700, region: 'East Asia',
    capitals: [['Chang’an', 108.94, 34.26]], match: ['Sui Empire', 'Tang Empire'],
    summary: 'A cosmopolitan era of Chinese reunification: the Grand Canal, civil examinations and a flowering of poetry.' },
  { id: 'tibet', name: 'Tibetan Empire', start: 618, end: 842, peak: 790, region: 'Central Asia',
    capitals: [['Lhasa', 91.13, 29.65]], match: ['Tibetan Empire', 'Tufan Empire'],
    summary: 'A high-plateau empire that briefly captured Chang’an and contested the Silk Road with Tang China.' },
  { id: 'caliphate', name: 'Islamic Caliphates', start: 632, end: 1258, peak: 740, region: 'Near East', areas: ['Near East', 'Iran', 'North Africa'],
    capitals: [['Medina', 39.61, 24.47, 632, 661], ['Damascus', 36.29, 33.51, 661, 750], ['Kufa', 44.4, 32.03, 750, 762], ['Baghdad', 44.37, 33.31, 762, 1258]],
    match: ['Umayyad Caliphate', 'Abbasid Caliphate'],
    summary: 'The Umayyad and Abbasid caliphates stretched from Iberia to the Indus; Abbasid Baghdad’s House of Wisdom became a centre of learning.' },
  { id: 'khazars', name: 'Khazar Khaganate', start: 600, end: 1016, peak: 850, region: 'Steppe',
    capitals: [['Atil (site uncertain)', 47.9, 46.4]], match: ['Khazars'],
    summary: 'A Turkic steppe power between the Black and Caspian seas whose elite adopted Judaism.' },
  { id: 'tiwanaku', name: 'Tiwanaku & Wari', start: 500, end: 1000, peak: 750, region: 'Andes',
    capitals: [['Tiwanaku', -68.67, -16.55]], match: ['Tiahuanaco Empire', 'Huari Empire'],
    summary: 'Two separate highland Andean states that preceded the Inca, known for monumental stonework and road networks.' },
  { id: 'srivijaya', name: 'Srivijaya', start: 650, end: 1377, peak: 1000, region: 'Southeast Asia',
    capitals: [['Palembang', 104.75, -2.99]], match: ['Srivijaya Empire'],
    summary: 'A Buddhist maritime empire controlling the Strait of Malacca and the spice trade.' },
  { id: 'khmer', name: 'Khmer Empire', start: 802, end: 1431, peak: 1200, region: 'Southeast Asia',
    capitals: [['Angkor', 103.87, 13.41]], match: ['Khmer Empire'],
    summary: 'Builders of Angkor Wat, the Khmer ran a vast hydraulic city and dominated mainland Southeast Asia.' },
  { id: 'kievan-rus', name: 'Kievan Rus’', start: 800, end: 1240, peak: 1050, region: 'Eastern Europe',
    capitals: [['Kyiv', 30.52, 50.45]], match: ['Kyivan Rus', 'Kievan Rus', 'Other Rus Principalities', "Rus' Khaganate"],
    summary: 'A federation of East Slavic principalities founded by Varangian rulers, which adopted Orthodox Christianity in 988.' },
  { id: 'hre', name: 'Holy Roman Empire', start: 962, end: 1806, peak: 1200, region: 'Central Europe',
    capitals: [['Aachen (coronations)', 6.08, 50.78, 962, 1346], ['Prague', 14.42, 50.09, 1346, 1438], ['Vienna', 16.37, 48.21, 1438, 1806]],
    match: ['Holy Roman Empire'],
    summary: 'A complex union of German, Italian and Central European territories under an elected emperor, with no fixed capital for most of its history.' },
  { id: 'song', name: 'Song China', start: 960, end: 1279, peak: 1100, region: 'East Asia',
    capitals: [['Kaifeng', 114.31, 34.8, 960, 1127], ['Hangzhou', 120.15, 30.27, 1127, 1279]],
    match: ['Song Empire'],
    summary: 'A commercial and technological high point: paper money, movable type, the compass and gunpowder weapons.' },
  { id: 'fatimid', name: 'Fatimid Caliphate', start: 909, end: 1171, peak: 1000, region: 'North Africa',
    capitals: [['Mahdia', 11.06, 35.5, 909, 973], ['Cairo', 31.24, 30.04, 973, 1171]],
    match: ['Fatimid Caliphate'],
    summary: 'A Shia caliphate that founded Cairo and the al-Azhar mosque-university.' },
  { id: 'chola', name: 'Chola Empire', start: 848, end: 1279, peak: 1030, region: 'South Asia',
    capitals: [['Thanjavur', 79.13, 10.79, 848, 1025], ['Gangaikonda Cholapuram', 79.45, 11.21, 1025, 1279]],
    match: ['Chola', 'Cholas', 'Chola Empire'],
    summary: 'A Tamil thalassocracy that projected naval power across the Bay of Bengal as far as Srivijaya.' },
  { id: 'toltec', name: 'Toltec', start: 900, end: 1168, peak: 1000, region: 'Mesoamerica',
    capitals: [['Tula', -99.34, 20.06]], match: ['Toltec Empire'],
    summary: 'A warrior culture of central Mexico whose capital Tula was later revered by the Aztecs.' },
  { id: 'seljuk', name: 'Seljuk Empire', start: 1037, end: 1194, peak: 1090, region: 'Near East',
    capitals: [['Nishapur', 58.8, 36.21, 1037, 1051], ['Isfahan', 51.67, 32.65, 1051, 1118], ['Merv', 62.19, 37.66, 1118, 1157], ['Hamadan', 48.52, 34.8, 1157, 1194]],
    match: ['Seljuk Empire'],
    summary: 'Turkic rulers of Persia and Anatolia whose victory at Manzikert (1071) opened Anatolia to Turkish settlement.' },
  { id: 'mongol', name: 'Mongol Empire', start: 1206, end: 1368, peak: 1279, region: 'Eurasia', areas: ['Steppe & Central Asia', 'China', 'Iran'],
    capitals: [['Karakorum', 102.83, 47.2, 1235, 1264], ['Khanbaliq', 116.4, 39.9, 1264, 1368]],
    match: ['Great Khanate', 'Ilkhanate', 'Khanate of the Golden Horde', 'Chagatai Khanate'],
    summary: 'Founded by Genghis Khan, the largest contiguous land empire in history, stretching from Korea to Eastern Europe.' },
  { id: 'mali', name: 'Mali Empire', start: 1235, end: 1670, peak: 1330, region: 'West Africa',
    capitals: [['Niani (site debated)', -8.4, 11.4]], match: ['Mali'],
    summary: 'The empire of Sundiata and Mansa Musa, whose pilgrimage to Mecca became legendary for its wealth; Timbuktu flourished as a centre of scholarship.' },
  { id: 'great-zimbabwe', name: 'Great Zimbabwe', start: 1000, end: 1450, peak: 1350, region: 'Southern Africa',
    capitals: [['Great Zimbabwe', 30.93, -20.27]], match: ['Great Zimbabwe'],
    summary: 'A Shona kingdom whose dry-stone city controlled gold trade with the Swahili coast.' },
  { id: 'delhi', name: 'Delhi Sultanate', start: 1206, end: 1526, peak: 1330, region: 'South Asia',
    capitals: [['Delhi', 77.21, 28.61]], match: ['Sultanate of Delhi'],
    summary: 'A succession of Turkic and Afghan dynasties that ruled northern India and repelled Mongol invasions.' },
  { id: 'mamluk', name: 'Mamluk Sultanate', start: 1250, end: 1517, peak: 1300, region: 'Near East',
    capitals: [['Cairo', 31.24, 30.04]], match: ['Mamluke Sultanate'],
    summary: 'A regime of slave-soldiers that halted the Mongols at Ain Jalut (1260) and ruled Egypt and Syria.' },
  { id: 'chimu', name: 'Chimú', start: 900, end: 1470, peak: 1400, region: 'Andes',
    capitals: [['Chan Chan', -79.07, -8.11]], match: ['Chimú Empire'],
    summary: 'A coastal Andean kingdom whose adobe capital Chan Chan was the largest city in pre-Columbian South America.' },
  { id: 'vijayanagara', name: 'Vijayanagara Empire', start: 1336, end: 1652, peak: 1520, region: 'South Asia',
    capitals: [['Vijayanagara (Hampi)', 76.46, 15.33, 1336, 1565], ['Penukonda', 77.59, 14.08, 1565, 1592], ['Chandragiri', 79.31, 13.58, 1592, 1646]],
    match: ['Vijayanagara'],
    summary: 'The great Hindu empire of the Deccan; its capital at Hampi was among the largest cities in the world until it was sacked in 1565.' },

  // ── Early modern ─────────────────────────────────────────────────────
  { id: 'ottoman', name: 'Ottoman Empire', start: 1299, end: 1922, peak: 1683, region: 'Near East', areas: ['Near East', 'Europe', 'North Africa'],
    capitals: [['Söğüt', 30.18, 40.02, 1299, 1326], ['Bursa', 29.06, 40.19, 1326, 1365], ['Edirne', 26.56, 41.68, 1365, 1453], ['Constantinople', 28.98, 41.01, 1453, 1922]],
    match: ['Ottoman Empire', 'Ottoman Sultanate', 'Ottoman Egypt'],
    summary: 'A Turkish dynasty that took Constantinople in 1453 and ruled across three continents for six centuries.' },
  { id: 'timurid', name: 'Timurid Empire', start: 1370, end: 1507, peak: 1405, region: 'Central Asia',
    capitals: [['Samarkand', 66.96, 39.65, 1370, 1409], ['Herat', 62.2, 34.35, 1409, 1507]],
    match: ['Timurid Empire', 'Timurid Emirates'],
    summary: 'The conquests of Timur (Tamerlane) and a Persianate renaissance of art and astronomy in Samarkand and Herat.' },
  { id: 'ming', name: 'Ming China', start: 1368, end: 1644, peak: 1450, region: 'East Asia',
    capitals: [['Nanjing', 118.8, 32.06, 1368, 1421], ['Beijing', 116.4, 39.9, 1421, 1644]],
    match: ['Ming Empire and Northern Yuan', 'Ming Empire', 'Ming Chinese Empire'],
    summary: 'The dynasty of the Forbidden City, Zheng He’s treasure fleets and the rebuilt Great Wall.' },
  { id: 'aztec', name: 'Aztec Empire', start: 1428, end: 1521, peak: 1519, region: 'Mesoamerica',
    capitals: [['Tenochtitlan', -99.13, 19.43]], match: ['Aztec Empire', 'Mexihcah (Triple Alliance)'],
    summary: 'The Triple Alliance centred on Tenochtitlan, an island city of canals and temples conquered by Cortés.' },
  { id: 'inca', name: 'Inca Empire', start: 1438, end: 1533, peak: 1527, region: 'Andes',
    capitals: [['Cusco', -71.97, -13.53]], match: ['Inca Empire', 'Quechua'],
    summary: 'Tawantinsuyu, the largest empire of the pre-Columbian Americas, bound together by roads, runners and quipu records.' },
  { id: 'songhai', name: 'Songhai Empire', start: 1464, end: 1591, peak: 1520, region: 'West Africa',
    capitals: [['Gao', -0.04, 16.27]], match: ['Songhai'],
    summary: 'The largest of the Sahelian empires, ruling the Niger bend until a Moroccan invasion in 1591.' },
  { id: 'spain', name: 'Spanish Empire', start: 1492, end: 1898, peak: 1790, region: 'Global', areas: ['Europe'],
    capitals: [['Toledo', -4.02, 39.86, 1492, 1561], ['Madrid', -3.7, 40.42, 1561, 1898]],
    match: ['Spain', 'Castille', 'Cuba (Spain)', 'Hispaniola (Spain)', 'Florida (Spain)'],
    summary: 'One of the first global empires, spanning the Americas, the Philippines and parts of Europe.' },
  { id: 'portugal', name: 'Portuguese Empire', start: 1415, end: 1999, peak: 1600, region: 'Global', areas: ['Europe'],
    capitals: [['Lisbon', -9.14, 38.72, 1415, 1808], ['Rio de Janeiro', -43.17, -22.91, 1808, 1821], ['Lisbon', -9.14, 38.72, 1821, 1999]],
    match: ['Portugal', 'Portuguese East Africa'],
    summary: 'A pioneering maritime empire of trading posts from Brazil to Macau that lasted nearly six centuries.' },
  { id: 'safavid', name: 'Safavid Persia', start: 1501, end: 1736, peak: 1600, region: 'Iran',
    capitals: [['Tabriz', 46.29, 38.08, 1501, 1555], ['Qazvin', 50.0, 36.27, 1555, 1598], ['Isfahan', 51.67, 32.65, 1598, 1736]],
    match: ['Safavid Empire'],
    summary: 'The dynasty that made Twelver Shia Islam the religion of Iran and built the splendours of Isfahan.' },
  { id: 'mughal', name: 'Mughal Empire', start: 1526, end: 1857, peak: 1700, region: 'South Asia',
    capitals: [['Agra', 78.01, 27.18, 1526, 1571], ['Fatehpur Sikri', 77.66, 27.09, 1571, 1585], ['Lahore', 74.34, 31.55, 1585, 1598], ['Agra', 78.01, 27.18, 1598, 1648], ['Delhi', 77.23, 28.66, 1648, 1857]],
    match: ['Mughal Empire'],
    summary: 'A Persianate dynasty that ruled most of South Asia and built the Taj Mahal.' },
  { id: 'russia', name: 'Russian Empire', start: 1547, end: 1917, peak: 1866, region: 'Eurasia', areas: ['Europe', 'Steppe & Central Asia'],
    capitals: [['Moscow', 37.62, 55.76, 1547, 1712], ['St Petersburg', 30.32, 59.94, 1712, 1728], ['Moscow', 37.62, 55.76, 1728, 1732], ['St Petersburg', 30.32, 59.94, 1732, 1917]],
    match: ['Tsardom of Muscovy', 'Russian Empire'],
    summary: 'From the Tsardom of Muscovy to a transcontinental empire reaching the Pacific and Alaska.' },
  { id: 'qing', name: 'Qing China', start: 1644, end: 1912, peak: 1790, region: 'East Asia',
    capitals: [['Beijing', 116.4, 39.9]], match: ['Qing Empire'],
    summary: 'The last imperial dynasty of China, founded by the Manchus, which roughly doubled China’s territory.' },
  { id: 'polish-lithuanian', name: 'Polish–Lithuanian Commonwealth', start: 1569, end: 1795, peak: 1619, region: 'Eastern Europe',
    capitals: [['Kraków', 19.94, 50.06, 1569, 1596], ['Warsaw', 21.01, 52.23, 1596, 1795]],
    match: ['Poland-Lithuania', 'Polish–Lithuanian Commonwealth', 'Poland'],
    summary: 'A vast elective monarchy with a powerful noble parliament, among the largest states of early-modern Europe.' },
  { id: 'britain', name: 'British Empire', start: 1707, end: 1997, peak: 1920, region: 'Global', areas: ['Europe'],
    capitals: [['London', -0.13, 51.51]],
    match: ['United Kingdom', 'United Kingdom of Great Britain and Ireland', 'British Raj', 'British American colonies', 'Acadian Peninsula (UK)'],
    summary: 'At its height the largest empire in history, covering nearly a quarter of the world’s land.' },
  { id: 'usa', name: 'United States', start: 1776, end: 2010, peak: 2000, region: 'North America',
    capitals: [['Philadelphia', -75.17, 39.95, 1776, 1800], ['Washington', -77.04, 38.9, 1800, 2010]],
    match: ['United States of America', 'United States'],
    summary: 'A federal republic born of revolution in 1776 that expanded across the continent and became a global power.' },
  { id: 'ussr', name: 'Soviet Union', start: 1922, end: 1991, peak: 1960, region: 'Eurasia', areas: ['Europe', 'Steppe & Central Asia'],
    capitals: [['Moscow', 37.62, 55.76]], match: ['USSR'],
    summary: 'A one-party socialist federation that spanned eleven time zones and rivalled the United States in the Cold War.' },
];

export const CIVILISATIONS: Civilisation[] = [...DATA, ...NOTES].map((c) => ({
  ...c,
  areas: areasFor(c.id, c.region, c.areas),
  match: [...c.match, ...((UMBRELLA as Record<string, string[]>)[c.id] ?? [])],
  capitals: c.capitals.map(([name, lon, lat, from = c.start, to = c.end]) => ({ name, lon, lat, from, to })),
}));

/** The civilisation's seat of government in `year`, if it had one then. */
export function capitalAt(c: Civilisation, year: number): Capital | undefined {
  return c.capitals.find((k) => year >= k.from && (year < k.to || (year === k.to && k.to === c.end)));
}

const byMatch = new Map<string, Civilisation[]>();
for (const c of CIVILISATIONS) for (const n of c.match) {
  const key = n.toLowerCase();
  byMatch.set(key, [...(byMatch.get(key) ?? []), c]);
}

/** Curated civilisation for a basemap polygon name in a given year. */
export function civFor(name: string | null | undefined, year: number): Civilisation | undefined {
  if (!name) return undefined;
  return byMatch.get(name.trim().toLowerCase())?.find((c) => year >= c.start && year <= c.end);
}

export interface Era { name: string; start: number; end: number }

export const ERAS: Era[] = [
  { name: 'Mesolithic', start: -10000, end: -8000 },
  { name: 'Neolithic', start: -8000, end: -3300 },
  { name: 'Bronze Age', start: -3300, end: -1200 },
  { name: 'Iron Age', start: -1200, end: -500 },
  { name: 'Classical', start: -500, end: 500 },
  { name: 'Medieval', start: 500, end: 1500 },
  { name: 'Early Modern', start: 1500, end: 1800 },
  { name: 'Modern', start: 1800, end: 2010 },
];

export interface HistoricEvent {
  year: number;
  label: string;
  /** Where it happened; 'World' for events with no single place. */
  area: Area | 'World';
}

export const EVENTS: HistoricEvent[] = [
  { year: -9500, label: 'Göbekli Tepe raised', area: 'Near East' },
  { year: -8000, label: 'Farming spreads from the Fertile Crescent', area: 'Near East' },
  { year: -3200, label: 'Writing invented in Sumer', area: 'Near East' },
  { year: -2560, label: 'Great Pyramid of Giza completed', area: 'North Africa' },
  { year: -1754, label: 'Code of Hammurabi', area: 'Near East' },
  { year: -1274, label: 'Battle of Kadesh', area: 'Near East' },
  { year: -776, label: 'First Olympic Games', area: 'Europe' },
  { year: -509, label: 'Roman Republic founded', area: 'Europe' },
  { year: -323, label: 'Death of Alexander the Great', area: 'Near East' },
  { year: -221, label: 'Qin unifies China', area: 'China' },
  { year: -44, label: 'Assassination of Julius Caesar', area: 'Europe' },
  { year: 476, label: 'Fall of the Western Roman Empire', area: 'Europe' },
  { year: 622, label: 'The Hijra; Islamic calendar begins', area: 'Near East' },
  { year: 800, label: 'Charlemagne crowned emperor', area: 'Europe' },
  { year: 1066, label: 'Norman conquest of England', area: 'Europe' },
  { year: 1206, label: 'Genghis Khan unites the Mongols', area: 'Steppe & Central Asia' },
  { year: 1347, label: 'Black Death reaches Europe', area: 'Europe' },
  { year: 1453, label: 'Fall of Constantinople', area: 'Europe' },
  { year: 1492, label: 'Columbus reaches the Americas', area: 'Mesoamerica' },
  { year: 1521, label: 'Fall of Tenochtitlan', area: 'Mesoamerica' },
  { year: 1648, label: 'Peace of Westphalia', area: 'Europe' },
  { year: 1776, label: 'American Declaration of Independence', area: 'North America' },
  { year: 1789, label: 'French Revolution', area: 'Europe' },
  { year: 1815, label: 'Congress of Vienna', area: 'Europe' },
  { year: 1914, label: 'First World War begins', area: 'World' },
  { year: 1945, label: 'End of the Second World War', area: 'World' },
  { year: 1991, label: 'Dissolution of the Soviet Union', area: 'Europe' },
  ...NOTE_EVENTS,
];
