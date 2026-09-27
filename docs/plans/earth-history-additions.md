# Plan: towards a complete history of the Earth

Status: proposal · 2026-09-27

This plan covers every addition recommended so far, except borders after 2010 (out of scope for now). Its goal is complete coverage of Earth and human history. It is grounded in how the atlas works today:

- Two `Timeline` sliders: deep time in Ma (1000 → 0), and human history in years (10,000 BC → AD 2010).
- `MapView` (`src/map.ts`) owns everything: the WebGL renderer, the SVG overlays, the dinosaurs and the impact.
- Land is drawn from lon/lat meshes that are rotated per plate in the vertex shader. Territories come from pre-projected snapshots, faded between surveys.
- Data is built offline by `scripts/*.mjs` into `public/data/` and fetched lazily.

## Contents

| # | Addition | Size | Depends on |
|---|---|---|---|
| 0 | Foundations: one time axis, a layer registry, layer toggles, strip charts | M | — |
| 1 | Filling the gaps in human history: missing regions, the Neolithic, events, regional eras | L (mostly content) | — (the audit script needs nothing) |
| 2 | More fossil life and the five mass extinctions | M | 0 |
| 3 | Ice sheets and sea level, from the last ice age to today | L | 0 |
| 4 | Rivers and lakes, including historical changes | M | 0 |
| 5 | Relief (mountains) and landform labels (ranges, plateaus, deserts) | M–L | 0 |
| 6 | Human prehistory: hominins, Out of Africa, Ice Age coasts | L | 0, 3 |
| 7 | Climate strip, climate events, great eruptions | M | 0 |
| 8 | Before a billion years ago: 4.54 billion to 1 billion years ago | M | 0 |
| 9 | Cities and population | M | 0 |
| 10 | Movement: trade routes, migrations, voyages | L (mostly content) | 0 |
| 11 | Origins and spread: domestication, writing, religions, technology, pandemics | L (mostly content) | 0, 10 |

Recommended order, coverage first: 0 → 6 → 8 (no gaps in time), with 1 in parallel → 2 → 7 (no gaps in content) → 3 → 4 → 5 (physical Earth) → 9 → 10 → 11. The reasons are under "Sequencing" at the end.

---

## 0. Foundations

> **Progress (2026-09-27):** 0.1, 0.2, 0.4 and 0.6 are done. The time model is in `src/time.ts`, the layer interface in `src/layers/layer.ts`, and the panel in `src/layers/panel.ts`. Borders, capitals, paleo names and dinosaurs are all registered layers. The project is in git, with Vitest. 0.3 (renderer passes) and 0.5 (strip chart) are left until their first user (ice in 3, climate in 7), so they're built against real data rather than guessed.

The current design has one special-cased overlay (dinosaurs) wired directly into `MapView`, which is already 815 lines. A dozen more layers can't be added the same way.

### 0.1 One time axis
- Add `src/time.ts` with a single value, **years before present (BP, present = 1950)**, and helpers to convert it to and from the existing units:
  - `fromYear(y)` = `1950 − y`
  - `fromAge(ma)` = `ma × 1e6`
  - formatting helpers
- `main.ts` keeps its two (later three) sliders, but every layer receives a single `TimeState`:

  ```ts
  interface TimeState { bp: number; year: number | null; age: number; mode: 'deep' | 'prehistory' | 'history' }
  ```

- **Why this is needed:** ice, sea level and rivers change *within* the human slider, while `age` stays 0 there. They need a finer time than Ma. It also fixes the silent jump from "0 Ma" to "10,000 BC" when playback moves from deep time into human history.

### 0.2 Layer registry
- Add `src/layers/layer.ts`:

  ```ts
  interface MapLayer {
    id: string; title: string; group: 'earth' | 'life' | 'people';
    activeAt(t: TimeState): boolean;          // time gating: nothing loads outside the range
    update(t: TimeState): void;               // throttled like Dinosaurs.update
    scale?(k: number): void;                  // zoom-dependent sizing
    gl?: GlLayerHooks;                        // optional: contributes a draw pass (see 0.3)
    legend?(): HTMLElement | null;
  }
  ```

- `MapView` gets `addLayer(layer)` and calls the hooks from `setGeoAge`/`show`/zoom. Move `Dinosaurs` onto this interface first, as the proof that the interface works. Its behaviour must not change.
- Loading stays lazy: a layer fetches its data the first time `activeAt` is true and it is switched on.

### 0.3 Renderer passes
Extend `Frame` and `Renderer.draw` with named slots, so physical layers sit in the right place. Territory translucency depends on this order:

```
sea → exposed shelf (sea level) → land → relief → lakes → rivers
    → [territories composite] → ice → coast → sphere edge
```

- Ice sits **above** territories, so land under ice doesn't show borders. Rivers and relief sit **below** territories.
- Add a reusable **`PolylineLayer`** (screen-space quads, like `TerritoryLayer.lines`). It carries a per-segment `fromBP`/`toBP` and a `rank` for zoom filtering. Rivers, routes and ice margins will all use it.
- Add a reusable **`RasterOverlay`**: a texture sampled in the land fragment shader by *present-day* lon/lat. `LAND_FILL_VS` already receives `aPos` as present-day lon/lat, so pass it through as a varying. A raster sampled that way rides along with its plate for free.

### 0.4 Layers panel
- Turn the static `.legend` in `index.html` into a collapsible **Layers** panel, grouped Earth / Life / People. Each row gets a checkbox and a key swatch.
- Rows outside their time range are greyed out, with the range shown, for example "from 26,000 years ago".
- Store the enabled layers in the URL hash (`#year=-500&layers=rivers,ice`) and in `localStorage`.
- Defaults: ice, rivers, relief (faint) and fossils on. Routes, cities and origins off, so the borders stay readable.

### 0.5 Strip charts
- Add `src/strip.ts`: a thin chart drawn under the active slider, sharing that slider's `toPos` mapping, so the curve lines up with the handle.
- It shows one series at a time (temperature, CO₂, sea level, population), chosen from a small select.
- Used by 3, 7 and 9.

### 0.6 Hygiene before starting
- The project is not a git repository. Run `git init` and make a first commit before any of this work.
- Add a minimal test harness (Vitest) for the pure parts: time conversion, bracketing, series interpolation, and geometry filters in the build scripts.

**Done when:** the dinosaurs work exactly as before through the registry, the Layers panel toggles them, and a layer can be gated by years BP inside the human slider.

---

## 1. Filling the gaps in human history (10,000 BC to AD 2010)

The borders cover the whole span, but the hand-written content does not. `src/data/civilisations.ts` has 72 civilisations and 27 events, and the gaps are large:

- **By time:** nothing before Sumer (4500 BC). The first 5,500 years of the human slider have no civilisation notes and only two events.
- **By region:** there are no entries at all for Japan, Korea, Vietnam, Oceania, Polynesia or indigenous North America. Sub-Saharan Africa after 1600, and Europe between Rome and the modern empires, are thin.
- **Events:** 27 events for 12,000 years, almost all Mediterranean, European or Chinese.
- **Eras:** Mesolithic → Medieval → Modern is a European periodisation, shown as if it applied to the whole world.

### 1.1 Coverage audit (tooling first)
- Done: `src/data/regions.ts` defines 17 world areas: Near East, Iran, North Africa, West Africa, East Africa, Central & Southern Africa, Europe, Steppe & Central Asia, South Asia, China, Korea & Japan, Southeast Asia, Oceania, North America, Mesoamerica, South America and Arctic. Every civilisation and event now has an area. An empire counts only for its home area, so the British Empire doesn't fill India's gap.
- Done: `npm run coverage` (`scripts/coverage.ts`) prints two grids: civilisation notes by area × period, and events by area × 500 years. It also lists every border polygon covering 0.5% or more of a snapshot's mapped land that has no note; `--all` lists every unlinked polygon.
- **Target:** every region has at least one civilisation or culture note active in every millennium from 8000 BC, and in every century from AD 1. Every inhabited region has at least one event every 500 years.

### 1.2 Content to add

> **Progress (2026-09-27), batch 1: Korea & Japan, Oceania, North America, the Arctic and the Neolithic.**
> - Added 64 notes and 48 events in `src/data/notes/`, with one file per region.
> - Coverage now: 75 of 527 cells empty (down from 300); events 374 of 425 (down from 406); large unlinked polygons 270 (down from 347).
> - Notes may now have a `place` instead of capitals, for cultures such as Çatalhöyük and Cahokia that have no polygon or seat of power. `npm run names` finds polygon names for `match`.
> - A test checks every `match` name against the snapshots, and that each note links at least one snapshot within its dates. It has already caught source polygons dated before their culture existed (Ghassul and Funnel-Beaker in 5000 BC), and a `Kelteminar` polygon drawn on New Zealand in 5000 BC: a candidate for `corrections.mjs`.
> - Still empty: Southeast Asia (AD 1–600 and 1500 onwards), East Africa (before 3000 BC and after 1600), Iran (19th–21st centuries), South Asia (AD 1–300 and 600–800), China (AD 300–500) and Europe before 7000 BC. These are the next batch.

Each entry follows the existing format: dates, capitals over time, `match` names from the border polygons, and a 2–3 sentence summary.

| Gap | Entries to add |
|---|---|
| Neolithic, 10,000–4500 BC | Natufians, Jericho, Göbekli Tepe/Karahan, Çatalhöyük, Mehrgarh, Jiahu/Peiligang, Yangshao, Hemudu, Jōmon, Linear Pottery (LBK), Varna, Cucuteni–Trypillia, Ubaid, Nabta Playa, Sahara rock-art pastoralists, Maykop |
| Bronze & Iron Age | Harappan successors (Vedic), Erlitou, Mycenaean Greece, Nuragic Sardinia, Urnfield/Hallstatt/La Tène Celts, Phoenicia, Israel & Judah, Urartu, Scythians, Nok, D'mt, Sanxingdui, Lapita |
| Korea & Japan | Gojoseon, Three Kingdoms (Goguryeo/Baekje/Silla), Goryeo, Joseon; Yayoi, Yamato/Nara/Heian, Kamakura/Muromachi shogunates, Tokugawa, Empire of Japan |
| Southeast Asia | Funan, Champa, Dvaravati, Pagan, Đại Việt, Majapahit, Ayutthaya, Toungoo, Malacca Sultanate |
| Oceania & Polynesia | Lapita, Tongan maritime empire, Hawaiian Kingdom, Māori, Aboriginal Australia (a continuous note from 65,000 years ago; see 6), Rapa Nui |
| North America | Poverty Point, Adena/Hopewell, Mississippian (Cahokia), Ancestral Puebloans, Haudenosaunee Confederacy, Comanche, Thule/Inuit, Mexico, Canada, Brazil |
| Africa | Garamantes, Nubian kingdoms (Makuria), Swahili city-states, Kanem–Bornu, Ife & Benin, Kongo, Solomonic Ethiopia, Mutapa, Ashanti, Oyo, Sokoto Caliphate, Zulu Kingdom, the Scramble for Africa (1881–1914), decolonisation |
| Europe, 500–1800 | Anglo-Saxon England, the Norse/Vikings, Umayyad Al-Andalus, Kingdom of France, Kingdom of England, the Venetian and Genoese republics, Hanseatic League, Grand Duchy of Lithuania, Habsburg Monarchy, Dutch Republic & Empire, Swedish Empire, Napoleonic France |
| Modern | French colonial empire, German Empire, Italy, Empire of Japan, Nazi Germany, People's Republic of China, Republic of India, the European Union, the Ottoman successor states |
| Steppe & Central Asia | Yamnaya, Sintashta, Scythians, Göktürks, Uyghur Khaganate, Golden Horde, Chagatai Khanate, Kazakh Khanate, Dzungar Khanate |
| Middle East & South Asia | Akkad, Ur III, Mitanni, Neo-Babylonian, Umayyad and Abbasid (split out of "Islamic Caliphates"), Ayyubids, Ghaznavids, Rashtrakuta, Pala, Maratha Empire, Durrani Empire, Sikh Empire |

- **About 150 new events** to balance regions, for example:
  - Early farming and settlement: Jericho's walls (~8000 BC), Çatalhöyük (~7400 BC), rice farming on the Yangtze (~7000 BC), the Varna gold (~4500 BC)
  - Ancient: Stonehenge (~2500 BC), Lapita reaching Tonga (~850 BC), the founding of Carthage (814 BC), Ashoka's edicts (~260 BC)
  - Medieval: Aksum adopts Christianity (~330), the Taika reform (645), Angkor Wat (~1150), Cahokia's peak (~1100), Great Zimbabwe (~1300), the Treaty of Tordesillas (1494)
  - Modern: the Haitian Revolution (1791), the Meiji Restoration (1868), the Berlin Conference (1884), Indian independence (1947), the Year of Africa (1960), the fall of the Berlin Wall (1989)
- **Regional eras:** keep the global `ERAS` bands on the slider. When the map is zoomed into one region, show that region's own periodisation in `#era`:
  - China: dynasties
  - Japan: Jōmon → Edo
  - Mesoamerica: Preclassic, Classic and Postclassic
  - Sub-Saharan Africa: Stone Age → Iron Age

  The region is chosen from the view centre.
- **Sources:** each entry cites a standard reference in a code comment, as the corrections do. Examples: the Cambridge World History, Oxford Handbooks, and the Seshat Global History Databank for dates.

### 1.3 Border snapshots
- The source (historical-basemaps) has no snapshots between 10,000 BC and 8000 BC, or between 8000 BC and 5000 BC. Check upstream for newer snapshots before any hand-drawing.
- Where there are none, the Neolithic stretch relies on the culture notes (1.2), plus the farming spread (11) and the sea-level and ice changes (3). Don't invent borders.

**Done when:**
- The coverage matrix has no empty region × millennium cells from 8000 BC, and no empty region × century cells from AD 1, except where the absence is historical (for example, no population in Aotearoa before ~1280).
- Every border polygon covering more than about 0.5% of the land at world view links to a note.

---

## 2. More fossil life and the five mass extinctions

- **Generalise** `Dinosaurs` into `FossilGroups(config)`. The config holds the group list, colours, silhouettes, the age range in which zones show, and an optional extinction age. `dinos.ts` becomes one config.
- **Build:** turn `build-dinos.mjs` into `build-fossils.mjs` with one entry per assemblage. Each assemblage gets its own output file (`fossils-<id>.json`) so they load separately.

| Assemblage | PBDB clades | Shown |
|---|---|---|
| Early seas | Trilobita, Anomalocaridida, Graptolithina | 540–252 Ma |
| First on land | early Tracheophyta, Tetrapodomorpha, early Tetrapoda | 430–300 Ma |
| Sea reptiles & ammonites | Ichthyosauria, Sauropterygia, Mosasauridae, Ammonoidea | 250–66 Ma |
| Pterosaurs | Pterosauria | 228–66 Ma |
| Mammal ancestors | Therapsida (non-mammal) | 275–170 Ma |
| Mammals | Mammalia (Cenozoic) | 66–0 Ma |
| Ice Age megafauna | Proboscidea, *Smilodon*, *Megatherium*, *Coelodonta* | 2.6 Ma → about 10,000 years ago (continues into the prehistory slider, see 6) |

- Keep the `MAX_AGE_SPREAD` filter at 25 million years. Use a tighter filter (1 million years) for the Quaternary megafauna.
- **Silhouettes:** draw one new silhouette per group in the existing style.
- **Mass extinctions:** add a generic `ExtinctionEvent` module (a refactor of `impact.ts`), each with its own animation:

| Event | Age (Ma) | Visual |
|---|---|---|
| End-Ordovician | 443.8 | ice spreads over Gondwana (reuses the deep-time ice from 3) |
| Late Devonian | ~372 | reefs fade out, a sea-anoxia tint |
| End-Permian ("Great Dying") | 251.9 | Siberian Traps glow, anchored to its plate like Chicxulub |
| End-Triassic | 201.4 | CAMP volcanism along the opening Atlantic rift |
| End-Cretaceous | 66 | existing Chicxulub impact |

  Each event triggers the zones' `fadeOut` for the groups that end there. For example, trilobites end at the Permian.
- Add the five events to `GEO_EVENTS` with a distinct ◆ style.
- **Done when:** scrubbing 541 → 0 Ma shows zones that hand over between assemblages. Each extinction plays once when you cross it moving forward, the same rule as `IMPACT_AGE`.

---

## 3. Ice sheets and sea level, from the last ice age to today

This is the most important physical layer, because it fixes what the map shows at 10,000 BC.

### 3.1 Sea level and exposed shelves (26,000 years ago to today)
- **Data:**
  - ETOPO 2022 bathymetry (NOAA, public domain), resampled to 1 arc-minute
  - The global mean sea-level curve of Lambeck et al. 2014 (PNAS), sampled every 1,000 years
- **Build** (`scripts/build-sealevel.mjs`):
  - For each step from 26,000 to 7,000 years ago, trace the contour at −(sea-level drop) with `d3-contour` over the grid. Keep only the land *gained* (contour minus today's land).
  - Simplify the result, and output `sealevel.json`: a list of polygons with `{ bp, rings }`.
  - After about 7,000 years ago the coast is close to modern, so stop there.
- **Client:**
  - Draw the exposed shelf as land, in the same colour with a faint stipple, so it reads as "land then, sea now".
  - Cross-fade between steps as the borders do.
  - Label Doggerland, Beringia, Sundaland, Sahul and the Persian Gulf basin when they are exposed.
- **Limitation:** a single global curve ignores isostasy, so it is wrong near the ice sheets (Hudson Bay, the Baltic). Say so in the README. A later upgrade is to add the ICE-6G_C topography delta (Peltier et al. 2015) on top of ETOPO; check its licence first.

### 3.2 Ice sheets (26,000 years ago to today)
- **Data:**

| Region | Source | Steps |
|---|---|---|
| North America | Dalton et al. 2020 (QSR) margin shapefiles | 0.5–1 ka |
| Eurasia | Hughes et al. 2016 DATED-1 (Boreas) | 1 ka |
| Patagonia | Davies et al. 2020 PATICE | 1 ka |
| Antarctica, Greenland, mountain glaciers today | Natural Earth "glaciated areas" 10m/50m | present |

  Record each licence in the README.
- **Build:** `scripts/build-ice.mjs` normalises everything to `{ bp, rings }` with shared steps, interpolating Hughes and Dalton onto the same timesteps. Output `ice.json`, plus `ice.hi.json` for zoom ≥ 4.
- **Client:**
  - An `IceLayer` in the "ice" pass (above territories): an off-white fill with a blue-grey hachured edge.
  - Cross-fade between steps.
  - Tooltip: "Laurentide Ice Sheet · about 12,000 years ago".

### 3.3 Deep-time ice (schematic)
- These are hand-authored, plate-anchored polygons in `src/data/geology.ts`, like `PALEO_LABELS`:
  - Snowball Earth: global, 717–660 Ma and 650–635 Ma
  - End-Ordovician: Gondwana, 445–443 Ma
  - Late Paleozoic ice age: southern Gondwana, 340–260 Ma
  - Antarctica: 34 Ma onward, growing
  - Northern hemisphere ice ages: 2.6 Ma onward, pulsing
- Draw them with a looser, dashed edge so they read as approximate.

### 3.4 In the human slider
- 10,000 BC is 11,950 years before present, so the ice and shelf layers are active in the human slider from 10,000 BC to about 5000 BC. Borders and ice then coexist, with ice drawn on top.
- The strip chart (0.5) offers "Sea level".

**Done when:**
- `#year=-10000` shows a remnant Laurentide ice sheet, a Doggerland remnant and a Bering land bridge.
- `#year=-5000` is effectively modern.
- The deep-time Snowball shows at 700 Ma.
- The frame time stays within the current budget while playing.

---

## 4. Rivers and lakes

- **Data:** Natural Earth `rivers_lake_centerlines` and `lakes` at 1:110m, 1:50m and 1:10m (public domain). Use `scalerank` for zoom filtering.
- **Build:**
  - Add a section to `build-plates.mjs` that splits them by static polygon, as the land is split. This keeps plate ids so the layer *could* ride with plates, but see the time gating.
  - Output `rivers-{lo,mid,hi}.json` and `lakes-{lo,mid,hi}.json`.
- **Client:**
  - A `PolylineLayer` in the "rivers" pass: sea-ink colour, width by rank.
  - Lakes are filled with the sea colour.
  - Tiers follow `LAND_TIERS`.
- **Time gating:** visible for about the last 2 million years (fully visible from about 100,000 years ago). Fade out before that, because drainage further back is not today's.
- **Historical hydrology** (`src/data/hydrology.ts`, hand-authored GeoJSON with a citation per entry). Each entry carries `fromBP`/`toBP` and replaces or hides the modern feature it conflicts with:

| Change | When |
|---|---|
| Green Sahara lakes: Mega-Chad, the Saharan river networks | ~11,000–5,500 years ago |
| Ghaggar-Hakra ("Sarasvati") flowing | to ~2000 BC |
| Yellow River courses (the major shifts) | 602 BC, AD 11, 1128, 1855 |
| Oxus (Amu Darya) to the Caspian | intermittently, to the 16th century |
| Aral Sea shrinking | 1960 → 2010 (outlines for 1960, 1989, 2000, 2010, 2014) |
| Lake Agassiz and Baltic Ice Lake | alongside the ice layer, ~13,000–8,000 years ago |

- **Done when:** rivers appear under the territories, fade with zoom by rank, and the Aral Sea shrinks between 1960 and 2010.

---

## 5. Relief and landform labels

### 5.1 Relief
- **Data:** ETOPO 2022 (public domain), land only.
- **Build** (`scripts/build-relief.mjs`):
  - Compute a hillshade plus a slope mask.
  - Output a greyscale WebP: 4096×2048 for the world view, plus tiles for zoom ≥ 4 (a 4×2 grid at 4096 each, loaded on demand).
- **Client:** a `RasterOverlay` sampled in `LAND_FILL_FS` by present-day lon/lat (0.3).
  - For the parchment look, don't show photographic hillshade. Use the shade as a threshold against the existing `noiseTexture`, giving an ink stipple or engraved feel in `--ink-soft`, strongest on steep slopes.
- **Time gating by age:**
  - Full from 0 to 5 million years ago
  - Linear fade to 0 by 40 million years ago (roughly when the Alps and Himalaya rose)
  - Off before that
- **Later, optional:** Scotese PaleoDEMs (5-million-year steps, CC BY) are in the PALEOMAP frame, not Merdith's. Using them needs a reprojection study. Park this.

### 5.2 Landform labels
- **Data:** Natural Earth `geography_regions_polys` (ranges, plateaus, deserts, basins, plains) and `geography_regions_elevation_points` (peaks).
- **Client:**
  - SVG text in a new `landformRoot`, in italic IM Fell and `--ink-soft`, with range names set along a curve.
  - Uses the existing label collision logic. Landform labels yield to territory labels.
- **Time gating:** the same fade as relief. Deserts get their own gating: the Sahara label is hidden during the Green Sahara.
- **Done when:** the Himalaya, Andes, Tibetan Plateau, Deccan and Sahara read clearly at 1×. Peaks appear at ≥ 4×. Nothing overlaps the borders' labels.

---

## 6. Human prehistory (7 million years ago to 10,000 BC)

> **Progress (2026-09-27):** done, except the land bridges. Built so far:
> - The third slider (`#preline`, log scale), with epochs as bands, tool stages in the read-out, 27 milestones, and playback flowing deep time → prehistory → history.
> - 65 sites, species ranges for 10 groups (Homo sapiens spreading region by region), and 8 routes (`src/data/prehistory.ts`, `src/layers/prehistory.ts`).
> - Site cards, and an epoch card on map click.
>
> Routes still cross today's coastlines; they pick up Beringia and Sahul when section 3 adds Ice Age sea levels. The megafauna idea from section 2 is not started.

### 6.1 A third slider
- On the square-root deep-time scale, the last 300,000 years get 1.7% of the width. That is unusable.
- Add a **Prehistory** `Timeline` between the two existing sliders, on a log scale from 7 million years ago to 11,950 years ago (10,000 BC).
- It follows the existing rule of one active slider at a time, and playback flows deep time → prehistory → history.
- Bands: Pliocene, Early/Middle/Late Pleistocene, and archaeological stages (Oldowan, Acheulean, Middle Stone Age / Middle Palaeolithic, Upper Palaeolithic).
- URL: `#ka=45` for 45,000 years ago.

### 6.2 Hominin sites and species ranges
- **Data:** a hand-curated `src/data/hominins.ts` of about 80 key sites. Each has coordinates, a date range, the species, a one-line summary and a citation. Examples:
  - Toumaï, Lucy/Hadar, Laetoli, Olduvai, Turkana Boy
  - Dmanisi, Zhoukoudian, Trinil, Atapuerca
  - Jebel Irhoud, Omo Kibish, Blombos, Skhul/Qafzeh
  - Denisova, Liang Bua, Callao
  - Madjedbebe, Lake Mungo, Chauvet, Lascaux, Monte Verde, Göbekli Tepe (at the boundary)
- Optionally supplement it with PBDB `Hominidae` occurrences through the fossil pipeline (2).
- **Species ranges:** hand-drawn approximate polygons with dates (*H. erectus*, Neanderthals, Denisovans, *H. floresiensis*, *H. sapiens*). They are dashed and labelled "approximate".
- **Client:**
  - A `HomininLayer`: site markers with tooltips, and range polygons.
  - Clicking a site opens the `#info` panel, reusing the civilisation panel layout.

### 6.3 Out of Africa and the peopling of the world
- Hand-authored routes (`src/data/migrations-prehistory.ts`). Each is a polyline with a timestamp at every vertex, drawn progressively as time passes:

| Route | When |
|---|---|
| Africa → Levant | ~120,000 and ~70,000 years ago |
| Southern route → India → Sahul | arriving ~65,000–50,000 years ago |
| → Europe | ~45,000 years ago |
| → East Asia | ~40,000 years ago |
| → Beringia → the Americas | ~16,000 years ago, Pacific coastal route |

- The routes rely on the exposed shelves from 3.1. The Bering land bridge and Sahul are the point.
- **Done when:** playing prehistory from 200,000 to 11,950 years ago shows sites appearing, ranges shrinking (Neanderthals gone by ~40,000 years ago), routes drawing across exposed land bridges, and the hand-off into 10,000 BC is seamless.

---

## 7. Climate strip, climate events, great eruptions

- **Series** (`src/data/climate.ts`, a series of `[bp, value]`, built by `scripts/build-climate.mjs`):

| Series | Source | Span |
|---|---|---|
| Phanerozoic global mean temperature | Scotese et al. 2021 | 540 Ma → 0 |
| Cenozoic benthic δ¹⁸O (a temperature proxy) | Westerhold et al. 2020 CENOGRID (PANGAEA, CC BY) | 66 Ma → 0 |
| Pleistocene glacial cycles | Lisiecki & Raymo 2005 LR04 stack | 5.3 Ma → 0 |
| Holocene temperature | Kaufman et al. 2020 Temp12k (CC BY) | 12,000 years ago → 0 |
| Common era temperature | PAGES 2k (CC BY) | AD 1 → 2000 |
| Recent temperature | HadCRUT5 | 1850 → 2010 |
| CO₂ | Foster et al. 2017 (Phanerozoic), EPICA/Law Dome ice cores, Mauna Loa | |
| Sea level | Miller et al. 2005/2020 (Cenozoic), Lambeck 2014 (from 3.1) | |

- **Client:** the strip picks the best-resolution series for the active slider's span. The unit is labelled, and the source shows on hover.
- **Climate events** are added as events on their slider:
  - Deep time: PETM (56 Ma), Eocene–Oligocene cooling (34 Ma)
  - Prehistory: Toba eruption (~74,000 years ago), Last Glacial Maximum, Younger Dryas (12,900–11,700 years ago)
  - Human history:

    | Event | When |
    |---|---|
    | 8.2 kiloyear event | ~6200 BC |
    | 4.2 kiloyear drought | ~2200 BC |
    | Roman Warm Period | |
    | Late Antique Little Ice Age | AD 536–660 |
    | Medieval Climate Anomaly | |
    | Little Ice Age | ~1300–1850 |
    | Dust Bowl | 1930s |

- **Great eruptions** (`src/data/eruptions.ts`):
  - Sources: the Smithsonian GVP list for VEI ≥ 6, and eVolv2k (Toohey & Sigl 2017) for the last 2,500 years
  - Examples: Toba, Thera (~1600 BC), Vesuvius (79), Ilopango (~431), Samalas (1257), Tambora (1815) with "the year without a summer", Krakatoa (1883), Pinatubo (1991)
  - A brief ash-plume animation, a variant of the impact module
  - Large igneous provinces (Siberian Traps, Deccan Traps, CAMP) already appear with the extinctions in 2
- **Done when:** the strip lines up with the handle on all three sliders, and hovering the curve shows the value with its source.

---

## 8. Before a billion years ago (4.54 billion to 1 billion years ago)

> **Progress (2026-09-27):** done.
> - The deep-time slider starts at 4.54 billion years ago; the first 3.5 billion take 16% of its width. It gets 7 Precambrian eon/era bands and 14 events.
> - `src/layers/early-earth.ts` draws a sea tint and a magma ocean as SVG over the WebGL map, not as a shader, and schematic landmass stages that cross-fade.
> - Theia's impact replays the impact animation. Rodinia's schematic stage sits where the plate model puts Rodinia, and the handover runs from 1,100 to 1,000 million years ago.
>
> With this, the timeline has no gaps from 4.54 billion years ago to AD 2010.

- **Slider:** add a compressed segment to the left end of the deep-time slider, as a piecewise scale that gives 4,540–1,000 Ma about 15% of the width. Bands: Hadean, Archean, Paleoproterozoic, Mesoproterozoic.
- **Map:** there is no plate model here, so switch to an "early Earth" mode. `MapView` hides the land meshes and draws a stylised globe (a shader over the sea pass):
  - A magma ocean (4.5 billion years ago)
  - Water worlds with scattered cratons (4.0–3.0 billion years ago)
  - Orange-tinted skies and seas before oxygenation
  - A schematic Columbia/Nuna (1.8 billion years ago) and early Rodinia fragments (1.1 billion years ago), hand-drawn and clearly marked "schematic"
- **Events:**

| Event | When (billion years ago) |
|---|---|
| Earth forms | 4.54 |
| Theia impact and the Moon | ~4.5 |
| Oldest minerals (Jack Hills zircons) | 4.4 |
| Oceans | ~4.4–4.0 |
| Late Heavy Bombardment (debated) | ~3.9 |
| First life, and the oldest stromatolites | ~3.7 / 3.48 |
| Great Oxidation Event | 2.4 |
| Huronian glaciation | 2.4–2.1 |
| First eukaryotes | ~1.8 |
| Columbia/Nuna | ~1.8 |
| "Boring Billion" | 1.8–0.8 |
| First multicellular algae | ~1.0 |

- **Hand-over at 1,000 Ma:** blend into the Merdith blocks, reusing the `BLOCKS_FROM` cross-fade pattern.
- **Done when:** playing from 4.54 billion years ago flows into Rodinia without a visual jump. Every schematic element is labelled as such.

---

## 9. Cities and population

- **Cities:**
  - **Data:** Reba, Reitsma & Seto 2016, "Spatializing 6,000 years of global urbanization" (Scientific Data; NASA SEDAC; citation required). It covers about 1,700 cities with populations from 3700 BC to AD 2000. Extend it to 2010 with UN World Urbanization Prospects.
  - **Build:** `scripts/build-cities.mjs` → `cities.json` as `[name, lon, lat, [[year, pop], …]]`.
  - **Client:**
    - A `CityLayer` of SVG circles sized by √population, interpolated between the dated values
    - Labels for the top 10 at each time, and a crown mark on the largest city in the world
    - Tooltip: population and rank
    - It sits below the capitals and yields to ★ capitals where they coincide
- **Population:**
  - **Data:** HYDE 3.2 (Klein Goldewijk et al. 2017, open), with world totals from 10,000 BC to 2010. It also has gridded population density.
  - **Client:** a "World population" strip series. An optional **population density** raster, drawn as a faint wash in the land pass, uses HYDE grids at the 26 HYDE time steps, cross-faded like the border surveys.
- **Done when:** scrubbing 3000 BC → 2010 shows the largest-city crown moving Uruk → Memphis → Babylon → Rome → Chang'an → Baghdad → Kaifeng → Hangzhou → Beijing → London → New York → Tokyo. The population strip matches HYDE's totals.

---

## 10. Movement: trade routes, migrations, voyages

This is mostly content work. The rendering is one reusable piece.

- **Renderer:** a `RouteLayer` on `PolylineLayer`:
  - Dashes flow along the line in the direction of travel. The existing line shader already has `vAlongPx`.
  - Each route has a `fromYear`/`toYear` and an optional timestamp per vertex, so journeys draw progressively.
  - Colour by kind: trade, migration, exploration, conquest.
- **Content** (`src/data/routes/*.ts`, one file per kind, with a citation per entry):

| Kind | Routes |
|---|---|
| Trade | Silk Roads (land), maritime Silk Road / Indian Ocean monsoon trade, Incense Route, Amber Road, tin routes, trans-Saharan caravans, Hanseatic League, Varangian route, Manila galleons, Atlantic triangular trade (with the scale of the slave trade: Trans-Atlantic Slave Trade Database, slavevoyages.org), Grand Trunk Road, Inca road network |
| Migrations | Bantu expansion, Austronesian expansion, Polynesian voyaging (Lapita → Rapa Nui, Hawaii, Aotearoa), Indo-European (steppe hypothesis, marked as a hypothesis), Migration Period (Goths, Huns, Slavs), Turkic migrations, Norse, Thule (Inuit), Great Migration in the US, Partition of India (1947) |
| Exploration | Pytheas, Zhang Qian, Xuanzang, Ibn Battuta, Marco Polo, Zheng He's seven voyages, Dias, Columbus, da Gama, Magellan–Elcano, Tasman, Cook's three voyages, Lewis & Clark, Amundsen/Scott |
| Conquest | Alexander, the Mongol expansion (by decade), the Arab conquests, the Spanish conquest of the Americas |

- **Optional data:** OWTRAD (Ciolek) for Old World trade-route geometry. Check its licence; if unusable, hand-draw from standard atlases.
- **Done when:** at AD 1405 Zheng He's fleet draws across the Indian Ocean, and at 1519–1522 Magellan–Elcano circles the globe. Routes are off by default and grouped in the Layers panel.

---

## 11. Origins and spread

- **Domestication centres** (`src/data/origins.ts`):
  - Points with a date, crop or animal, and an icon. Sources: Larson et al. 2014 (PNAS) and Fuller 2011.
  - Examples: wheat, barley, goats and sheep (Fertile Crescent); rice and pigs (Yangtze); millet (Yellow River); maize and squash (Mesoamerica); potato and llama (Andes); sorghum (Sahel); taro and banana (New Guinea); horse (Pontic–Caspian steppe).
  - Optional: animated spread of farming into Europe, using radiocarbon isochrones (Pinhasi et al. 2005).
- **Writing systems:** first attestation points (cuneiform, hieroglyphs, the Indus script with a note that it is undeciphered, oracle bones, Mesoamerican scripts, Phoenician, Greek, Brahmi, Arabic, Hangul…), with lineage lines between them.
- **Religions:**
  - Founding points: Vedic/Hindu, Zoroastrian, Jewish, Buddhist, Jain, Christian, Islamic, Sikh…
  - An optional **majority-religion wash** at century steps, clipped to territories. This is a large authoring job, so plan it last. Seshat or the Correlates of War religion data covers only 1945 onward.
- **Technology milestones:**
  - Point events on the map, each with a place: first pottery (Xianrendong), metallurgy, the wheel, iron, paper, printing (Bi Sheng and Gutenberg), gunpowder, the steam engine, railways, telegraph cables, powered flight, the internet (ARPANET)
  - Optional overlays: the growth of the railway network (1830–1930) and submarine telegraph cables (1866–1900), as routes from 10
- **Pandemics:**
  - Spread isochrones, where the sources support them: the Plague of Justinian (541–549), the Black Death (1346–1353, the classic dated-front map), cholera pandemics, the 1918 flu, COVID-19 (2020)
  - Point and area for the others: smallpox in the Americas from 1520
- **Done when:** each origin item has a citation, shows as an icon at 1× without clutter (clustered by zoom), and opens a short entry in `#info`.

---

## Cross-cutting

- **Performance:**
  - Every layer lazy-loads on its first active time.
  - Budget: no new data on the initial load except `manifest`/`names`. Each layer file stays under about 1.5 MB gzipped at world-view detail.
  - Anything detailed goes behind zoom tiers, like `.lo.json` and `-hi`.
  - Measure with `window.atlas` (dev only) during playback at "Galloping".
- **Clutter:** at most three people-layers on at once by default. Labels share one collision pass with a priority order: territory > capital > city > landform > route.
- **Mobile:**
  - The Layers panel becomes a bottom sheet.
  - The strip chart hides below 480 px width.
  - Three sliders need a compact mode: only the active one full height, the others as thin bars.
- **Credits and licences:**
  - Extend the footer credit line and the README "Data" section for every source.
  - The borders are GPL-3.0, so the whole app should be distributed under compatible terms.
  - Flag any source without a clear licence (ICE-6G, OWTRAD, ROAD) before using it.
- **Honesty about uncertainty:** anything approximate or hypothetical is dashed and labelled "approximate" or "hypothesis". This covers species ranges, schematic ice, pre-1 Ga continents and Indo-European routes. It follows the existing "uncertain border" convention.
- **Verification** for each addition:
  - Run `npm run build`. `tsc` must pass.
  - Test the pure logic with Vitest.
  - Open the `atlas` preview on the URLs in each "Done when", with a screenshot, and check the console is clean and the frame time during playback.

## Sequencing

The goal is **complete coverage**: a timeline with no gaps from 4.54 billion years ago to AD 2010, where every stretch and every region has content. Coverage comes first; the physical-geography layers come after.

**Stage A: no gaps in time**

1. **0 Foundations.** Everything else plugs into it. Moving `Dinosaurs` onto the registry proves the interface without new content.
2. **6 Prehistory** (third slider, hominin sites, species ranges, routes). This closes the gap from 7 million years ago to 10,000 BC. The routes can ship on today's coastlines and pick up the land bridges when 3 lands.
3. **8 Before 1 Ga.** This closes the gap from 4.54 billion to 1 billion years ago. After this step, every moment of Earth's history has a place on a slider.

**Stage B: no gaps in content**

4. **1 Human history gaps.** Mostly content. The coverage script (1.1) comes first and turns this into a checklist. It can start straight away, in parallel with stage A, because it needs none of the foundations.
5. **2 Fossils and extinctions.** Fills the Paleozoic and Cenozoic, which today have no life shown at all, only geology.
6. **7 Climate.** One continuous curve across all three sliders is the simplest way to show there are no gaps in time.

**Stage C: the physical Earth**

7. **3 Ice and sea level.** It fixes what the map shows at 10,000 BC and completes the Ice Age story in 6.
8. **4 Rivers**, then **5 Relief**.

**Stage D: how people lived and moved**

9. **9 Cities and population.**
10. **10 Movement**, then **11 Origins.** Mostly content authoring, which can be split across contributors once `RouteLayer` exists.

## Open decisions

The plan assumes these defaults unless changed:

1. **Prehistory gets a third slider** (6.1), rather than a zoomable deep-time slider. It matches the existing two-slider model.
2. **Sea level uses a eustatic curve first**, with ICE-6G isostasy as a later upgrade (3.1).
3. **Physical layers are on by default**, and people-layers (routes, cities, origins) are off by default (0.4).
4. **Relief is drawn as ink stipple, not hillshade** (5.1), to keep the parchment style.
5. **The human slider still ends at 2010.** Borders from 2010 to today are out of scope for now.
