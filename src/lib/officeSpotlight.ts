/**
 * The contact map's shared "active office" — one small store read by the map
 * bird (lib/mapFlight.ts) and the map / office columns (MapMotion.tsx).
 *
 * Three sources, in priority order:
 *   hover      — an office column (or a pin) hovered or focused: the user's
 *                explicit, momentary attention
 *   proximity  — the cursor's map bird drawn to a pin
 *   selection  — a pin clicked / tapped / activated by keyboard (persists until
 *                another pin, an empty map click or Escape)
 * active = hover ?? proximity ?? selection. Where the bird should fly when no
 * cursor is on the map: hover ?? selection.
 */
export type OfficeId = "uae" | "india";
type Source = "hover" | "proximity" | "selection";

const sources: Record<Source, OfficeId | null> = { hover: null, proximity: null, selection: null };
const listeners = new Set<() => void>();

export const spotlight = {
  set(source: Source, id: OfficeId | null) {
    if (sources[source] === id) return;
    sources[source] = id;
    listeners.forEach((f) => f());
  },
  get(source: Source) {
    return sources[source];
  },
  get active(): OfficeId | null {
    return sources.hover ?? sources.proximity ?? sources.selection;
  },
  /** Destination for the bird when the cursor is not on the map. */
  get goal(): OfficeId | null {
    return sources.hover ?? sources.selection;
  },
  subscribe(f: () => void) {
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  },
};
