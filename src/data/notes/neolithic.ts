// The first farmers and their neighbours, 10,000–3000 BC, and the long-lived
// foraging and herding peoples that the border snapshots show alongside them.
import type { CivInput, HistoricEvent } from '../civilisations';

export const notes: CivInput[] = [
  // ── Near East ──────────────────────────────────────────────────────────
  { id: 'levant-neolithic', name: 'First farmers of the Fertile Crescent', start: -10000, end: -6500, peak: -8000, region: 'Near East',
    capitals: [], place: [35.44, 31.87], match: ['Levantine Corridor (Neolithic Farmers)', 'Neolithic Farmers'],
    summary: 'Natufian foragers settled in villages, and their Pre-Pottery Neolithic successors domesticated wheat, barley, lentils, sheep and goats: the world’s first farming. Jericho had a stone wall and tower by about 8000 BC; the carved pillars of Göbekli Tepe are older still.' },
  { id: 'near-east-foragers', name: 'Foragers of the hills and steppes', start: -10000, end: -7000, peak: -9000, region: 'Near East', areas: ['Near East', 'Iran'],
    capitals: [], place: [46.5, 33.5],
    match: ['Coastal and Woodland Mesolithic Hunter-Foragers', 'Steppe Mesolithic Hunter-Foragers', 'Alluvial Lowland Mesolithic Hunter-Foragers', 'Highland Mesolithic Hunter-Foragers'],
    summary: 'Hunter-foragers of the Zagros, Anatolian and Caucasian hills, the steppes and the river lowlands around the first farming villages. Some took up farming, and goats were probably first domesticated in the Zagros; others went on foraging for thousands of years.' },
  { id: 'catalhoyuk', name: 'Çatalhöyük', start: -7100, end: -5950, peak: -6700, region: 'Anatolia',
    capitals: [], place: [32.83, 37.67], match: [],
    summary: 'A town of several thousand people on the Konya plain, its mud-brick houses packed so tightly that people entered through the roofs. Its walls were painted with hunting scenes and decorated with plastered bull horns.' },
  { id: 'ubaid', name: 'Ubaid culture', start: -6500, end: -3800, peak: -4500, region: 'Mesopotamia',
    capitals: [], place: [45.99, 30.82], match: ['Ubaid', 'Amuq D'],
    summary: 'The first villages and towns of the southern Mesopotamian plain, with irrigation canals and temples at Eridu. Its painted pottery spread from the Gulf to Anatolia, preparing the ground for the cities of Sumer.' },
  { id: 'ghassulian', name: 'Ghassulian culture', start: -4500, end: -3500, peak: -4000, region: 'Near East',
    capitals: [], place: [35.6, 31.8], match: [], // the source's "Ghassul" polygon is dated 5000 BC, before the culture
    summary: 'Copper Age villages of the southern Levant, famous for wall paintings and the Nahal Mishmar hoard of cast copper sceptres and crowns.' },

  // ── Europe ─────────────────────────────────────────────────────────────
  { id: 'first-farmers-europe', name: 'First farmers of Europe', start: -6500, end: -3500, peak: -5000, region: 'Europe',
    capitals: [], place: [22.3, 39.4], match: ['Dimini', 'Stentinello culture', 'La Almagra culture', 'Neolithic Crete'],
    summary: 'Farming reached Greece from Anatolia around 6500 BC, then spread up the Danube with the Linear Pottery culture and along Mediterranean coasts with Impressed and Cardial Ware. It was carried largely by migrating farmers, whose DNA traces back to Anatolia.' },
  { id: 'varna', name: 'Varna culture', start: -4600, end: -4200, peak: -4400, region: 'Europe',
    capitals: [], place: [27.9, 43.2], match: [],
    summary: 'A cemetery on Bulgaria’s Black Sea coast holding the oldest worked gold in the world, about 3,000 objects, with a few graves far richer than the rest: early evidence of social rank.' },
  { id: 'funnelbeaker', name: 'Funnelbeaker culture', start: -4300, end: -2800, peak: -3500, region: 'Northern Europe',
    capitals: [], place: [14.6, 53.5], match: [], // the source's "Funnel-Beaker" polygon is dated 5000 BC, before the culture
    summary: 'The first farmers of northern Europe and southern Scandinavia, named after their pottery. They built megalithic tombs (dolmens and passage graves) across the North European Plain.' },
  { id: 'forest-foragers', name: 'Forest foragers of north-eastern Europe', start: -6000, end: -2000, peak: -4000, region: 'Northern Europe',
    capitals: [], place: [30, 57], match: ['Narva', 'Nemay', 'Early combware', 'Volga-Kamm'],
    summary: 'Hunter-fisher-gatherers of the Baltic and Russian forests, the Narva, Neman and Comb Ware cultures, who made pottery for thousands of years before farming reached them.' },

  // ── Africa ─────────────────────────────────────────────────────────────
  { id: 'predynastic-egypt', name: 'Predynastic Egypt', start: -5200, end: -3100, peak: -3500, region: 'North Africa',
    capitals: [], place: [32.7, 25.9], match: ['Naquada I', 'Naqada culture'],
    summary: 'Farming villages in the Faiyum and at Merimde from about 5200 BC were followed by the Badarian and Naqada cultures of Upper Egypt, whose chiefdoms, painted pottery and early hieroglyphs led up to the unification of Egypt.' },
  { id: 'sahara', name: 'Peoples of the Sahara', start: -7000, end: 2010, peak: -5000, region: 'North Africa', areas: ['North Africa', 'West Africa'],
    capitals: [], place: [30.73, 22.51], match: ['Saharan pastoral nomads', 'Saharan Nomadic Tribes', 'Tuareg Nomadic Tribes', 'Touareg', 'Tuaregs'],
    summary: 'When the Sahara was green, with lakes and grassland, cattle herders gathered at Nabta Playa, where a stone circle may mark the summer solstice, and painted the rock art of the Tassili n’Ajjer. As the desert returned after about 3500 BC, herders moved to its edges and oases; later Berber-speaking nomads, among them the Tuareg, crossed it with camels.' },
  { id: 'west-central-africa-early', name: 'Early West and Central Africa', start: -10000, end: -3001, peak: -6000, region: 'West Africa', areas: ['West Africa', 'Central & Southern Africa'],
    capitals: [], place: [-3.6, 14.4], match: ['Bantu'],
    summary: 'In the wetter early Holocene, foragers of West Africa made some of Africa’s oldest pottery (about 9400 BC, at Ounjougou in Mali) and began tending yams and oil palms. The source map already labels the region “Bantu”, after languages whose great spread came later.' },
  { id: 'bantu', name: 'Bantu expansion', start: -3000, end: 1500, peak: -500, region: 'Central Africa', areas: ['West Africa', 'Central & Southern Africa', 'East Africa'],
    capitals: [], place: [10.5, 5.5], match: ['Bantu', 'Bantu peoples'],
    summary: 'From the Nigeria–Cameroon borderlands, Bantu-speaking farmers spread over three thousand years across Central, Eastern and Southern Africa, bringing farming, iron-working (from about 500 BC) and the languages spoken by about a third of Africans today.' },
  { id: 'khoe-san', name: 'Khoe and San peoples', start: -10000, end: 2010, peak: -1000, region: 'Southern Africa',
    capitals: [], place: [21.73, -18.75], match: ['Khoisan'],
    summary: 'The foragers (San) and herders (Khoe) of southern Africa, whose ancestral lineages are among the most deeply divergent in living humans. Their rock paintings span thousands of years; Bantu farmers and later European colonists pushed them into the Kalahari and the Cape.' },

  // ── Asia ───────────────────────────────────────────────────────────────
  { id: 'neolithic-china', name: 'Neolithic China', start: -9000, end: -2000, peak: -3000, region: 'China',
    capitals: [], place: [113.67, 33.6], match: [],
    summary: 'Millet was domesticated along the Yellow River and rice along the Yangtze by about 7000 BC. Villages such as Jiahu (with the oldest playable flutes), Yangshao with its painted pottery, and Hemudu with its pile houses were followed by the jade-working Liangzhu culture, whose walled city (3300–2300 BC) preceded China’s Bronze Age states.' },
  { id: 'south-asia-early', name: 'Early farmers of South Asia', start: -7000, end: -700, peak: -2500, region: 'South Asia',
    capitals: [], place: [67.63, 29.39], match: ['Dravidians'],
    summary: 'At Mehrgarh, below the Bolan Pass, people grew barley and wheat and herded zebu cattle by about 7000 BC. Farming villages spread across the subcontinent, alongside and after the Indus cities: ash-mound cattle herders in the Deccan, rice farmers along the Ganges. The source map labels much of the region by the Dravidian languages spoken there.' },
  { id: 'central-asia-early', name: 'Jeitun & Namazga', start: -6000, end: -2000, peak: -3000, region: 'Central Asia',
    capitals: [], place: [58.39, 38.19], match: ['Kelteminar culture', 'Namazga'],
    summary: 'At Jeitun, on the edge of the Kopet Dag, farmers grew wheat and barley by about 6000 BC. The Namazga villages grew into the proto-urban towns of southern Turkmenistan, while the Kelteminar foragers fished the lower Amu Darya.' },

  // ── The Americas ───────────────────────────────────────────────────────
  { id: 'early-mesoamerica', name: 'First farmers of Mesoamerica', start: -8000, end: -200, peak: -1500, region: 'Mesoamerica',
    capitals: [], place: [-96.37, 16.93], match: ['Maize farmers', 'Basin of Mexico chiefdoms'],
    summary: 'Squash was grown at Guilá Naquitz in Oaxaca by about 8000 BC, and maize was bred from wild teosinte in the Balsas valley by about 7000 BC. Farming villages spread across Mesoamerica, and by the first millennium BC chiefdoms ruled the Basin of Mexico.' },
  { id: 'valdivia', name: 'Valdivia culture', start: -3800, end: -1500, peak: -2500, region: 'Andes',
    capitals: [], place: [-80.7, -1.9], match: ['Valdivia'],
    summary: 'One of the earliest pottery-making cultures of the Americas, on the coast of Ecuador, known for its small stone and clay female figurines.' },
  { id: 'early-south-america', name: 'Early South Americans', start: -10000, end: -3500, peak: -6000, region: 'South America',
    capitals: [], place: [-72, -13.5], match: [],
    summary: 'Descendants of the first Americans spread from the Amazon to Tierra del Fuego. In the Andes they domesticated potatoes, quinoa, llamas, alpacas and guinea pigs; on the Pacific coast they fished, and they began shaping the Amazon forest with useful trees.' },
  { id: 'amazonia', name: 'Peoples of Amazonia', start: -1500, end: 1800, peak: 1000, region: 'South America',
    capitals: [], place: [-60, -5], match: ['Amazon hunter-gatherers', 'Manioc farmers', 'Tupis'],
    summary: 'Manioc farmers and forest foragers of the Amazon basin. Some built large settlements with raised fields, earthworks and fertile “dark earth” (terra preta); Tupi-speakers spread along the Atlantic coast. European diseases after 1500 caused a catastrophic collapse.' },
];

export const events: HistoricEvent[] = [
  { year: -9400, label: 'Oldest pottery in Africa (Ounjougou, Mali)', area: 'West Africa' },
  { year: -8300, label: 'Jericho’s stone wall and tower', area: 'Near East' },
  { year: -8000, label: 'Squash farmed in Oaxaca', area: 'Mesoamerica' },
  { year: -7500, label: 'Cattle herders at Nabta Playa in a green Sahara', area: 'North Africa' },
  { year: -7100, label: 'Çatalhöyük founded', area: 'Near East' },
  { year: -7000, label: 'Rice farming on the Yangtze, millet on the Yellow River', area: 'China' },
  { year: -6900, label: 'Farming at Mehrgarh, South Asia', area: 'South Asia' },
  { year: -6500, label: 'Farming reaches Greece and the Balkans', area: 'Europe' },
  { year: -6000, label: 'Wheat and barley farming at Jeitun, Central Asia', area: 'Steppe & Central Asia' },
  { year: -5500, label: 'Linear Pottery farmers settle central Europe', area: 'Europe' },
  { year: -4500, label: 'Varna gold, the oldest worked gold', area: 'Europe' },
  { year: -3500, label: 'The Sahara dries out', area: 'North Africa' },
  { year: -3300, label: 'Liangzhu walled city', area: 'China' },
  { year: -3000, label: 'Austronesian seafarers set out from Taiwan', area: 'Southeast Asia' },
  { year: -2800, label: 'Bantu expansion under way', area: 'Central & Southern Africa' },
  { year: -2500, label: 'Stonehenge’s great sarsen circle', area: 'Europe' },
];
