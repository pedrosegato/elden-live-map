from __future__ import annotations

import re
import statistics

from game_params import grace_positions, legacy_links

GRACE_CATEGORY = "Site of Grace"
UNDERGROUND, UNDERGROUND_PREFIX, UNDERGROUND_GRID = "underground", "m12_", "m60"
OUTLIER_FACTOR = 4
TRIM_ROUNDS = 4

Point = tuple[float, float]
Matrix = list[list[float]]


def name_key(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def solve(system: list[list[float]], values: list[float]) -> list[float]:
    rows = [row[:] + [value] for row, value in zip(system, values)]
    size = len(rows)
    for column in range(size):
        pivot = max(range(column, size), key=lambda row: abs(rows[row][column]))
        rows[column], rows[pivot] = rows[pivot], rows[column]
        for row in range(size):
            if row != column:
                factor = rows[row][column] / rows[column][column]
                rows[row] = [left - factor * right for left, right in zip(rows[row], rows[column])]
    return [rows[row][size] / rows[row][row] for row in range(size)]


def least_squares(pairs: list[tuple[Point, Point]]) -> Matrix:
    normal = [[0.0] * 3 for _ in range(3)]
    targets = [[0.0] * 3, [0.0] * 3]
    for (world_x, world_z), lng_lat in pairs:
        terms = (world_x, world_z, 1.0)
        for i in range(3):
            for j in range(3):
                normal[i][j] += terms[i] * terms[j]
            for axis in range(2):
                targets[axis][i] += terms[i] * lng_lat[axis]
    return [solve(normal, targets[0]), solve(normal, targets[1])]


def apply(matrix: Matrix, world: Point) -> Point:
    return tuple(row[0] * world[0] + row[1] * world[1] + row[2] for row in matrix)


def distance(matrix: Matrix, pair: tuple[Point, Point]) -> float:
    (lng, lat), (target_lng, target_lat) = apply(matrix, pair[0]), pair[1]
    return ((lng - target_lng) ** 2 + (lat - target_lat) ** 2) ** 0.5


def fit(pairs: list[tuple[Point, Point]]) -> tuple[Matrix, list[float]]:
    inliers = pairs
    for _ in range(TRIM_ROUNDS):
        matrix = least_squares(inliers)
        limit = statistics.median(distance(matrix, pair) for pair in inliers) * OUTLIER_FACTOR
        inliers = [pair for pair in pairs if distance(matrix, pair) <= limit]
    matrix = least_squares(inliers)
    meters_per_unit = 1 / (matrix[0][0] ** 2 + matrix[0][1] ** 2) ** 0.5
    return matrix, sorted(distance(matrix, pair) * meters_per_unit for pair in inliers)


def shifted(matrix: Matrix, shift: Point) -> Matrix:
    return [[a, b, a * shift[0] + b * shift[1] + c] for a, b, c in matrix]


def resolve_frames(links: list, resolved: dict[str, tuple[str, Point]]) -> dict[str, tuple[str, Point]]:
    while True:
        found = {}
        for source, target, (dx, dz), _ in links:
            if source not in resolved and source not in found and target in resolved:
                grid, (x, z) = resolved[target]
                found[source] = (grid, (x + dx, z + dz))
        if not found:
            return resolved
        resolved = resolved | found


def legacy_shifts(grids: list[str]) -> dict[str, tuple[str, Point]]:
    links = sorted(legacy_links(), key=lambda link: not link[3])
    forward = resolve_frames(links, {grid: (grid, (0.0, 0.0)) for grid in grids})
    backward = [(target, source, (-dx, -dz), base) for source, target, (dx, dz), base in links]
    resolved = resolve_frames(backward, forward)
    return {frame: value for frame, value in resolved.items() if frame not in grids}


def fit_group(frame: str, grid: str) -> str:
    return UNDERGROUND if frame.startswith(UNDERGROUND_PREFIX) else grid


def calibrate(maps: dict[str, tuple[str, dict]]) -> dict:
    shifts = legacy_shifts(list(maps))
    graces: dict[tuple[str, str], list[Point]] = {}
    for (frame, name), spots in grace_positions().items():
        if frame in maps:
            group, (dx, dz) = frame, (0.0, 0.0)
        elif frame.startswith(UNDERGROUND_PREFIX) and frame in shifts:
            group, (dx, dz) = UNDERGROUND, shifts[frame][1]
        else:
            continue
        graces.setdefault((group, name_key(name)), []).extend((x + dx, z + dz) for x, z in spots)
    fits = {}
    for group, (map_id, converted) in {**maps, UNDERGROUND: maps[UNDERGROUND_GRID]}.items():
        grace_categories = {category["id"] for category in converted["categories"] if category["title"] == GRACE_CATEGORY}
        pairs = [
            (spots[0], tuple(location["positions"][0]))
            for location in converted["locations"]
            if location["categoryId"] in grace_categories
            and len(spots := graces.get((group, name_key(location["title"])), [])) == 1
        ]
        matrix, errors = fit(pairs)
        fits[group] = {"map": map_id, "matrix": matrix}
        print(f"calibration {group}: {len(errors)} of {len(pairs)} graces, median error {statistics.median(errors):.1f} m, max {errors[-1]:.1f} m")
    areas = {grid: fits[grid] for grid in maps}
    for frame, (grid, shift) in sorted(shifts.items()):
        area = fits[fit_group(frame, grid)]
        areas[frame] = {"map": area["map"], "matrix": shifted(area["matrix"], shift)}
    print(f"calibration: {len(shifts)} legacy maps placed")
    return {"areas": areas}
