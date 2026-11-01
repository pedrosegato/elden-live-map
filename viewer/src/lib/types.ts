export type LngLat = [number, number];
export type Bounds = [number, number, number, number];
export type AffineMatrix = [[number, number, number], [number, number, number]];

export interface ImageMedia {
  type: "image";
  src: string;
  thumb?: string;
}

export interface VideoMedia {
  type: "video";
  url: string;
}

export type Media = ImageMedia | VideoMedia;

export interface Location {
  id: number;
  categoryId: number;
  title: string;
  description?: string;
  positions: LngLat[];
  media?: Media[];
  icon?: string;
  searchText: string;
}

export interface Category {
  id: number;
  title: string;
  icon: string;
}

export interface Group {
  id: number;
  title: string;
  categories: Category[];
}

export interface Region {
  title: string;
  position: LngLat;
}

export interface MapEntry {
  id: string;
  title: string;
  data: string;
  tiles: { url: string; minzoom: number; maxzoom: number; bounds: Bounds };
  view: { center: LngLat; zoom: number };
}

export interface MapData {
  entry: MapEntry;
  locations: Location[];
  regions: Region[];
  categoriesById: Map<number, Category>;
  countsByCategory: Map<number, number>;
  groups: Group[];
}

export interface CalibrationArea {
  map: string;
  matrix: AffineMatrix;
}

export interface Calibration {
  provisional?: boolean;
  areas: Record<string, CalibrationArea>;
}

export interface IndexedLocation {
  mapData: MapData;
  location: Location;
}

export interface MarkerIcons {
  url: (id: string) => string | undefined;
  bitmap: (id: string) => Promise<ImageBitmap | undefined>;
}

export interface Dataset {
  icons: MarkerIcons;
  maps: MapData[];
  calibration: Calibration | null;
  locationIndex: Map<number, IndexedLocation>;
}

export interface Profile {
  id: string;
  characterName: string;
  slot: number;
}

export type Session = { state: "menu" } | { state: "in-game"; profile: Profile };

export interface PositionSample {
  t: number;
  mapId: string;
  position: [number, number, number];
  yaw: number;
}

export type ConnectionStatus = "connecting" | "online" | "offline";

export interface Selection {
  locationId: number;
  lngLat: LngLat;
}
