import { dataUrl, index } from "virtual:marker-icons";
import type { Map as MapLibreMap, MissingStyleImageResolver } from "maplibre-gl";
import type { MarkerIcons } from "./types";

const ICON_PIXEL_RATIO = 2;
const PLAYER_ROOT = `${import.meta.env.BASE_URL}icons/`;

export const PLAYER_ICONS = {
  base: `${PLAYER_ROOT}player-base.png`,
  direction: `${PLAYER_ROOT}player-direction.png`,

  pivot: [0.471, 0.5867],

  bustToNeedle: 0.3,

  bustCentre: [0.4446, 0.4652],
} as const;

export async function loadMarkerIcons(): Promise<MarkerIcons> {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error(`${response.status} ${dataUrl}`);
  const all = new Blob([await response.arrayBuffer()]);
  const urls = new Map<string, string>();
  const bitmaps = new Map<string, Promise<ImageBitmap>>();
  const blob = (id: string) => {
    const entry = index[id];
    return entry && all.slice(entry[0], entry[0] + entry[1], "image/png");
  };
  return {
    url(id) {
      const image = urls.has(id) ? undefined : blob(id);
      if (image) urls.set(id, URL.createObjectURL(image));
      return urls.get(id);
    },
    bitmap(id) {
      const image = bitmaps.has(id) ? undefined : blob(id);
      if (image) bitmaps.set(id, createImageBitmap(image));
      return bitmaps.get(id) ?? Promise.resolve(undefined);
    },
  };
}

export function markerIconResolver(map: MapLibreMap, icons: MarkerIcons): MissingStyleImageResolver {
  return async (id) => {
    const bitmap = await icons.bitmap(id);
    if (bitmap && !map.hasImage(id)) map.addImage(id, bitmap, { pixelRatio: ICON_PIXEL_RATIO });
  };
}
