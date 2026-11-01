from __future__ import annotations

import math
import random
from pathlib import Path

from game_sprites import HUD_SPRITES, SPRITE_DIR
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "icons" / "stamps"
FIGURE = ROOT / "icons" / "game-map" / "UNKNOWN-figure-hooded-npc.png"
HUD_UPSCALE = 3

SIZE = 336
FINAL = 112
CENTER = SIZE / 2
FILL_INNER = (106, 126, 102)
FILL_OUTER = (66, 84, 64)
RING = (40, 52, 39)
RIM = (12, 14, 12)
GLYPH = (196, 212, 186)
GLYPH_EDGE = (22, 28, 21)
INK_LUMINANCE = 150
GRAIN = 18
RIM_WOBBLE = 0.012
SEED = 960


def seal() -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE))
    radius = SIZE * 0.46
    gradient = Image.radial_gradient("L").resize((SIZE, SIZE))
    edge = gradient.getpixel((0, SIZE // 2))
    fill = Image.new("RGBA", (SIZE, SIZE))
    pixels = fill.load()
    shade = gradient.load()
    for y in range(SIZE):
        for x in range(SIZE):
            t = min(shade[x, y] / edge, 1)
            pixels[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(FILL_INNER, FILL_OUTER)) + (255,)
    rng = random.Random(SEED)
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b, a = pixels[x, y]
            noise = rng.randint(-GRAIN, GRAIN)
            pixels[x, y] = (max(0, r + noise), max(0, g + noise), max(0, b + noise), a)
    outline = [
        (
            CENTER + math.cos(angle) * radius * (1 + rng.uniform(-RIM_WOBBLE, RIM_WOBBLE)),
            CENTER + math.sin(angle) * radius * (1 + rng.uniform(-RIM_WOBBLE, RIM_WOBBLE)),
        )
        for angle in (step * math.tau / 96 for step in range(96))
    ]
    mask = Image.new("L", (SIZE, SIZE))
    ImageDraw.Draw(mask).polygon(outline, fill=255)
    image.paste(fill, mask=mask)
    draw = ImageDraw.Draw(image)
    draw.line([*outline, outline[0]], fill=RIM, width=12, joint="curve")
    inner = radius * 0.84
    draw.ellipse([CENTER - inner, CENTER - inner, CENTER + inner, CENTER + inner], outline=RING, width=7)
    return image


def stroke_glyph(paint) -> Image.Image:
    layer = Image.new("RGBA", (SIZE, SIZE))
    paint(ImageDraw.Draw(layer), GLYPH_EDGE, 22)
    paint(ImageDraw.Draw(layer), GLYPH, 11)
    return layer.filter(ImageFilter.GaussianBlur(0.8))


def portal(draw: ImageDraw.ImageDraw, color, width: int) -> None:
    for index, radius in enumerate((92, 64, 36)):
        start = 40 + index * 120
        box = [CENTER - radius, CENTER - radius, CENTER + radius, CENTER + radius]
        draw.arc(box, start, start + 250, fill=color, width=width)
    draw.ellipse([CENTER - 10, CENTER - 10, CENTER + 10, CENTER + 10], fill=color)


def spiritspring(draw: ImageDraw.ImageDraw, color, width: int) -> None:
    for offset in (-54, 0, 54):
        points = []
        for step in range(21):
            y = CENTER + 96 - step * 9
            x = CENTER + offset + math.sin(step / 3.2 + offset / 30) * 12
            points.append((x, y))
        draw.line(points, fill=color, width=width, joint="curve")
    tip = CENTER - 112
    draw.line([(CENTER - 40, tip + 44), (CENTER, tip), (CENTER + 40, tip + 44)], fill=color, width=width, joint="curve")


def spirit_glyph() -> Image.Image:
    figure = Image.open(FIGURE).convert("RGBA")
    ink = figure.convert("L").point(lambda luminance: 255 if luminance < INK_LUMINANCE else 0)
    ink = ImageChops.multiply(ink, figure.getchannel("A").point(lambda alpha: 255 if alpha > 140 else 0))
    box = ink.getbbox()
    ink = ink.crop(box)
    scale = (SIZE * 0.5) / max(ink.size)
    ink = ink.resize((round(ink.width * scale), round(ink.height * scale)), Image.LANCZOS)
    shading = figure.crop(box).convert("L").resize(ink.size, Image.LANCZOS)
    tinted = ImageOps.colorize(ImageOps.autocontrast(shading), black=GLYPH_EDGE, white=GLYPH).convert("RGBA")
    layer = Image.new("RGBA", (SIZE, SIZE))
    origin = (round(CENTER - ink.width / 2), round(CENTER - ink.height / 2))
    outline = ink.filter(ImageFilter.MaxFilter(9))
    layer.paste(Image.new("RGBA", ink.size, GLYPH_EDGE + (255,)), origin, outline)
    layer.paste(tinted, origin, ink)
    return layer


def save(name: str, glyph: Image.Image) -> None:
    stamp = seal()
    stamp.alpha_composite(glyph)
    shadowed = Image.new("RGBA", (SIZE, SIZE))
    shadow = stamp.getchannel("A").filter(ImageFilter.GaussianBlur(8))
    shadowed.paste(Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 150)), (0, 6), shadow)
    shadowed.alpha_composite(stamp)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    shadowed.resize((FINAL, FINAL), Image.LANCZOS).save(OUTPUT / f"stamp-{name}.png")


def save_hud_stake() -> None:
    icon = Image.open(SPRITE_DIR / f"{HUD_SPRITES['hud-stake-of-marika']}.png").convert("RGBA")
    icon = icon.crop(icon.getchannel("A").point(lambda alpha: 255 if alpha > 20 else 0).getbbox())
    icon = icon.resize((icon.width * HUD_UPSCALE, icon.height * HUD_UPSCALE), Image.LANCZOS)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    icon.save(OUTPUT / "hud-stake-of-marika.png")


def main() -> None:
    save_hud_stake()
    save("portal", stroke_glyph(portal))
    save("spiritspring", stroke_glyph(spiritspring))
    save("spirit", spirit_glyph())
    print(sorted(path.name for path in OUTPUT.glob("*.png")))


if __name__ == "__main__":
    main()
