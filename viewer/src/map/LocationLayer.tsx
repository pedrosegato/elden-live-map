import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { LngLat } from "../lib/types";
import { useMapState } from "./MapContext";
import { LOCATIONS_LAYER, type LocationFeature } from "./mapStyle";

interface LocationLayerProps {
  features: LocationFeature[];
  onSelect: (locationId: number, lngLat: LngLat) => void;
}

export function LocationLayer({ features, onSelect }: LocationLayerProps) {
  const { map, loadedMapId } = useMapState();
  const selectRef = useRef(onSelect);

  useEffect(() => {
    selectRef.current = onSelect;
  });

  useEffect(() => {
    if (!loadedMapId) return;
    map.getSource<GeoJSONSource>(LOCATIONS_LAYER)?.setData({ type: "FeatureCollection", features });
  }, [map, loadedMapId, features]);

  useEffect(() => {
    if (!loadedMapId) return;
    const canvas = map.getCanvas();
    const select = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (feature?.geometry.type !== "Point") return;
      selectRef.current(Number(feature.properties.id), feature.geometry.coordinates as LngLat);
    };
    const pointer = () => {
      canvas.style.cursor = "pointer";
    };
    const release = () => {
      canvas.style.cursor = "";
    };
    map.on("click", LOCATIONS_LAYER, select);
    map.on("mouseenter", LOCATIONS_LAYER, pointer);
    map.on("mouseleave", LOCATIONS_LAYER, release);
    return () => {
      map.off("click", LOCATIONS_LAYER, select);
      map.off("mouseenter", LOCATIONS_LAYER, pointer);
      map.off("mouseleave", LOCATIONS_LAYER, release);
    };
  }, [map, loadedMapId]);

  return null;
}
