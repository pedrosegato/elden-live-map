import type { Map as MapLibreMap } from "maplibre-gl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { markerIconResolver } from "../lib/icons";
import type { MapData, MarkerIcons } from "../lib/types";
import { MapContext } from "./MapContext";
import { maplibregl } from "./maplibre";
import { buildStyle, EMPTY_STYLE, OVERZOOM_LEVELS } from "./mapStyle";

interface MapViewProps {
  mapData: MapData;
  icons: MarkerIcons;
  children: ReactNode;
}

export function MapView({ mapData, icons, children }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [loadedMapId, setLoadedMapId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: EMPTY_STYLE,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: false,
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    const resizeObserver = new ResizeObserver(() => instance.resize());
    resizeObserver.observe(containerRef.current);
    setMap(instance);
    return () => {
      resizeObserver.disconnect();
      instance.remove();
    };
  }, []);

  useEffect(() => {
    if (map) map.setMissingStyleImageResolver(markerIconResolver(map, icons));
  }, [map, icons]);

  useEffect(() => {
    if (!map) return;
    const { entry } = mapData;
    const onStyleLoad = () => setLoadedMapId(entry.id);
    map.setMinZoom(entry.tiles.minzoom);
    map.setMaxZoom(entry.tiles.maxzoom + OVERZOOM_LEVELS);
    map.setMaxBounds(null);
    map.jumpTo({ center: entry.view.center, zoom: entry.view.zoom });
    map.setMaxBounds(entry.tiles.bounds);
    map.once("style.load", onStyleLoad);
    map.setStyle(buildStyle(entry), { diff: false });
    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [map, mapData]);

  const state = useMemo(() => (map ? { map, loadedMapId } : null), [map, loadedMapId]);

  return (
    <div className="relative size-full overflow-hidden bg-ink-950">
      <div ref={containerRef} className="size-full" />
      {state && <MapContext value={state}>{children}</MapContext>}
    </div>
  );
}
