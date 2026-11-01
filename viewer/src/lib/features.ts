import type { LocationFeature } from "../map/mapStyle";
import type { Location, MapData } from "./types";

export function toFeatures(location: Location, mapData: MapData, found: ReadonlySet<number>): LocationFeature[] {
  const icon = location.icon ?? mapData.categoriesById.get(location.categoryId)?.icon ?? "";
  const properties = {
    id: location.id,
    icon,
    found: found.has(location.id),
  };
  return location.positions.map((coordinates) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties,
  }));
}
