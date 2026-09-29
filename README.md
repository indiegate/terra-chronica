# Terra Chronica

An interactive parchment-style world atlas: the Earth from its formation 4.54 billion years ago, drifting continents from a billion years ago, the first humans, then the peoples, kingdoms and empires of the last 12,000 years (10,000 BC to AD 2010).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm test           # unit tests (Vitest)
npm run coverage   # how evenly the notes and events cover each world area and period
npm run names -- <regex>   # look up border-polygon names (for a note's match list)
npm run where -- <name> [year]   # where a polygon lies
npm run umbrella   # regenerate the umbrella notes' polygon lists
```

## Using it

- **Globe:** drag to turn it, scroll or pinch to zoom, click a territory or a ★ capital for details. Use `⌂` to reset the view. Searching for a realm turns the globe to it.
- **One time slider, three sectors:** deep time (4.54 billion to 7 million years ago, the first 3.5 billion years compressed at the left) takes a quarter of the slider, human prehistory (7 million years ago to 10,000 BC, on a log scale) a quarter, and human history (10,000 BC to AD 2010) half. Drag the seal, click a sector's name to jump into it, or hover the event marks. `←/→` step through time, `Shift+←/→` jump between border surveys in history, `Space` plays or pauses; playback runs through all three sectors at a similar pace each.
- **Period card:** the top-right card shows the geological period, prehistoric epoch or historical era of the current date, with a short summary; click its title to collapse it.
- **Deep time:** continents drift to where their plates were; past continents and oceans are labelled (Gondwana, Pangaea, Tethys…). Click the map for the current geological period.
- **Early Earth:** before 1 billion years ago there is no plate model, so the map turns schematic: a magma ocean after the Moon-forming impact, iron-rich seas with the first cratons, then Vaalbara, Kenorland and Columbia (Nuna), and Rodinia assembling where the plate model later places it. Every landmass is labelled *schematic*; the sea's tint follows its chemistry, clearing after the Great Oxidation Event.
- **Dinosaurs:** from the Triassic to the end of the Cretaceous, shaded zones show where five dinosaur groups lived, each marked with a silhouette (hover for details). Crossing 66 million years ago plays the Chicxulub asteroid impact and the zones fade out.
- **Search:** press `/` to search any civilisation or polity and fly to it.
- **Layers:** the stacked-sheets button under the zoom controls switches map layers on and off (realms, capitals, past continents, dinosaurs). Layers with nothing to show at the current date are greyed out. Your choice is remembered in this browser and added to the URL when it differs from the defaults (`&layers=capitals,dinosaurs`).
- **Prehistory:** shaded ranges show where each human species lived, dashed arrows trace the great dispersals (early Homo into Asia, Homo sapiens to Sahul, Europe, Siberia and the Americas), and dots mark key hominin sites; current sites are labelled, earlier ones stay faint. Click a site for its card, or the map for the epoch: who was alive and which sites date from then.
- The URL keeps the date (`#year=-500`, `#ka=45` for 45,000 years ago, or `#age=250` for 250 million years ago), so you can share a link to it.

## Data

- **Borders:** [historical-basemaps](https://github.com/aourednik/historical-basemaps) by A. Ourednik (GPL-3.0), 52 snapshots. Between two snapshots, the map fades from the earlier borders to the later ones.
  - Kept at full source resolution and clipped to the Natural Earth 1:10m coastline. Inland borders are only as detailed as the source.
  - 1994, 2000 and 2010 use Natural Earth 1:10m country borders, named after the source polygon they overlap most. Crimea is kept in Ukraine, as it was in 2010 (Natural Earth shows today's de facto control).
  - Naming errors and anachronisms in the source are corrected in `scripts/corrections.mjs`, each with its reason: about 330 rules, among them polygons named after states that did not yet exist (colonies in 1914–1960 drawn as the countries they later became, “Ainu” in 5000 BC), or no longer existed (the Liao in 1200), misplaced labels (“Rajput Clans” in South-East Asia, “Sotho” in the Niger Delta), misspellings and lakes stored as polities.
  - Each snapshot has a simplified `.lo.json` (2 km tolerance) for the zoomed-out view; full detail loads from 4× zoom.
- **Land and plates:** Natural Earth coastlines (1:110m, 1:50m, 1:10m by zoom) split along the static polygons of the [Merdith et al. 2021](https://doi.org/10.5281/zenodo.10346399) plate model (CC BY 4.0), so each piece belongs to a tectonic plate. The model's rotations (`rotations.json`) place every plate at any age up to 1 billion years ago; the client reproduces GPlates' reconstructions to within metres. Before the Cambrian (from 540 to 600 million years ago) the map fades from today's coastline shapes to the model's continental blocks (`plates-blocks.json`), since modern shapes would be anachronistic that far back.
- **Geological periods and events** (`src/data/geology.ts`): dates and colours from the International Chronostratigraphic Chart, with the eons and eras of the Precambrian back to the Hadean; past-continent and ocean labels are anchored to plates and placed by the same rotations as the land.
- **Dinosaur finds:** [Paleobiology Database](https://paleobiodb.org) (CC BY 4.0), fetched by clade in `scripts/build-dinos.mjs`. Sites dated to within 25 million years, one per site and age range; each is placed on its plate and moved with the plate model. Zones are density contours of sites alive within ±3 million years of the current age. The silhouettes are drawn for this project.
- **Prehistory** (`src/data/prehistory.ts`): hand-curated from the published dates of each site (65 sites, 8 routes, species ranges). Where dates are debated (Madjedbebe, White Sands) the site card says so. Ranges and routes are schematic, drawn from the sites that anchor them; they are not surveyed boundaries, and the coastlines are today's (Ice Age sea levels are a planned addition).
- **Civilisation notes** (`src/data/civilisations.ts` and `src/data/notes/`): about 490 hand-written entries with dates, capitals (changing over time) or a key place, and short summaries, linked to polygon names within each note's own dates. Every polygon of every snapshot links to a note: most by name, the hundreds of small peoples of the 1492 Americas, 1600–1815 Australia and similar surveys through *umbrella* notes that claim unclaimed polygons inside a box and date range (`npm run umbrella` writes `src/data/notes/umbrella.json`).
- **Timeline events**: about 400, filed by world area. `npm run coverage` checks that every area has notes in every period and events in every millennium before 3000 BC and every 500 years after; 35 deep-prehistory cells without a precisely dated event are listed with their reasons in `src/data/notes/events.ts`.
- Tests check that every `match` name exists in the snapshots and links within its note's dates, and that no name meaning only a modern state appears before that state existed.

To regenerate `public/data/`, download the raw `world_*.geojson` files into `data-raw/` and run `npm run data` (about 2 minutes). `npm run data:plates` rebuilds only the plate data (it downloads the model on first run); `npm run data:dinos` rebuilds the dinosaur finds (after the plate data).

Known limits of the source that can't be fixed by renaming: the Holy Roman Empire has no polygon in 1783 and 1800, and some polygons (e.g. "Ming Empire and Northern Yuan" in 1400) merge two states into one shape.

## Rendering

The map is a globe (orthographic view) drawn with WebGL2 (`src/gl/`):

- **Land** is rotated per plate to the current geological age and turned to the view in the vertex shader. The far hemisphere lies beyond the far clipping plane, so the GPU cuts shapes exactly at the horizon; long edges are subdivided so shapes follow the curve of the globe.
- **Territories** are stored pre-projected (Natural Earth, metres); the mesh worker unprojects them to lon/lat and joins shapes cut at the antimeridian. They are drawn to an offscreen buffer, then composited once with shared translucency and a watercolour wobble.
- **Lines** are screen-space quads, so widths and dashes stay constant at any zoom; they are cut at the horizon per fragment.
- **Sea, limb shading and outline** are drawn per pixel over the globe's disc.
- **Picking** (hover, click) renders territory ids into a one-pixel buffer.
- Meshes are triangulated in a Web Worker (`src/gl/mesh.worker.ts`). Labels, capitals and the prehistory and deep-time layers are an SVG overlay, projected with d3's orthographic projection and hidden behind the horizon.

