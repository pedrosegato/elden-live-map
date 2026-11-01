const COPY = {
  mapLabel: "Map",
  searchLabel: "Search markers",
  searchPlaceholder: "Search markers",
  clearSearch: "Clear search",
  allCategories: "All categories",
  showGroup: "Show {group} markers",
  hideFound: "Hide found",
  foundCount: "{found} of {total} found",
  noResults: "Nothing matches “{query}”.",
  markFound: "Mark as found",
  found: "Found",
  closeDetails: "Close",
  video: "Video, needs internet",
  enlargePhoto: "Enlarge photo {index}",
  previousPhoto: "Previous photo",
  nextPhoto: "Next photo",
  closePhoto: "Close photo",
  photoCount: "{index} / {total}",
  follow: "Follow player",
  legend: "Legend",
  openPanel: "Open the map legend",
  closePanel: "Close the map legend",
  loadingTitle: "Unfolding the map",
  errorTitle: "The map could not be read",
  errorDetail: "No dataset was found at /data/manifest.json. Copy your dataset into the mod folder and reload.",
  connectingTitle: "Connecting to the game",
  offlineTitle: "The game is not running",
  menuTitle: "Title screen",
} as const;

export type CopyKey = keyof typeof COPY;

export function t(key: CopyKey, values: Record<string, string | number> = {}): string {
  return COPY[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}

const numberFormat = new Intl.NumberFormat("en");

export const formatCount = (value: number) => numberFormat.format(value);
