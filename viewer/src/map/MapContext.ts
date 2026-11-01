import type { Map as MapLibreMap } from "maplibre-gl";
import { createContext, useContext } from "react";

export interface MapState {
  map: MapLibreMap;
  loadedMapId: string | null;
}

export const MapContext = createContext<MapState | null>(null);

export function useMapState(): MapState {
  const state = useContext(MapContext);
  if (!state) throw new Error("useMapState must be used inside <MapView>");
  return state;
}
