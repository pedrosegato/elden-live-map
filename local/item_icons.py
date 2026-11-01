from __future__ import annotations

import re
from dataclasses import dataclass
from collections import Counter
from pathlib import Path

from game_sprites import MENU_TAB_SPRITES, SPRITE_DIR

ROOT = Path(__file__).resolve().parent
GAME_ICONS = ROOT / "assets" / "game" / "icons-low"

GAME_TABLES = {
    "EquipParamGoods": ("GoodsName", 48),
    "EquipParamWeapon": ("WeaponName", 190),
    "EquipParamProtector": ("ProtectorName", 166),
    "EquipParamAccessory": ("AccessoryName", 38),
    "EquipParamGem": ("GemName", 4),
}
ICON_ID = re.compile(r"MENU_Knowledge_(\d+)")
MENU_TAB_DIR = ROOT / "icons" / "menu-tabs"
ITEM_GROUPS = {"Key Items", "Items", "Equipment", "Materials"}
SLUG_PREFIX = "item-"
ARMOR_ORDER = ("armor", "robe", "garb", "attire", "helm", "hood", "mask", "crown", "gauntlets", "greaves", "trousers")
SPELLING_FIXES = {
    "excriment": "excrement",
    "smouldering": "smoldering",
    "lilly": "lily",
    "glinstone": "glintstone",
    "aoenian": "aeonian",
    "yeolough": "yelough",
    "miquela": "miquella",
}


PHRASE_FIXES = {
    "gold rune": "golden rune",
    "gold picked": "gold pickled",
    "silver picked": "silver pickled",
    "fulgur bloom": "fulgurbloom",
    "map abyssal woods": "map abyss",
    "walking mausoleum": "wandering mausoleum",
}


HAND_IDENTIFIED = {
    "Hero's Rune": "Hero's Rune [1]",
    "Immunizing Bolluses": "Neutralizing Boluses",
    "Drawstring Glowing Grease": "Drawstring Lightning Grease",
}

QUANTITY_PREFIX = re.compile(r"^\d+\s*x\s+", re.IGNORECASE)
QUANTITY_SUFFIX = re.compile(r"\s+x\s*\d+$|\s*\(x?\d+\)$", re.IGNORECASE)
TRAILING_LEVEL = re.compile(r"\s*\[\d+\]$")
TRAILING_NOTE = re.compile(r"\s*\(.*?\)$")
PARENTHESIZED_LEVEL = re.compile(r"\s*\((\d+)\)$")
FIRST_LEVEL = re.compile(r"^(?:\d+x\s*)?(.+?)\s+(?:\d+x\s*)?\[(\d+)\].*$")
MAP_TITLE = re.compile(r"^Map: (.+)$")
DESCRIPTION_ITEM = re.compile(r"^\s*[-*]\s+(?:\d+\s*x\s*)?([^*\s].*?)\s*$", re.MULTILINE)
PAREN_LEVEL = re.compile(r"^(.+?)\s*\(\s*\[(\d+)\]")

SCARAB_FLASKS = {"Crimson Scarab": "Flask of Crimson Tears", "Cerulean Scarab": "Flask of Cerulean Tears"}
PAINTING_TITLE = re.compile(r'^"(.+)" Painting$')
LOOSE_FILLER = {"s", "talisman", "a", "an", "the"}


def item_key(text: str) -> str:
    text = text.replace("\u0445", "x").lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    key = " ".join(SPELLING_FIXES.get(word, word) for word in text.split())
    for wrong, right in PHRASE_FIXES.items():
        key = key.replace(wrong, right)
    return key


def export_menu_tabs() -> None:
    from PIL import Image

    MENU_TAB_DIR.mkdir(parents=True, exist_ok=True)
    for category, sprite in MENU_TAB_SPRITES.items():
        Image.open(SPRITE_DIR / f"{sprite}.png").save(MENU_TAB_DIR / f"Menu tab {category}.png")


def game_icon_ids() -> dict[str, int]:
    from game_params import read_bnd4, read_messages, read_param, read_regulation

    params = read_bnd4(read_regulation())
    names = read_messages("item")
    icon_ids: dict[str, int] = {}
    for table, (names_file, icon_offset) in GAME_TABLES.items():
        for row_id, row in read_param(params[f"{table}.param"]).items():
            name = names[names_file].get(row_id)
            icon_id = int.from_bytes(row[icon_offset : icon_offset + 2], "little")
            if name and icon_id:
                icon_ids.setdefault(item_key(name), icon_id)
    return icon_ids


def icon_files_by_id() -> dict[int, Path]:
    return {int(ICON_ID.search(path.stem).group(1)): path for path in GAME_ICONS.glob("MENU_Knowledge_*.dds")}


def singular(word: str) -> str:
    if word.endswith("ies"):
        return word[:-3] + "y"
    if word.endswith(("shes", "ches", "xes", "sses")):
        return word[:-2]
    if word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def loose_words(key: str) -> list[str]:
    return [singular(word) for word in key.split() if word not in LOOSE_FILLER]


def loose_key(key: str) -> str:
    return "".join(loose_words(key))


def edit_distance(a: str, b: str) -> int:
    previous = list(range(len(b) + 1))
    for i, left in enumerate(a, 1):
        current = [i]
        for j, right in enumerate(b, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (left != right)))
        previous = current
    return previous[-1]


def typo_distance(words: list[str], other: list[str]) -> int | None:
    if len(words) != len(other):
        return None
    if sorted(words) == sorted(other):
        return 0
    misspelt = 0
    for word, official in zip(words, other):
        if word == official:
            continue
        if min(len(word), len(official)) < 4 or edit_distance(word, official) > 1:
            return None
        misspelt += 1
    return misspelt


def nearest_official(key: str, index: "IconIndex") -> Path | None:
    words = loose_words(key)
    by_distance: dict[int, set[Path]] = {}
    for name, path in index.paths.items():
        distance = typo_distance(words, loose_words(name))
        if distance is not None:
            by_distance.setdefault(distance, set()).add(path)
    if not by_distance:
        return None
    closest = by_distance[min(by_distance)]
    return next(iter(closest)) if len(closest) == 1 else None


def missing_word_match(key: str, index: "IconIndex") -> Path | None:
    words = key.split()
    if len(words) < 2:
        return None
    found = set()
    for name, path in index.paths.items():
        name_words = name.split()
        if len(name_words) != len(words) + 1 or name_words[0] != words[0] or name_words[-1] != words[-1]:
            continue
        if any(name_words[:at] + name_words[at + 1 :] == words for at in range(1, len(name_words) - 1)):
            found.add(path)
    return next(iter(found)) if len(found) == 1 else None


@dataclass
class IconIndex:
    paths: dict[str, Path]
    loose: dict[str, Path]


def build_index() -> IconIndex:
    files_by_id = icon_files_by_id()
    official = {key: files_by_id[icon_id] for key, icon_id in game_icon_ids().items() if icon_id in files_by_id}
    by_loose: dict[str, set[Path]] = {}
    for key, path in official.items():
        by_loose.setdefault(loose_key(key), set()).add(path)

    loose = {form: next(iter(paths)) for form, paths in by_loose.items() if len(paths) == 1}
    return IconIndex(official, loose)


def bare_title(title: str) -> str:
    first = re.split(r",\s+| & ", title)[0].strip()
    return QUANTITY_SUFFIX.sub("", QUANTITY_PREFIX.sub("", first)).strip()


def title_candidates(title: str) -> list[str]:
    first = re.split(r",\s+| & ", title)[0].strip()
    bare = bare_title(title)
    renamed = MAP_TITLE.sub(r"Map (\1)", PAINTING_TITLE.sub(r"\1", first))
    leveled = PARENTHESIZED_LEVEL.sub(r" [\1]", first)
    singular = bare[:-1] if bare.endswith("s") and not bare.endswith("ss") else bare
    level = TRAILING_LEVEL.search(bare)
    unleveled = TRAILING_LEVEL.sub("", bare)
    singular_leveled = (unleveled[:-1] if unleveled.endswith("s") else unleveled) + (level.group(0) if level else "")
    first_of_list = FIRST_LEVEL.sub(r"\1 [\2]", first)
    paren_level = PAREN_LEVEL.sub(r"\1 [\2]", first)
    plurals = [f"{unleveled}s", f"{unleveled}es"]
    return [title, first, renamed, leveled, bare, unleveled, TRAILING_NOTE.sub("", bare), singular, singular_leveled, first_of_list, paren_level, *plurals]


def set_piece(base: str, paths: dict[str, Path]) -> Path | None:
    pieces = [name for name in paths if name.startswith(f"{base} ")]
    for word in ARMOR_ORDER:
        for name in pieces:
            if name.endswith(word):
                return paths[name]
    return paths[pieces[0]] if pieces else None


def match_icon(title: str, index: IconIndex, description: str = "") -> tuple[Path, str] | None:
    if title in HAND_IDENTIFIED:
        identified = match_icon(HAND_IDENTIFIED[title], index)
        return (identified[0], "identified by hand") if identified else None
    title = title.replace("\u0445", "x").replace("\u00d7", "x").split(" / ")[0]
    exact = {item_key(title), item_key(bare_title(title))}
    candidates = title_candidates(title)
    for candidate in candidates:
        key = item_key(candidate)
        if key not in index.paths:
            continue
        if key not in exact:
            return index.paths[key], "rewritten title"
        return index.paths[key], "official name, icon id"
    for candidate in candidates:
        form = loose_key(item_key(candidate))
        if form in index.loose:
            return index.loose[form], "spelling variant"
    key = item_key(bare_title(title))
    if key.endswith(" set"):
        piece = set_piece(key.removesuffix(" set"), index.paths)
        return (piece, "armor set piece") if piece else None
    for candidate in candidates:
        near = nearest_official(item_key(candidate), index)
        if near:
            return near, "spelling variant"
    for listed_name in DESCRIPTION_ITEM.findall(description):
        listed = match_icon(listed_name, index)
        if listed and listed[1] != "armor set piece":
            return listed[0], "item listed in description"
    added = missing_word_match(key, index)
    return (added, "name missing a word") if added else None


def icon_slug(path: Path) -> str:
    return SLUG_PREFIX + re.sub(r"[^a-z0-9]+", "-", item_key(path.stem.split(" - MENU_")[0])).strip("-")


def apply_item_icons(converted_map: dict, index: IconIndex, methods: dict[int, str]) -> dict[str, Path]:
    group_of = {cid: group["title"] for group in converted_map["groups"] for cid in group["categoryIds"]}
    used: dict[str, Path] = {}
    for location in converted_map["locations"]:
        if group_of.get(location["categoryId"]) not in ITEM_GROUPS:
            continue
        match = match_icon(location["title"], index, location.get("description", ""))
        if not match:
            continue
        path, methods[location["id"]] = match
        slug = icon_slug(path)
        used[slug] = path
        location["icon"] = slug

    item_icons_by_category: dict[int, Counter] = {}
    for location in converted_map["locations"]:
        if location["id"] in methods:
            item_icons_by_category.setdefault(location["categoryId"], Counter())[location["icon"]] += 1

    for category in converted_map["categories"]:
        flask = SCARAB_FLASKS.get(category["title"])
        flask_match = flask and match_icon(flask, index)
        if flask_match:
            slug = icon_slug(flask_match[0])
            used[slug] = flask_match[0]
            for location in converted_map["locations"]:


                if location["categoryId"] == category["id"] and "scarab" in location["title"].lower():
                    location["icon"] = slug
                    methods[location["id"]] = "flask the scarab refills"

    for category in converted_map["categories"]:
        tab = MENU_TAB_DIR / f"Menu tab {category['title']}.png"
        if group_of.get(category["id"]) not in ITEM_GROUPS and not tab.exists():
            continue
        own = match_icon(category["title"], index)
        stamp = category["icon"]
        if tab.exists():
            slug = icon_slug(tab)
            used[slug] = tab
        elif own:
            slug = icon_slug(own[0])
            used[slug] = own[0]
        elif category["id"] in item_icons_by_category:
            slug = item_icons_by_category[category["id"]].most_common(1)[0][0]
        else:
            continue
        category["icon"] = slug
        if not tab.exists():

            for location in converted_map["locations"]:
                if location["categoryId"] == category["id"] and location["id"] not in methods:
                    location.setdefault("icon", stamp)
            continue
        method = "game menu tab icon"
        for location in converted_map["locations"]:
            if location["categoryId"] == category["id"] and not location.get("icon", "").startswith(SLUG_PREFIX):
                location["icon"] = slug
                methods[location["id"]] = method
    return used
