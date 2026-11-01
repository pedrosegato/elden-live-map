import { useEffect } from "react";
import type { Region } from "../lib/types";
import { useMapState } from "./MapContext";
import { maplibregl } from "./maplibre";

const MIN_SCALE = 0.6;

const REGION_LABEL_CLASS =
  "pointer-events-none font-display text-[calc(0.95rem*var(--region-label-scale,1))] font-semibold tracking-[0.16em] whitespace-nowrap text-bone-100 uppercase [text-shadow:0_0.06em_0.2em_rgb(0_0_0/0.95),0_0_0.6em_rgb(0_0_0/0.8)]";

interface RegionLabelsProps {
  regions: Region[];
  referenceZoom: number;
}

export function RegionLabels({ regions, referenceZoom }: RegionLabelsProps) {
  const { map } = useMapState();

  useEffect(() => {
    const container = map.getContainer();
    const markers = regions.map((region) => {
      const label = document.createElement("div");
      label.className = REGION_LABEL_CLASS;
      label.textContent = region.title;
      return new maplibregl.Marker({ element: label }).setLngLat(region.position).addTo(map);
    });
    const scale = () => {
      const factor = Math.max(2 ** (map.getZoom() - referenceZoom), MIN_SCALE);
      container.style.setProperty("--region-label-scale", String(factor));
    };
    scale();
    map.on("zoom", scale);
    return () => {
      map.off("zoom", scale);
      for (const marker of markers) marker.remove();
    };
  }, [map, regions, referenceZoom]);

  return null;
}
