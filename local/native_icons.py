from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ICON_PREFIXES = ("location-", "UNKNOWN-location-")
SPRITE_KEY_PREFIX = "native-"
LOCATIONS_GROUP = "Locations"

CHEST = "marker-generic-07-chest"
DIAMOND = "marker-generic-06-diamond"
SWORD = "marker-generic-01-sword"
SKULL = "marker-generic-02-skull"
PLANT = "marker-generic-05-plant"
FLAG = "marker-generic-08-flag"
TREE = "marker-generic-09-tree"
BUILDING = "marker-generic-10-building"
SPIRIT = "stamp-spirit"

CATEGORY_ICONS = {
    "Site of Grace": "site-of-grace",
    "Evergaol": "evergaol",
    "Minor Erdtree": "minor-erdtree",
    "Divine Tower": "divine-tower",
    "Elevator": "grand-lift",
    "Hidden Passage": "tunnel",
    "Imp Seal Statue": "catacombs-statue",
    "Martyr Effigy": "UNKNOWN-figure-radial",
    "Invasion": "character-invader-base",
    "Portal": "stamp-portal",
    "Smithing Table": "forge-of-giants",
    "Spiritspring Jump": "stamp-spiritspring",
    "Stake of Marika": "hud-stake-of-marika",
    "Wandering Mausoleum": "mohgwyn-dynasty-mausoleum",
    "Dragon Shrine": BUILDING,
    "Stone Cairn": BUILDING,
    "Golden Rune": "marker-dropped-runes",
    "Gesture": "marker-generic-03-person",
    "Multiplayer Item": "marker-generic-03-person",
    "Spirit Ashes": SPIRIT,
    "Revered Spirit Ash": SPIRIT,
    "Ghost": SPIRIT,
    "Golden Seed": TREE,
    "Sacred Tear": TREE,
    "Scadutree Fragment": TREE,
    "Enemy": "marker-generic-04-animal",
    "Smithing Stone": DIAMOND,
    "Somber Smithing Stone": DIAMOND,
    "Ancient Smithing Stone": DIAMOND,
    "Ruin Fragment": DIAMOND,
    "Quest": "marker-quest-normal",
    "Summoning Sigil": "UNKNOWN-figure-radial",
    "Birdseye Telescope": DIAMOND,
    "Puzzle": CHEST,
    "Miquella's Cross": FLAG,
    "Guiding Statue": FLAG,
    "Lore": TREE,
    "Miscellaneous": BUILDING,
}
GROUP_ICONS = {
    "Key Items": CHEST,
    "Items": DIAMOND,
    "Equipment": SWORD,
    "NPC's": "npc-small",
    "Enemies": SKULL,
    "Materials": PLANT,
    "Other": FLAG,
}
TITLE_MATCHED_CATEGORIES = {
    "Dungeon": "catacombs",
    "Legacy Dungeon": "stormveil-castle",
    "Landmark": "ruins",
}
NAMED_ICONS = {
    "stormveil castle": "stormveil-castle",
    "redmane castle": "redmane-castle",
    "volcano manor": "volcano-manor",
    "raya lucaria academy": "academy-of-raya-lucaria",
    "leyndell, royal capital": "leyndell-royal-capital",
    "crumbling farum azula": "crumbling-farum-azula",
    "miquella's haligtree": "miquellas-haligtree",
    "castle morne": "castle-morne",
    "castle sol": "castle-sol",
    "caria manor": "caria-manor",
    "carian study hall": "carian-study-hall",
    "bestial sanctum": "beastial-sanctum",
    "sellia, town of sorcery": "sellia-town-of-sorcery",
    "village of the albinaurics": "village-of-the-albinaurics",
    "ailing village": "ailing-village",
    "bridge of sacrifice": "bridge-of-sacrifice",
    "grand lift of dectus": "grand-lift",
    "grand lift of rold": "grand-lift",
    "the shaded castle": "shaded-castle",
    "the four belfries": "four-belfries",
    "four belfries": "four-belfries",
    "dominula, windmill village": "dominula-windmill-village",
    "jarburg": "jarburg",
    "hermit village": "hermit-village",
    "frenzied flame village": "frenzied-flame-village",
    "ordina, liturgical town": "ordina-liturgical-town",
    "forge of the giants": "forge-of-giants",
    "elphael, brace of the haligtree": "elphael-brace-of-the-haligtree",
    "subterranean shunning-grounds": "subterranean-shunning-grounds",
    "subterranean shunning grounds": "subterranean-shunning-grounds",
    "nokron, eternal city": "underground-city",
    "nokstella, eternal city": "underground-city",
    "siofra aqueduct": "underground-ruins",
    "hallowhorn grounds": "underground-ruins",
    "night's sacred ground": "underground-ruins",
    "guardians' garrison": "fort",
    "academy gate town": "academy-town",
    "east windmill pasture": "windmill-pasture",
    "ruin-strewn precipice": "ruin-strewn-precipice",
    "roundtable hold": "table-of-lost-grace",
    "mohgwyn dynasty mausoleum": "mohgwyn-dynasty-mausoleum",
}
KEYWORD_ICONS = [
    (r"\bhero's grave\b|\bside tomb\b", "heros-grave"),
    (r"\bcatacombs\b|\bgraveyard\b", "catacombs"),
    (r"\btunnels?\b", "tunnel"),
    (r"\bcave\b|\bgrotto\b|\bhideaway\b", "cave"),
    (r"\bcathedral\b", "cathedral"),
    (r"\bchurch\b|\bchapel\b", "church"),
    (r"\bruins\b", "ruins"),
    (r"\bfort\b", "fort"),
    (r"\bshack\b", "shack"),
    (r"\bwell\b", "well"),
    (r"\brise\b", "rise-mage-tower"),
    (r"\btower\b", "lookout-tower"),
    (r"gate", "gate"),
    (r"\bvillage\b", "village"),
    (r"\bwindmill\b", "windmill-pasture"),
    (r"\bcamp\b", "camp"),
    (r"\bcolos+eum\b", "colosseum"),
]
SOURCE_SCALE = 0.34
MIN_ICON_SIZE = 32
MAX_ICON_SIZE = 84
STAMP_SIZE = 36
CORE_ALPHA = 140
ITEM_ICON_SIZE = 34
ITEM_SHADOW_BLUR = 2.5
ITEM_SHADOW_OPACITY = 0.85
TRIM_MARGIN = 0.08
HALO_ICONS = {"UNKNOWN-figure-radial"}
INK_LUMINANCE = 150
HALO_MARGIN = 0.35
HALO_SOLID_RADIUS = 0.6
STAMP_PREFIXES = ("marker-", "npc-", "stamp-")
ICON_SIZES = {"UNKNOWN-figure-radial": 42, "hud-stake-of-marika": 36}
SHADOWED_PREFIXES = ("hud-",)
PLAYER_FILES = {"base": "character-player-base.png", "direction": "character-player-direction.png"}
OPAQUE_ALPHA = 64
RING_MIN_WIDTH = 0.6


def ring_pivot(path: Path) -> list[float]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A").load()
    width, height = image.size
    wide_rows = [
        y for y in range(height)
        if sum(1 for x in range(width) if alpha[x, y] > OPAQUE_ALPHA) and
        max(x for x in range(width) if alpha[x, y] > OPAQUE_ALPHA) - min(x for x in range(width) if alpha[x, y] > OPAQUE_ALPHA) > width * RING_MIN_WIDTH
    ]
    if not wide_rows:
        return [0.5, 0.5]
    start = (width // 2, (wide_rows[0] + wide_rows[-1]) // 2)
    interior, frontier = {start}, [start]
    while frontier:
        x, y = frontier.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in interior and alpha[nx, ny] <= OPAQUE_ALPHA:
                interior.add((nx, ny))
                frontier.append((nx, ny))
    xs = [x for x, _ in interior]
    ys = [y for _, y in interior]
    return [round((min(xs) + max(xs) + 1) / 2 / width, 4), round((min(ys) + max(ys) + 1) / 2 / height, 4)]


def mass_centre(path: Path) -> list[float]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A").load()
    width, height = image.size
    total = weighted_x = weighted_y = 0
    for y in range(height):
        for x in range(width):
            total += alpha[x, y]
            weighted_x += alpha[x, y] * (x + 0.5)
            weighted_y += alpha[x, y] * (y + 0.5)
    return [round(weighted_x / total / width, 4), round(weighted_y / total / height, 4)]


def trimmed(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    return image.crop(image.getchannel("A").getbbox())


def place_key(text: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text.lower()).split())


def sprite_key(slug: str) -> str:
    return SPRITE_KEY_PREFIX + slug


def available_icons(directory: Path) -> dict[str, Path]:
    icons = {}
    for path in directory.glob("*.png"):
        prefix = next((prefix for prefix in ICON_PREFIXES if path.stem.startswith(prefix)), "")
        icons[path.stem.removeprefix(prefix)] = path
    return icons


def icon_for(category_title: str, location_title: str) -> str | None:
    if category_title in CATEGORY_ICONS:
        return CATEGORY_ICONS[category_title]
    if category_title not in TITLE_MATCHED_CATEGORIES:
        return None
    title = location_title.lower()
    if title in NAMED_ICONS:
        return NAMED_ICONS[title]
    return next((slug for pattern, slug in KEYWORD_ICONS if re.search(pattern, title)), None)


def category_icon(category_title: str, group_title: str | None) -> str | None:
    return (
        CATEGORY_ICONS.get(category_title)
        or TITLE_MATCHED_CATEGORIES.get(category_title)
        or GROUP_ICONS.get(group_title or "")
    )


def apply_native_icons(converted_map: dict, icons: dict[str, Path], place_icons: dict[str, str]) -> set[str]:
    group_of = {cid: group["title"] for group in converted_map["groups"] for cid in group["categoryIds"]}
    categories = {category["id"]: category for category in converted_map["categories"]}
    used = set()
    for location in converted_map["locations"]:
        category = categories[location["categoryId"]]
        slug = place_icons.get(place_key(location["title"])) or icon_for(category["title"], location["title"])
        if slug in icons:
            location["icon"] = sprite_key(slug)
            used.add(slug)
    for category in converted_map["categories"]:
        slug = category_icon(category["title"], group_of.get(category["id"]))
        if slug in icons:
            category["icon"] = sprite_key(slug)
            used.add(slug)
    return used


def content_box(image: Image.Image, opaque_halo: bool) -> tuple[int, int, int, int] | None:
    opaque = image.getchannel("A").point(lambda alpha: 255 if alpha > CORE_ALPHA else 0)
    if not opaque_halo:
        return opaque.getbbox()
    ink = image.convert("L").point(lambda luminance: 255 if luminance < INK_LUMINANCE else 0)
    return Image.composite(ink, Image.new("L", image.size), opaque).getbbox()


def trim_to_content(image: Image.Image, opaque_halo: bool = False) -> Image.Image:
    core = content_box(image, opaque_halo)
    if not core:
        return image
    left, top, right, bottom = core
    margin = round(max(right - left, bottom - top) * (HALO_MARGIN if opaque_halo else TRIM_MARGIN))
    width, height = image.size
    cropped = image.crop((max(0, left - margin), max(0, top - margin), min(width, right + margin), min(height, bottom + margin)))
    return fade_edges(cropped) if opaque_halo else cropped


def fade_edges(image: Image.Image) -> Image.Image:
    gradient = Image.radial_gradient("L")
    edge = gradient.getpixel((0, gradient.height // 2))

    def opacity(distance: int) -> int:
        radius = distance / edge
        if radius <= HALO_SOLID_RADIUS:
            return 255
        return max(0, round(255 * (1 - radius) / (1 - HALO_SOLID_RADIUS)))

    mask = gradient.resize(image.size).point(opacity)
    faded = image.copy()
    faded.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
    return faded


def target_size(slug: str, content_size: tuple[int, int]) -> int:
    if slug in ICON_SIZES:
        return ICON_SIZES[slug]
    if slug.startswith(STAMP_PREFIXES):
        return STAMP_SIZE
    return max(MIN_ICON_SIZE, min(round(max(content_size) * SOURCE_SCALE), MAX_ICON_SIZE))


def fit_even(size: tuple[int, int], longest: int) -> tuple[int, int]:
    scale = longest / max(size)
    return tuple(max(2, round(dimension * scale / 2) * 2) for dimension in size)


def with_shadow(image: Image.Image) -> Image.Image:
    pad = round(ITEM_SHADOW_BLUR * 3)
    canvas = Image.new("RGBA", (image.width + pad * 2, image.height + pad * 2))
    halo = Image.new("L", canvas.size)
    halo.paste(image.getchannel("A"), (pad, pad))
    halo = halo.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(ITEM_SHADOW_BLUR))
    halo = halo.point(lambda alpha: round(alpha * ITEM_SHADOW_OPACITY))
    canvas.paste(Image.new("RGBA", canvas.size, (8, 6, 4, 255)), (0, 0), halo)
    canvas.alpha_composite(image, (pad, pad))
    return canvas


def export_icons(
    icons: dict[str, Path],
    slugs: set[str],
    item_icons: dict[str, Path],
    output: Path,
) -> int:
    images = {}
    for slug in slugs:
        source = trim_to_content(Image.open(icons[slug]).convert("RGBA"), opaque_halo=slug in HALO_ICONS)
        image = source.resize(fit_even(source.size, target_size(slug, source.size) * 2), Image.LANCZOS)
        images[sprite_key(slug)] = with_shadow(image) if slug.startswith(SHADOWED_PREFIXES) else image
    for slug, path in item_icons.items():
        source = trim_to_content(Image.open(path).convert("RGBA"))
        images[slug] = with_shadow(source.resize(fit_even(source.size, ITEM_ICON_SIZE * 2), Image.LANCZOS))

    output.mkdir(parents=True, exist_ok=True)
    for stale in output.glob("*.png"):
        if stale.stem not in images:
            stale.unlink()
    for key, image in images.items():
        image.save(output / f"{key}.png", optimize=True)
    return len(images)
