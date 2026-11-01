import type { StyleSpecification } from "maplibre-gl";
import { dataUrl } from "../lib/dataset";
import type { LngLat, MapEntry } from "../lib/types";

export const LOCATIONS_LAYER = "locations";
export const OVERZOOM_LEVELS = 2;

const ICON_SCALE_AT_MIN_ZOOM = 0.45;
const ICON_SCALE_MID = 0.8;
const ICON_SCALE_MID_OFFSET = 4;

export function iconScaleAt(zoom: number, minzoom: number, maxzoom: number): number {
  const midZoom = minzoom + ICON_SCALE_MID_OFFSET;
  if (zoom <= minzoom) return ICON_SCALE_AT_MIN_ZOOM;
  if (zoom <= midZoom) {
    return (
      ICON_SCALE_AT_MIN_ZOOM + ((zoom - minzoom) / ICON_SCALE_MID_OFFSET) * (ICON_SCALE_MID - ICON_SCALE_AT_MIN_ZOOM)
    );
  }
  if (zoom >= maxzoom) return 1;
  return ICON_SCALE_MID + ((zoom - midZoom) / (maxzoom - midZoom)) * (1 - ICON_SCALE_MID);
}

export interface LocationFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: LngLat };
  properties: { id: number; icon: string; found: boolean };
}

export const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };

export function buildStyle(entry: MapEntry): StyleSpecification {
  const { tiles } = entry;
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        url: `pmtiles://${dataUrl(tiles.url)}`,
        tileSize: 256,
        minzoom: tiles.minzoom,
        maxzoom: tiles.maxzoom,
        bounds: tiles.bounds,
      },
      [LOCATIONS_LAYER]: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#0b0a08" } },
      { id: "basemap", type: "raster", source: "basemap", paint: { "raster-fade-duration": 0 } },
      {
        id: LOCATIONS_LAYER,
        type: "symbol",
        source: LOCATIONS_LAYER,
        layout: {
          "icon-image": ["get", "icon"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            tiles.minzoom,
            ICON_SCALE_AT_MIN_ZOOM,
            tiles.minzoom + ICON_SCALE_MID_OFFSET,
            ICON_SCALE_MID,
            tiles.maxzoom,
            1,
          ],
        },
        paint: { "icon-opacity": ["case", ["get", "found"], 0.35, 1] },
      },
    ],
  };
}
