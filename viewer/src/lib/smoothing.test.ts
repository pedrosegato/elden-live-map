import { describe, expect, it } from "vitest";
import { approach, approachAngle, isTeleport, smoothingFactor, type TrackedSample } from "./smoothing";

describe("smoothingFactor", () => {
  it("is frame-rate independent", () => {
    const oneStep = smoothingFactor(16, 70);
    const twoHalfSteps = 1 - (1 - smoothingFactor(8, 70)) ** 2;
    expect(oneStep).toBeCloseTo(twoHalfSteps);
  });
});

describe("approach", () => {
  it("moves part of the way to the target", () => {
    expect(approach(0, 10, 0.25)).toBe(2.5);
  });
});

describe("approachAngle", () => {
  it("turns through the shortest arc", () => {
    expect(approachAngle(350, 10, 0.5)).toBeCloseTo(360);
    expect(approachAngle(10, 350, 0.5)).toBeCloseTo(0);
  });
});

describe("isTeleport", () => {
  const sample = (t: number, x: number, mapId = "lands-between"): TrackedSample => ({ t, mapId, world: [x, 0] });

  it("accepts running speed", () => {
    expect(isTeleport(sample(0, 0), sample(1000, 20), 60)).toBe(false);
  });

  it("flags fast travel", () => {
    expect(isTeleport(sample(0, 0), sample(33, 400), 60)).toBe(true);
  });

  it("flags a change of map", () => {
    expect(isTeleport(sample(0, 0), sample(33, 0, "realm-of-shadow"), 60)).toBe(true);
  });
});
