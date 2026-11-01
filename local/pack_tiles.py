from __future__ import annotations

import argparse
import json
from pathlib import Path

from pmtiles.tile import Compression, TileType, zxy_to_tileid
from pmtiles.writer import Writer

TILE_TYPES = {".jpg": TileType.JPEG, ".jpeg": TileType.JPEG, ".png": TileType.PNG, ".webp": TileType.WEBP}


def scan_tiles(directory: Path) -> list[tuple[int, Path]]:
    tiles = []
    for path in directory.glob("*/*/*.*"):
        if path.suffix.lower() not in TILE_TYPES:
            continue
        z, x, y = int(path.parent.parent.name), int(path.parent.name), int(path.stem)
        tiles.append((zxy_to_tileid(z, x, y), path))
    tiles.sort()
    return tiles


def to_e7(degrees: float) -> int:
    return round(degrees * 10_000_000)


def pack(directory: Path, output: Path, bounds: list[float], center: list[float], metadata: dict) -> dict:
    tiles = scan_tiles(directory)
    if not tiles:
        raise SystemExit(f"no tiles found in {directory}")
    tile_type = TILE_TYPES[tiles[0][1].suffix.lower()]
    west, south, east, north = bounds
    center_lng, center_lat, center_zoom = center

    output.parent.mkdir(parents=True, exist_ok=True)
    partial = output.with_name(output.name + ".part")
    with partial.open("wb") as file:
        writer = Writer(file)
        for tile_id, path in tiles:
            writer.write_tile(tile_id, path.read_bytes())
        writer.finalize(
            {
                "tile_type": tile_type,
                "tile_compression": Compression.NONE,
                "min_lon_e7": to_e7(west),
                "min_lat_e7": to_e7(south),
                "max_lon_e7": to_e7(east),
                "max_lat_e7": to_e7(north),
                "center_zoom": int(center_zoom),
                "center_lon_e7": to_e7(center_lng),
                "center_lat_e7": to_e7(center_lat),
            },
            metadata,
        )
    partial.replace(output)
    return {"tiles": len(tiles), "bytes": output.stat().st_size}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--bounds", type=float, nargs=4, metavar=("WEST", "SOUTH", "EAST", "NORTH"), required=True)
    parser.add_argument("--center", type=float, nargs=3, metavar=("LNG", "LAT", "ZOOM"), required=True)
    parser.add_argument("--name", default="")
    args = parser.parse_args()
    stats = pack(args.directory, args.output, args.bounds, args.center, {"name": args.name})
    print(json.dumps(stats))


if __name__ == "__main__":
    main()
