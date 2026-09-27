// World areas used to measure how evenly the notes cover the world
// (scripts/coverage.ts). A civilisation's display `region` maps to one or more
// areas; entries that span several (empires, "Global") list theirs explicitly.
//
// An empire counts only where it is *about* that area: the British Empire
// counts for Europe, not for India or Australia, which need notes of their own.

export const AREAS = [
  'Near East',
  'Iran',
  'North Africa',
  'West Africa',
  'East Africa',
  'Central & Southern Africa',
  'Europe',
  'Steppe & Central Asia',
  'South Asia',
  'China',
  'Korea & Japan',
  'Southeast Asia',
  'Oceania',
  'North America',
  'Mesoamerica',
  'South America',
  'Arctic',
] as const;

export type Area = (typeof AREAS)[number];

/** Display region → areas. Regions that span several areas are left out on purpose. */
export const REGION_AREAS: Record<string, Area[]> = {
  Mesopotamia: ['Near East'],
  'Near East': ['Near East'],
  Anatolia: ['Near East'],
  Iran: ['Iran'],
  'North Africa': ['North Africa'],
  Nubia: ['North Africa'],
  'West Africa': ['West Africa'],
  'East Africa': ['East Africa'],
  'Southern Africa': ['Central & Southern Africa'],
  'Central Africa': ['Central & Southern Africa'],
  Aegean: ['Europe'],
  'Western Europe': ['Europe'],
  'Central Europe': ['Europe'],
  'Eastern Europe': ['Europe'],
  'Northern Europe': ['Europe'],
  Europe: ['Europe'],
  Steppe: ['Steppe & Central Asia'],
  'Central Asia': ['Steppe & Central Asia'],
  'South Asia': ['South Asia'],
  'East Asia': ['China'],
  China: ['China'],
  Korea: ['Korea & Japan'],
  Japan: ['Korea & Japan'],
  'Southeast Asia': ['Southeast Asia'],
  Oceania: ['Oceania'],
  Polynesia: ['Oceania'],
  'North America': ['North America'],
  Mesoamerica: ['Mesoamerica'],
  Andes: ['South America'],
  'South America': ['South America'],
  Arctic: ['Arctic'],
};

/** Areas for a note: its explicit list, or the ones its region maps to. */
export function areasFor(id: string, region: string, explicit?: Area[]): Area[] {
  const areas = explicit ?? REGION_AREAS[region];
  if (!areas?.length) throw new Error(`${id}: region "${region}" spans several areas; list them in \`areas\``);
  return areas;
}
