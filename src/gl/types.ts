// Messages between the map and the mesh worker.

export interface TerritoryRequest {
  kind: 'territories';
  url: string;
  /** Source indices in draw order; given for full detail so ids match the simplified mesh. */
  order?: number[];
}

export interface LandRequest {
  kind: 'land';
  url: string;
  /** Plate id → row in the rotation texture. */
  plateIndex: Record<number, number>;
}

export type WorkerRequest = TerritoryRequest | LandRequest;

export interface TerritoryMeta {
  name: string;
  subjecto: string | null;
  partof: string | null;
  precision: number | null;
  /** Bounds in degrees: [west, south, east, north] (west > east when it crosses 180°). */
  bbox: [number, number, number, number];
  /** Label anchor (lon/lat) and area of the largest part (m², Natural Earth projection). */
  label: { lon: number; lat: number; area: number };
}

interface MeshBuffers {
  fillPos: Float32Array;
  /** Per vertex: feature id (territories) or piece id (land). */
  fillIds: Uint32Array;
  fillIndex: Uint32Array;
  /** Line segments: territories [aLon, aLat, bLon, bLat, along (m)], land [aLon, aLat, bLon, bLat]. */
  linePos: Float32Array;
  lineIds: Uint32Array;
}

export interface TerritoryMesh extends MeshBuffers {
  kind: 'territories';
  /** order[id] = source index of the feature drawn with that id. */
  order: number[];
  meta: TerritoryMeta[];
}

export interface LandMesh extends MeshBuffers {
  kind: 'land';
  /** Per piece: anchorLon, anchorLat, plateIndex, fromAge, toAge. */
  pieces: Float32Array;
}
