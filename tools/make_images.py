"""
Draws the home-screen icons and the link-preview image from the favicon's
design (favicon.svg: a vermilion hanko seal with a white 漢).

    python -I -X utf8 tools/make_images.py

Writes, from this folder:
    icons/icon-192.png          manifest icon (the favicon's rounded seal)
    icons/icon-512.png          manifest icon
    icons/icon-maskable-512.png manifest icon Android may crop to any shape:
                                full-bleed vermilion, 漢 inside the safe circle
    icons/apple-touch-icon.png  180 x 180, full bleed (iOS rounds the corners)
    icons/share.png             1200 x 630 link preview (Open Graph, Twitter)

Needs Pillow and the Noto Serif JP and Noto Sans JP variable fonts (Windows
has both in C:/Windows/Fonts; on a Mac, install them from Google Fonts or
pass --serif and --sans). Run it again after changing the favicon, the brand
colour or the share text, then commit the PNGs. Images are cached for 30 days
by the site's .htaccess, so a changed image needs a new file name (and the
new name in manifest.webmanifest and index.html).

The colours are raw values from tokens.js (static images can't read tokens):
"""
import argparse
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent

# tokens.js primitives
VERMILION = "#B8331F"   # vermilion 600, the brand (favicon.svg)
WHITE = "#FFFFFF"
PAPER = "#FAF8F5"       # gray 50, the light page
INK = "#171513"         # gray 900, light text
MUTED = "#6B6458"       # gray 550, muted text
TILE_BORDER = "#CBC4B8"  # gray 300
FEEDBACK = {"hit": "#4C8B3F", "near": "#B07F12", "miss": "#7A7366"}

FONT_PATHS = {
    "serif": [
        "C:/Windows/Fonts/NotoSerifJP-VF.ttf",
        "~/Library/Fonts/NotoSerifJP-VariableFont_wght.ttf",
        "/Library/Fonts/NotoSerifJP-VariableFont_wght.ttf",
    ],
    "sans": [
        "C:/Windows/Fonts/NotoSansJP-VF.ttf",
        "~/Library/Fonts/NotoSansJP-VariableFont_wght.ttf",
        "/Library/Fonts/NotoSansJP-VariableFont_wght.ttf",
    ],
}

# Drawn at this many times the size, then scaled down, for smooth edges.
SUPERSAMPLE = 4

# The share image's text and example rows: the start screen's worked
# example (answer 時間, parts 日 土 寸 門 日), its first and last rows.
SHARE_TAGLINE = "A kanji word puzzle · 漢字のことばパズル"
SHARE_ROWS = [
    [("口", "miss"), ("日", "near"), ("寸", "hit"), ("木", "miss"), ("月", "miss")],
    [("日", "hit"), ("土", "hit"), ("寸", "hit"), ("門", "hit"), ("日", "hit")],
]


def find_font(kind: str, given: str | None) -> pathlib.Path:
    for p in ([given] if given else FONT_PATHS[kind]):
        path = pathlib.Path(p).expanduser()
        if path.exists():
            return path
    sys.exit(f"Can't find the Noto {kind.title()} JP font; pass --{kind} <path to the .ttf>")


def font(path: pathlib.Path, size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(path), size)
    f.set_variation_by_axes([weight])
    return f


def draw_centered(draw: ImageDraw.ImageDraw, box, text: str, f, fill) -> None:
    """Text centred on its ink (not its line box), so a glyph sits in the middle."""
    left, top, right, bottom = draw.textbbox((0, 0), text, font=f)
    x = (box[0] + box[2]) / 2 - (left + right) / 2
    y = (box[1] + box[3]) / 2 - (top + bottom) / 2
    draw.text((x, y), text, font=f, fill=fill)


def seal(size: int, serif: pathlib.Path, *, inset: float, radius: float, glyph: float) -> Image.Image:
    """The hanko: a vermilion square with a white 漢, as fractions of size."""
    big = size * SUPERSAMPLE
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = round(big * inset)
    d.rounded_rectangle((pad, pad, big - pad - 1, big - pad - 1), radius=round(big * radius), fill=VERMILION)
    draw_centered(d, (0, 0, big, big), "漢", font(serif, round(big * glyph), 700), WHITE)
    return img.resize((size, size), Image.LANCZOS)


def share_image(serif: pathlib.Path, sans: pathlib.Path) -> Image.Image:
    w, h = 1200, 630
    s = SUPERSAMPLE
    img = Image.new("RGB", (w * s, h * s), PAPER)
    d = ImageDraw.Draw(img)

    # Seal and name, side by side, centred.
    seal_size = 168
    title_font = font(serif, 136 * s, 900)
    title = "漢じる"
    tl, tt, tr, tb = d.textbbox((0, 0), title, font=title_font)
    gap = 40 * s
    group = seal_size * s + gap + (tr - tl)
    x0 = (w * s - group) // 2
    top = 64 * s
    stamp = seal(seal_size * s, serif, inset=0, radius=12 / 64, glyph=38 / 64)
    img.paste(stamp, (x0, top), stamp)
    tx = x0 + seal_size * s + gap - tl
    ty = top + (seal_size * s) / 2 - (tt + tb) / 2
    d.text((tx, ty), title, font=title_font, fill=INK)

    # Name in letters and the tagline.
    name_font = font(sans, 40 * s, 700)
    draw_centered(d, (0, 262 * s, w * s, 316 * s), "Kanjiru", name_font, INK)
    tag_font = font(sans, 34 * s, 400)
    draw_centered(d, (0, 318 * s, w * s, 366 * s), SHARE_TAGLINE, tag_font, MUTED)

    # Two rows of the worked example.
    tile, tgap, rgap = 80, 10, 12
    row_w = len(SHARE_ROWS[0]) * tile + (len(SHARE_ROWS[0]) - 1) * tgap
    y = 400
    tile_font = font(serif, 46 * s, 700)
    for row in SHARE_ROWS:
        x = (w - row_w) // 2
        for part, state in row:
            box = (x * s, y * s, (x + tile) * s - 1, (y + tile) * s - 1)
            d.rounded_rectangle(box, radius=8 * s, fill=FEEDBACK[state])
            draw_centered(d, box, part, tile_font, WHITE)
            x += tile + tgap
        y += tile + rgap
    return img.resize((w, h), Image.LANCZOS)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--serif", help="path to Noto Serif JP (variable .ttf)")
    ap.add_argument("--sans", help="path to Noto Sans JP (variable .ttf)")
    args = ap.parse_args()
    serif = find_font("serif", args.serif)
    sans = find_font("sans", args.sans)

    out = HERE / "icons"
    out.mkdir(exist_ok=True)
    # favicon.svg: the seal is inset 2/64, its corners 12/64, 漢 38/64.
    for size in (192, 512):
        seal(size, serif, inset=2 / 64, radius=12 / 64, glyph=38 / 64).save(out / f"icon-{size}.png", optimize=True)
    # Maskable: full bleed; the safe zone is a circle 80% of the width, so 漢
    # stays well inside it.
    seal(512, serif, inset=0, radius=0, glyph=0.5).save(out / "icon-maskable-512.png", optimize=True)
    # iOS rounds the corners itself and turns transparency black: full bleed.
    seal(180, serif, inset=0, radius=0, glyph=0.6).convert("RGB").save(out / "apple-touch-icon.png", optimize=True)
    share_image(serif, sans).save(out / "share.png", optimize=True)

    for p in sorted(out.glob("*.png")):
        with Image.open(p) as im:
            print(f"{p.relative_to(HERE)}: {im.width} x {im.height}, {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
