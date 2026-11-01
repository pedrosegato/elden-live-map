import { normalize } from "./filters";
import { loadMarkerIcons } from "./icons";
import type { Calibration, Category, Dataset, IndexedLocation, Location, MapData, MapEntry, Region } from "./types";

interface RawMapFile {
  groups: { id: number; title: string; categoryIds: number[] }[];
  categories: Category[];
  regions: Region[];
  locations: Omit<Location, "searchText">[];
}

interface RawManifest {
  maps: MapEntry[];
  calibration?: string;
}

const DATA_ROOT = new URL("/data/", window.location.origin).href;

export const dataUrl = (path: string) => DATA_ROOT + path;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(dataUrl(path));
  if (!response.ok) {
    throw new Error(`${response.status} ${path}`);
  }
  return response.json() as Promise<T>;
}

async function loadCalibration(path: string | undefined): Promise<Calibration | null> {
  if (!path) return null;
  return fetchJson<Calibration>(path).catch(() => null);
}

function indexMap(entry: MapEntry, raw: RawMapFile): MapData {
  const categoriesById = new Map(raw.categories.map((category) => [category.id, category]));
  const countsByCategory = new Map<number, number>();
  const locations = raw.locations.map((location) => {
    countsByCategory.set(location.categoryId, (countsByCategory.get(location.categoryId) ?? 0) + 1);
    return { ...location, searchText: normalize(location.title) };
  });
  const groups = raw.groups.map((group) => ({
    id: group.id,
    title: group.title,
    categories: group.categoryIds.flatMap((id) => categoriesById.get(id) ?? []),
  }));
  return { entry, locations, regions: raw.regions, categoriesById, countsByCategory, groups };
}

export async function loadDataset(): Promise<Dataset> {
  const manifest = await fetchJson<RawManifest>("manifest.json");
  const [maps, calibration, icons] = await Promise.all([
    Promise.all(manifest.maps.map(async (entry) => indexMap(entry, await fetchJson<RawMapFile>(entry.data)))),
    loadCalibration(manifest.calibration),
    loadMarkerIcons(),
  ]);
  const locationIndex = new Map<number, IndexedLocation>(
    maps.flatMap((mapData) => mapData.locations.map((location) => [location.id, { mapData, location }] as const)),
  );
  return { maps, calibration, icons, locationIndex };
}
