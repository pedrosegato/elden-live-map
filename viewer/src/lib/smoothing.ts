export interface TrackedSample {
  t: number;
  mapId: string;
  world: [number, number];
}

export function smoothingFactor(elapsedMs: number, timeConstantMs: number): number {
  return 1 - Math.exp(-elapsedMs / timeConstantMs);
}

export function approach(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

export function approachAngle(currentDegrees: number, targetDegrees: number, factor: number): number {
  const delta = ((((targetDegrees - currentDegrees) % 360) + 540) % 360) - 180;
  return currentDegrees + delta * factor;
}

export function isTeleport(previous: TrackedSample | null, next: TrackedSample, maxSpeedMetersPerSecond: number) {
  if (!previous || previous.mapId !== next.mapId) return true;
  const elapsedSeconds = Math.max((next.t - previous.t) / 1000, 1 / 30);
  const distance = Math.hypot(next.world[0] - previous.world[0], next.world[1] - previous.world[1]);
  return distance / elapsedSeconds > maxSpeedMetersPerSecond;
}
