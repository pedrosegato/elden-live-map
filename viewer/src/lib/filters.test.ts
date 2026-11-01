import { describe, expect, it } from "vitest";
import { isLocationVisible, type LocationFilter, normalize, visibilityOf } from "./filters";
import type { Location } from "./types";

const location: Location = {
  id: 1,
  categoryId: 10,
  title: "Stormveil Castle",
  positions: [[0, 0]],
  searchText: normalize("Stormveil Castle"),
};

const filter = (overrides: Partial<LocationFilter> = {}): LocationFilter => ({
  hiddenCategories: new Set(),
  found: new Set(),
  hideFound: false,
  query: "",
  ...overrides,
});

describe("normalize", () => {
  it("drops accents and case", () => {
    expect(normalize("  Érdtree ")).toBe("erdtree");
  });
});

describe("isLocationVisible", () => {
  it("respects hidden categories", () => {
    expect(isLocationVisible(location, filter({ hiddenCategories: new Set([10]) }))).toBe(false);
  });

  it("searches across hidden categories", () => {
    expect(isLocationVisible(location, filter({ hiddenCategories: new Set([10]), query: "stormveil" }))).toBe(true);
    expect(isLocationVisible(location, filter({ query: "leyndell" }))).toBe(false);
  });

  it("hides found locations only when asked", () => {
    expect(isLocationVisible(location, filter({ found: new Set([1]) }))).toBe(true);
    expect(isLocationVisible(location, filter({ found: new Set([1]), hideFound: true }))).toBe(false);
  });
});

describe("visibilityOf", () => {
  it("tells whether a set of categories is fully, partly or not shown", () => {
    expect(visibilityOf([1, 2], new Set())).toBe("all");
    expect(visibilityOf([1, 2], new Set([2]))).toBe("some");
    expect(visibilityOf([1, 2], new Set([1, 2, 3]))).toBe("none");
  });
});
