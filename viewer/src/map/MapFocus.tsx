import { useEffect } from "react";
import type { LngLat } from "../lib/types";
import { useMapState } from "./MapContext";

const DETAIL_ZOOM_OFFSET = 4;
const POPUP_ROOM_BELOW = 0.3;

interface MapFocusProps {
  lngLat: LngLat;
  mapId: string;
}

export function MapFocus({ lngLat, mapId }: MapFocusProps) {
  const { map, loadedMapId } = useMapState();

  useEffect(() => {
    if (loadedMapId !== mapId) return;
    map.easeTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), map.getMinZoom() + DETAIL_ZOOM_OFFSET),
      offset: [0, -map.getContainer().clientHeight * POPUP_ROOM_BELOW],
    });
  }, [map, loadedMapId, mapId, lngLat]);

  return null;
}
