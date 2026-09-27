// Snapshot index and the year → snapshot bracketing used by the timeline.

const BASE = `${import.meta.env.BASE_URL}data/`;

let manifest: Promise<number[]> | null = null;
export function loadManifest(): Promise<number[]> {
  return (manifest ??= fetch(`${BASE}manifest.json`).then((r) => r.json()));
}

let names: Promise<Record<string, number[]>> | null = null;
export function loadNameIndex(): Promise<Record<string, number[]>> {
  return (names ??= fetch(`${BASE}names.json`).then((r) => r.json()));
}

/** Snapshot pair bracketing `year`, and how far between them we are (0..1). */
export function bracket(years: number[], year: number): { a: number; b: number; t: number } {
  if (year <= years[0]) return { a: years[0], b: years[0], t: 0 };
  const last = years[years.length - 1];
  if (year >= last) return { a: last, b: last, t: 0 };
  let i = 0;
  while (years[i + 1] <= year) i++;
  const a = years[i];
  const b = years[i + 1];
  return { a, b, t: (year - a) / (b - a) };
}
