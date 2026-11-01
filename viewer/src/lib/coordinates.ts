import type { AffineMatrix, Calibration, CalibrationArea, LngLat } from "./types";

const GRID_SIZE_METERS = 256;
const GRID_AREAS = new Set(["m60", "m61"]);
const MAP_ID_PATTERN = /^m(\d{2})_(\d{2})_(\d{2})_(\d{2})$/;

export interface BlockId {
  area: string;
  blockX: number;
  blockZ: number;
}

export interface Located {
  mapId: string;
  world: [number, number];
  lngLat: LngLat;
  bearing: number;
}

export function parseMapId(mapId: string): BlockId | null {
  const match = MAP_ID_PATTERN.exec(mapId);
  if (!match) return null;
  const [, area, blockX, blockZ] = match;
  return { area: `m${area}`, blockX: Number(blockX), blockZ: Number(blockZ) };
}

export function toWorld(mapId: string, [x, , z]: [number, number, number]): [number, number] | null {
  const block = parseMapId(mapId);
  if (!block) return null;
  if (!GRID_AREAS.has(block.area)) return [x, z];
  return [block.blockX * GRID_SIZE_METERS + x, block.blockZ * GRID_SIZE_METERS + z];
}

export function fromWorld(
  area: string,
  [worldX, worldZ]: [number, number],
  height = 0,
): { mapId: string; position: [number, number, number] } {
  const blockX = Math.floor(worldX / GRID_SIZE_METERS);
  const blockZ = Math.floor(worldZ / GRID_SIZE_METERS);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    mapId: `${area}_${pad(blockX)}_${pad(blockZ)}_00`,
    position: [worldX - blockX * GRID_SIZE_METERS, height, worldZ - blockZ * GRID_SIZE_METERS],
  };
}

export function findArea(calibration: Calibration | null, mapId: string): CalibrationArea | null {
  const parts = mapId.split("_");
  for (let length = parts.length; length > 0; length--) {
    const area = calibration?.areas[parts.slice(0, length).join("_")];
    if (area) return area;
  }
  return null;
}

export function applyMatrix([[a, b, c], [d, e, f]]: AffineMatrix, [worldX, worldZ]: [number, number]): LngLat {
  return [a * worldX + b * worldZ + c, d * worldX + e * worldZ + f];
}

export function invertMatrix([[a, b, c], [d, e, f]]: AffineMatrix, [lng, lat]: LngLat): [number, number] {
  const determinant = a * e - b * d;
  const x = lng - c;
  const y = lat - f;
  return [(e * x - b * y) / determinant, (a * y - d * x) / determinant];
}

export function bearingOnMap([[a, b], [d, e]]: AffineMatrix, yaw: number): number {
  const directionX = Math.sin(yaw);
  const directionZ = Math.cos(yaw);
  const east = a * directionX + b * directionZ;
  const north = d * directionX + e * directionZ;
  return (Math.atan2(east, north) * 180) / Math.PI;
}

export function locateOnMap(
  calibration: Calibration | null,
  sample: { mapId: string; position: [number, number, number]; yaw: number },
): Located | null {
  const area = findArea(calibration, sample.mapId);
  const world = toWorld(sample.mapId, sample.position);
  if (!area || !world) return null;
  return {
    mapId: area.map,
    world,
    lngLat: applyMatrix(area.matrix, world),
    bearing: bearingOnMap(area.matrix, sample.yaw),
  };
}
