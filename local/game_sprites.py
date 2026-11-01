from __future__ import annotations

import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
GAME = ROOT / "assets" / "game"
LAYOUT = GAME / "menu" / "hi" / "01_common.sblytbnd.dcx"
ATLAS_ARCHIVE = GAME / "menu" / "hi" / "01_common.tpf.dcx"
ATLAS_DIR = GAME / "menu-atlases"
SPRITE_DIR = GAME / "sprites"
EXTRACTOR = ROOT / "tools" / "game-extract" / "target" / "release" / "game-extract"

ATLAS_PATTERN = re.compile(r'<TextureAtlas imagePath="([^"]+)\.png">(.*?)</TextureAtlas>', re.S)
MAP_ICON_DIR = ROOT / "icons" / "game-map"


MAP_ICON_SPRITES = {
    "UNKNOWN-figure-hooded-npc": "MENU_MAP_86",
    "UNKNOWN-figure-radial": "MENU_MAP_Range",
    "UNKNOWN-location-camp": "MENU_MAP_22",
    "UNKNOWN-location-cathedral": "MENU_MAP_20",
    "UNKNOWN-location-colosseum": "MENU_MAP_24",
    "UNKNOWN-location-leyndell-ash": "MENU_MAP_62",
    "UNKNOWN-location-tree-castle": "MENU_MAP_65",
    "UNKNOWN-location-village": "MENU_MAP_07",
    "character-invader-base": "MENU_MAP_Raid_02",
    "character-invader-direction": "MENU_MAP_Raid_01",
    "character-player-base": "MENU_MAP_Player_02",
    "character-player-direction": "MENU_MAP_Player_01",
    "character-player-ring": "MENU_MAP_Host",
    "character-summon-base": "MENU_MAP_Coop_02",
    "character-summon-direction": "MENU_MAP_Coop_01",
    "character-summon-ring": "MENU_MAP_Guests",
    "location-academy-of-raya-lucaria": "MENU_MAP_51",
    "location-academy-town": "MENU_MAP_32",
    "location-ailing-village": "MENU_MAP_37",
    "location-beastial-sanctum": "MENU_MAP_54",
    "location-bridge-of-sacrifice": "MENU_MAP_11",
    "location-caria-manor": "MENU_MAP_26",
    "location-carian-study-hall": "MENU_MAP_66",
    "location-castle-morne": "MENU_MAP_25",
    "location-castle-sol": "MENU_MAP_29",
    "location-catacombs": "MENU_MAP_04",
    "location-catacombs-statue": "MENU_MAP_85",
    "location-catacombs-statue-direction": "MENU_MAP_84",
    "location-cave": "MENU_MAP_13",
    "location-church": "MENU_MAP_Church",
    "location-crumbling-farum-azula": "MENU_MAP_59",
    "location-divine-tower": "MENU_MAP_23",
    "location-dominula-windmill-village": "MENU_MAP_36",
    "location-elphael-brace-of-the-haligtree": "MENU_MAP_56",
    "location-evergaol": "MENU_MAP_09",
    "location-forge-of-giants": "MENU_MAP_57",
    "location-fort": "MENU_MAP_18",
    "location-four-belfries": "MENU_MAP_52",
    "location-frenzied-flame-village": "MENU_MAP_35",
    "location-gate": "MENU_MAP_10",
    "location-grand-lift": "MENU_MAP_21",
    "location-hermit-village": "MENU_MAP_40",
    "location-heros-grave": "MENU_MAP_16",
    "location-jarburg": "MENU_MAP_38",
    "location-leyndell-royal-capital": "MENU_MAP_60",
    "location-lookout-tower": "MENU_MAP_08",
    "location-minor-erdtree": "MENU_MAP_30",
    "location-miquellas-haligtree": "MENU_MAP_55",
    "location-mohgwyn-dynasty-mausoleum": "MENU_MAP_45",
    "location-ordina-liturgical-town": "MENU_MAP_34",
    "location-redmane-castle": "MENU_MAP_28",
    "location-rise-mage-tower": "MENU_MAP_17",
    "location-ruin-strewn-precipice": "MENU_MAP_53",
    "location-ruins": "MENU_MAP_05",
    "location-sellia-town-of-sorcery": "MENU_MAP_33",
    "location-shack": "MENU_MAP_06",
    "location-shaded-castle": "MENU_MAP_27",
    "location-site-of-grace": "MENU_MAP_01_Bonfire",
    "location-site-of-grace-direction": "MENU_MAP_83",
    "location-stormveil-castle": "MENU_MAP_50",
    "location-subterranean-shunning-grounds": "MENU_MAP_61",
    "location-table-of-lost-grace": "MENU_MAP_48",
    "location-tunnel": "MENU_MAP_14",
    "location-underground-city": "MENU_MAP_46",
    "location-underground-ruins": "MENU_MAP_47",
    "location-village-of-the-albinaurics": "MENU_MAP_39",
    "location-volcano-manor": "MENU_MAP_58",
    "location-well": "MENU_MAP_Ungro",
    "location-windmill-pasture": "MENU_MAP_19",
    "marker-beacon": "MENU_MAP_Marker",
    "marker-dropped-runes": "MENU_MAP_DropSoul",
    "marker-generic-01-sword": "MENU_MAP_memo_21",
    "marker-generic-02-skull": "MENU_MAP_memo_20",
    "marker-generic-03-person": "MENU_MAP_memo_22",
    "marker-generic-04-animal": "MENU_MAP_memo_23",
    "marker-generic-05-plant": "MENU_MAP_memo_24",
    "marker-generic-06-diamond": "MENU_MAP_memo_25",
    "marker-generic-07-chest": "MENU_MAP_memo_26",
    "marker-generic-08-flag": "MENU_MAP_memo_27",
    "marker-generic-09-tree": "MENU_MAP_memo_29",
    "marker-generic-10-building": "MENU_MAP_memo_28",
    "marker-quest-focus": "MENU_MAP_87",
    "marker-quest-normal": "MENU_MAP_88",
    "npc-large": "MENU_MAP_80",
    "npc-small": "MENU_MAP_80_Add",
}

NAMED_POINT_SPRITES = {3: "MENU_MAP_Church", 15: "MENU_MAP_Ungro"}
HUD_SPRITES = {"hud-stake-of-marika": "MENU_StatusIcon_20057"}
MENU_TAB_SPRITES = {
    "Weapon": "MENU_Tab_07",
    "Shield": "MENU_Tab_09",
    "Armor": "MENU_Tab_Armor",
    "Ammunition": "MENU_Tab_14",
    "Key Item": "MENU_Tab_03",
}

SPRITE_PATTERN = re.compile(r'<SubTexture name="([^"]+)\.png" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"')


def read_layout() -> dict[str, dict[str, tuple[int, int, int, int]]]:
    with tempfile.TemporaryDirectory() as scratch:
        unpacked = Path(scratch) / "layout.bnd"
        subprocess.run([EXTRACTOR, "dcx", LAYOUT, unpacked], check=True)
        text = unpacked.read_bytes().decode("utf-8", "ignore")
    layout = {}
    for atlas, body in ATLAS_PATTERN.findall(text):
        layout[atlas] = {
            name: (int(x), int(y), int(x) + int(width), int(y) + int(height))
            for name, x, y, width, height in SPRITE_PATTERN.findall(body)
        }
    return layout


def export_sprites() -> int:
    if not ATLAS_DIR.exists():
        subprocess.run([EXTRACTOR, "tpf", ATLAS_ARCHIVE, ATLAS_DIR], check=True)
    SPRITE_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    for atlas, sprites in read_layout().items():
        source = ATLAS_DIR / f"{atlas}.dds"
        if not source.exists():
            continue
        image = Image.open(source).convert("RGBA")
        for name, box in sprites.items():
            target = SPRITE_DIR / f"{name}.png"
            if not target.exists():
                image.crop(box).save(target)
            count += 1
    return count


def sprite_at(atlas: str, box: tuple[int, int, int, int]) -> str:
    left, top, right, bottom = box

    def overlap(other: tuple[int, int, int, int]) -> int:
        width = min(right, other[2]) - max(left, other[0])
        height = min(bottom, other[3]) - max(top, other[1])
        return max(width, 0) * max(height, 0)

    sprites = read_layout()[atlas]
    return max(sprites, key=lambda name: overlap(sprites[name]))


def signature(image: Image.Image) -> list[int]:
    image = image.convert("RGBA")
    box = image.getchannel("A").point(lambda alpha: 255 if alpha > 40 else 0).getbbox()
    if box:
        image = image.crop(box)
    canvas = Image.new("RGBA", image.size, (0, 0, 0, 255))
    canvas.alpha_composite(image)
    return list(canvas.convert("L").resize((24, 24), Image.BILINEAR).getdata())


def match_sprites(icons: list[Path], atlases: tuple[str, ...]) -> dict[str, tuple[str, float]]:
    layout = read_layout()
    candidates = {
        name: signature(Image.open(SPRITE_DIR / f"{name}.png"))
        for atlas in atlases
        for name in layout.get(atlas, {})
        if (SPRITE_DIR / f"{name}.png").exists()
    }
    matches = {}
    for icon in icons:
        wanted = signature(Image.open(icon))
        best = min(candidates, key=lambda name: sum(abs(a - b) for a, b in zip(wanted, candidates[name])))
        distance = sum(abs(a - b) for a, b in zip(wanted, candidates[best])) / len(wanted)
        matches[icon.stem] = (best, distance)
    return matches


def export_map_icons() -> None:
    MAP_ICON_DIR.mkdir(parents=True, exist_ok=True)
    for slug, sprite in MAP_ICON_SPRITES.items():
        Image.open(SPRITE_DIR / f"{sprite}.png").save(MAP_ICON_DIR / f"{slug}.png")


def export_point_icons(icon_ids: set[int]) -> dict[int, str]:
    MAP_ICON_DIR.mkdir(parents=True, exist_ok=True)
    slugs = {}
    for icon_id in icon_ids:
        sprite = SPRITE_DIR / f"{NAMED_POINT_SPRITES.get(icon_id, f'MENU_MAP_{icon_id:02d}')}.png"
        if sprite.exists():
            slugs[icon_id] = f"map-point-{icon_id}"
            Image.open(sprite).save(MAP_ICON_DIR / f"{slugs[icon_id]}.png")
    return slugs
