import { describe, expect, it } from "vitest";
import { bearingOnMap, findArea, fromWorld, invertMatrix, locateOnMap, parseMapId, toWorld } from "./coordinates";
import type { AffineMatrix, Calibration } from "./types";

const matrix: AffineMatrix = [
  [0.001, 0, -10],
  [0, 0.002, 5],
];
const calibration: Calibration = {
  areas: {
    m60: { map: "lands-between", matrix },
    m10_00_00: {
      map: "lands-between",
      matrix: [
        [1, 0, 0],
        [0, 1, 0],
      ],
    },
  },
};

describe("parseMapId", () => {
  it("splits a block id", () => {
    expect(parseMapId("m60_42_36_00")).toEqual({ area: "m60", blockX: 42, blockZ: 36 });
  });

  it("rejects malformed ids", () => {
    expect(parseMapId("m60_42_36")).toBeNull();
  });
});

describe("toWorld / fromWorld", () => {
  it("adds the grid offset on gridded areas", () => {
    expect(toWorld("m60_42_36_00", [10, 3, 20])).toEqual([42 * 256 + 10, 36 * 256 + 20]);
  });

  it("keeps local coordinates on other areas", () => {
    expect(toWorld("m10_00_00_00", [10, 3, 20])).toEqual([10, 20]);
  });

  it("round-trips through the grid", () => {
    const { mapId, position } = fromWorld("m60", [42 * 256 + 10, 36 * 256 + 20], 3);
    expect(mapId).toBe("m60_42_36_00");
    expect(toWorld(mapId, position)).toEqual([42 * 256 + 10, 36 * 256 + 20]);
  });
});

describe("calibration", () => {
  it("prefers the most specific area", () => {
    expect(findArea(calibration, "m10_00_00_00")).toBe(calibration.areas.m10_00_00);
    expect(findArea(calibration, "m60_42_36_00")).toBe(calibration.areas.m60);
    expect(findArea(calibration, "m11_00_00_00")).toBeNull();
  });

  it("inverts the affine transform", () => {
    const world: [number, number] = [10_800, 9_300];
    const lngLat = locateOnMap(calibration, { mapId: "m60_42_36_00", position: [48, 0, 84], yaw: 0 })?.lngLat ?? [0, 0];
    expect(invertMatrix(matrix, lngLat)[0]).toBeCloseTo(world[0]);
    expect(invertMatrix(matrix, lngLat)[1]).toBeCloseTo(world[1]);
  });

  it("returns null where the area is not calibrated", () => {
    expect(locateOnMap(calibration, { mapId: "m12_01_00_00", position: [0, 0, 0], yaw: 0 })).toBeNull();
  });

  it("turns yaw into a compass bearing", () => {
    expect(bearingOnMap(matrix, 0)).toBeCloseTo(0);
    expect(bearingOnMap(matrix, Math.PI / 2)).toBeCloseTo(90);
  });
});
