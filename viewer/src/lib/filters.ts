import type { Location } from "./types";

export interface LocationFilter {
  hiddenCategories: ReadonlySet<number>;
  found: ReadonlySet<number>;
  hideFound: boolean;
  query: string;
}

export function normalize(text: string | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function isLocationVisible(location: Location, filter: LocationFilter): boolean {
  if (filter.hideFound && filter.found.has(location.id)) return false;
  if (filter.query) return location.searchText.includes(filter.query);
  return !filter.hiddenCategories.has(location.categoryId);
}

export type Visibility = "all" | "some" | "none";

export function visibilityOf(categoryIds: readonly number[], hiddenCategories: ReadonlySet<number>): Visibility {
  const hidden = categoryIds.filter((id) => hiddenCategories.has(id)).length;
  if (hidden === 0) return "all";
  return hidden === categoryIds.length ? "none" : "some";
}
