// A switchable map layer. MapView tells every layer the current time and zoom;
// the layer decides what to show, and loads its data only once it is enabled
// and within its span.
import type { Span, TimeState } from '../time';

export type LayerGroup = 'earth' | 'life' | 'people';

export interface MapLayer {
  readonly id: string;
  readonly title: string;
  readonly group: LayerGroup;
  /** When the layer has anything to show. */
  readonly span: Span;
  readonly defaultOn: boolean;
  setEnabled(on: boolean): void;
  update(t: TimeState): void;
  /** Zoom factor changed (for overlays kept at a constant screen size). */
  scale?(k: number): void;
  /** The map was resized (the projection changed). */
  resize?(): void;
}

/** A layer that only shows or hides something MapView already draws. */
export function toggleLayer(def: Omit<MapLayer, 'setEnabled' | 'update'>, apply: (on: boolean) => void): MapLayer {
  return { ...def, setEnabled: apply, update: () => {} };
}
