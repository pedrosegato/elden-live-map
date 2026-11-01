from __future__ import annotations

import argparse
from collections import Counter
import json
import re
import shutil
import urllib.parse
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from calibration import calibrate
from item_icons import apply_item_icons, build_index, export_menu_tabs
from native_icons import (
    PLAYER_FILES,
    apply_native_icons,
    available_icons,
    export_icons,
    mass_centre,
    place_key,
    ring_pivot,
    sprite_key,
    trimmed,
)
from pack_tiles import pack
from game_sprites import MAP_ICON_DIR as NATIVE_ICON_DIR
from game_params import map_point_icons
from game_sprites import export_map_icons, export_point_icons, export_sprites
from stamps import OUTPUT as STAMP_DIR
from stamps import main as draw_stamps

ROOT = Path(__file__).resolve().parent.parent
MARKER_ICONS = ROOT / "viewer" / "icons" / "markers"
PLAYER_ICONS = ROOT / "viewer" / "public" / "icons"

MAPS = {
    "the-lands-between": "lands-between",
    "the-shadow-realm": "realm-of-shadow",
}
LOCATION_LINK = re.compile(r"https?://(?:www\.)?mapgenie\.io/[^\s)\]]*?locationIds=(\d+)[^\s)\]]*")
COORDINATE_DECIMALS = 7
FULL_IMAGE_WIDTH = 1920
FULL_IMAGE_QUALITY = 82
THUMB_WIDTH = 640
THUMB_QUALITY = 76


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def point(lng, lat) -> list[float]:
    return [round(float(lng), COORDINATE_DECIMALS), round(float(lat), COORDINATE_DECIMALS)]


def rewrite_links(markdown: str) -> str:
    return LOCATION_LINK.sub(lambda match: f"#loc={match.group(1)}", markdown)


def media_stem(url: str) -> str:
    return Path(urllib.parse.urlsplit(url).path).stem


def convert_media(media: list[dict]) -> list[dict]:
    converted = []
    for item in media:
        if item.get("type") == "image" and item.get("url"):
            stem = media_stem(item["url"])
            converted.append({"type": "image", "src": f"media/{stem}.webp", "thumb": f"media/thumb/{stem}.webp"})
        elif item.get("url"):
            converted.append({"type": "video", "url": item["url"]})
    return converted


def encode_webp(job: tuple[Path, Path, Path]) -> int:
    from PIL import Image

    source, full, thumb = job
    if full.exists() and thumb.exists():
        return 0
    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((FULL_IMAGE_WIDTH, FULL_IMAGE_WIDTH))
        image.save(full, "WEBP", quality=FULL_IMAGE_QUALITY, method=6)
        image.thumbnail((THUMB_WIDTH, THUMB_WIDTH))
        image.save(thumb, "WEBP", quality=THUMB_QUALITY, method=6)
    return 1


def optimize_media(source: Path, output: Path) -> None:
    (output / "thumb").mkdir(parents=True, exist_ok=True)
    jobs = [
        (path, output / f"{path.stem}.webp", output / "thumb" / f"{path.stem}.webp")
        for path in sorted(source.iterdir())
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    ]
    with ProcessPoolExecutor() as pool:
        encoded = sum(pool.map(encode_webp, jobs, chunksize=16))
    print(f"media: {encoded} encoded, {len(jobs) - encoded} already up to date")


def convert_location(location: dict) -> dict:
    positions = [point(location["longitude"], location["latitude"])]
    for feature in location.get("features") or []:
        geometry = feature.get("geometry") or {}
        if geometry.get("type") == "Point":
            positions.append(point(*geometry["coordinates"]))
    converted = {
        "id": location["id"],
        "categoryId": location["category_id"],
        "title": location["title"],
        "positions": positions,
    }
    if location.get("description"):
        converted["description"] = rewrite_links(location["description"])
    media = convert_media(location.get("media") or [])
    if media:
        converted["media"] = media
    return converted


def convert_map(meta: dict, data: dict) -> dict:
    map_id = meta["map"]["id"]
    locations = [convert_location(location) for location in data["locations"] if location["map_id"] == map_id]
    used_categories = {location["categoryId"] for location in locations}
    categories = [
        {"id": category["id"], "title": category["title"], "icon": category["icon"]}
        for category in meta["categories"].values()
        if category["id"] in used_categories
    ]
    groups = []
    for group in meta["groups"]:
        category_ids = [category["id"] for category in group["categories"] if category["id"] in used_categories]
        if category_ids:
            groups.append({"id": group["id"], "title": group["title"], "categoryIds": category_ids})
    regions = [
        {"title": region["title"], "position": point(region["center_x"], region["center_y"])}
        for region in data["regions"]
        if region["map_id"] == map_id and region["parent_region_id"] is None and region["center_x"] is not None
    ]
    return {"groups": groups, "categories": categories, "regions": regions, "locations": locations}


def icon_method(icon: str) -> str:
    if icon.startswith(("native-marker-", "native-npc-")):
        return "generic stamp"
    if icon.startswith("native-stamp-"):
        return "drawn stamp"
    if icon.startswith("native-hud-"):
        return "HUD icon"
    return "game map icon"


def audit_rows(converted_map: dict, methods: dict[int, str], item_sources: dict[str, Path]):
    categories = {category["id"]: category for category in converted_map["categories"]}
    for location in converted_map["locations"]:
        category = categories[location["categoryId"]]
        icon = location.get("icon") or category["icon"]
        method = methods.get(location["id"]) or icon_method(icon)
        source = item_sources[icon].name if icon in item_sources else icon
        yield (location["title"], category["title"], icon, method, source)


def write_audit(path: Path, audit: Counter) -> None:
    rows = [
        {"title": title, "category": category, "icon": icon, "method": method, "source": source, "count": count}
        for (title, category, icon, method, source), count in sorted(audit.items(), key=lambda item: item[0][3])
    ]
    write_json(path, rows)


def build(source: Path, output: Path, skip_tiles: bool) -> None:
    raw_manifest = read_json(source / "manifest.json")
    export_sprites()
    export_map_icons()
    places = map_point_icons()
    point_slugs = export_point_icons(set(places.values()))
    place_icons = {place_key(name): point_slugs[icon_id] for name, icon_id in places.items() if icon_id in point_slugs}
    draw_stamps()
    icons = available_icons(NATIVE_ICON_DIR) | available_icons(STAMP_DIR)
    used_icons = set()
    export_menu_tabs()
    item_index = build_index()
    audit: Counter = Counter()
    used_item_icons: dict[str, Path] = {}
    manifest_maps = []
    converted_maps: dict[str, dict] = {}
    for raw in raw_manifest["maps"]:
        map_id = MAPS[raw["slug"]]
        meta = read_json(source / raw["meta"])
        data = read_json(source / raw["data"])
        converted = convert_map(meta, data)
        native_icons = apply_native_icons(converted, icons, place_icons)
        methods: dict[int, str] = {}
        used_item_icons |= apply_item_icons(converted, item_index, methods)
        shown = {entry.get("icon") for entry in (*converted["categories"], *converted["locations"])}
        used_icons |= {slug for slug in native_icons if sprite_key(slug) in shown}
        audit.update(audit_rows(converted, methods, used_item_icons))
        write_json(output / "maps" / f"{map_id}.json", converted)
        converted_maps[map_id] = converted

        tiles_path = f"tiles/{map_id}.pmtiles"
        entry = {
            "id": map_id,
            "title": raw["title"],
            "data": f"maps/{map_id}.json",
            "tiles": {
                "url": tiles_path,
                "minzoom": raw["minzoom"],
                "maxzoom": raw["maxzoom"],
                "bounds": [round(value, COORDINATE_DECIMALS) for value in raw["bounds"]],
            },
            "view": {"center": point(*raw["center"]), "zoom": raw["initialZoom"] - 1},
        }
        manifest_maps.append(entry)
        print(f"{map_id}: {len(converted['locations'])} locations, {len(converted['categories'])} categories")

        if not skip_tiles:
            tile_dir = source / raw["tiles"].split("/{z}")[0]
            stats = pack(
                tile_dir,
                output / tiles_path,
                entry["tiles"]["bounds"],
                [*entry["view"]["center"], entry["view"]["zoom"]],
                {"name": raw["title"]},
            )
            print(f"{map_id}: packed {stats['tiles']} tiles into {stats['bytes'] / 1e6:.0f} MB")

    exported = export_icons(icons, used_icons, used_item_icons, MARKER_ICONS)
    print(f"icons: {exported} written to {MARKER_ICONS}")
    for role, file_name in PLAYER_FILES.items():
        trimmed(NATIVE_ICON_DIR / file_name).save(PLAYER_ICONS / f"player-{role}.png")
    print(f"player needle pivot: {ring_pivot(PLAYER_ICONS / 'player-direction.png')}")
    print(f"player bust centre: {mass_centre(PLAYER_ICONS / 'player-base.png')}")
    optimize_media(source / "media", output / "media")

    write_audit(output / "icon-audit.json", audit)
    areas = {"m60": "lands-between", "m61": "realm-of-shadow"}
    calibration = calibrate({area: (map_id, converted_maps[map_id]) for area, map_id in areas.items()})
    write_json(output / "calibration.json", calibration)
    write_json(
        output / "manifest.json",
        {
            "format": 1,
            "maps": manifest_maps,
            "calibration": "calibration.json",
        },
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "data" / "mapgenie")
    parser.add_argument("--output", type=Path, default=ROOT / "data" / "dataset")
    parser.add_argument("--skip-tiles", action="store_true")
    args = parser.parse_args()
    build(args.source, args.output, args.skip_tiles)


if __name__ == "__main__":
    main()
