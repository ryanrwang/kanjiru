"""
Cuts the parts Noto lacks (font: false in data/parts.json) out of Noto Serif
JP itself, so they look like the font's own glyphs: its weight, its thick and
thin strokes, its serifs and brush ends. Each comes from a kanji that has it
(龶 is the top of 青), as the outlines of the strokes it's made of.

    python -I -X utf8 tools/make_outlines.py
    python -I -X utf8 tools/make_outlines.py --list 看    # number a kanji's outlines

Writes data/part-outlines.json and copies each outline into data/parts.json
(build_data.py copies them too on a rebuild). The game draws an outline in
place of KanjiVG's strokes (js/play/glyph.js).

Needs fontTools (pip install fonttools) and the Noto Serif JP variable font
(Windows has it in C:/Windows/Fonts; on a Mac, install it from Google Fonts or
pass --serif). Run it again when a new part lacks a glyph: add it to PARTS.

The outlines are Noto Serif JP's (SIL Open Font License 1.1; data/ATTRIBUTION.md).
"""
import argparse
import datetime
import json
import pathlib
import sys

try:
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.pens.recordingPen import DecomposingRecordingPen
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
except ImportError:
    sys.exit("Needs fontTools: pip install fonttools")

HERE = pathlib.Path(__file__).resolve().parent.parent
OUTLINES_FILE = HERE / "data" / "part-outlines.json"
PARTS_FILE = HERE / "data" / "parts.json"

FONTS = [
    "C:/Windows/Fonts/NotoSerifJP-VF.ttf",
    "~/Library/Fonts/NotoSerifJP-VariableFont_wght.ttf",
    "/Library/Fonts/NotoSerifJP-VariableFont_wght.ttf",
]

# The tiles' weight (styles.css .tile: --font-weight-bold).
WEIGHT = 700

# part: (the kanji it's cut from, which of that kanji's outlines are the part,
# the weight). Outlines are numbered in the font's order: --list shows them.
# 㐄 is small in 降, so it's scaled up from a lighter weight, which keeps its
# strokes as thick as the other keys'.
PARTS = {
    "龵": ("看", [0, 1, 6, 7], WEIGHT),
    "龶": ("青", [3, 4, 5, 6], WEIGHT),
    "㐄": ("降", [4, 5, 6, 7], 450),
    "业": ("並", [1, 2, 5, 6, 7], WEIGHT),
    "𢆉": ("幸", [0, 2, 3, 5, 7], WEIGHT),
}

# Where a part goes in its 1000-unit box (the em; y down, top at the
# ascender, 880 in Noto): its longer side 0.9 em, no more than 1.5 times its
# size in the kanji, centred on the ideographic centre, like the font's own
# parts (扌 士).
BOX, ASCENDER, EXTENT, MAX_SCALE, CENTRE_Y = 1000, 880, 900, 1.5, 380


def find_font(path):
    for candidate in [path] if path else FONTS:
        p = pathlib.Path(candidate).expanduser()
        if p.exists():
            return p
    sys.exit("Can't find Noto Serif JP; pass --serif <path to the variable .ttf>")


class Font:
    def __init__(self, path):
        self.path = path
        self.instances = {}
        self.version = TTFont(path)["name"].getDebugName(5)

    def outlines(self, char, weight):
        """A kanji's outlines at a weight: [(bounds, recorded pen ops)]."""
        if weight not in self.instances:
            font = instantiateVariableFont(TTFont(self.path), {"wght": weight})
            self.instances[weight] = (font.getGlyphSet(), font.getBestCmap())
        glyphs, cmap = self.instances[weight]
        if ord(char) not in cmap:
            sys.exit(f"Noto Serif JP has no {char}")
        pen = DecomposingRecordingPen(glyphs)
        glyphs[cmap[ord(char)]].draw(pen)
        out, current = [], []
        for op, args in pen.value:
            current.append((op, args))
            if op in ("closePath", "endPath"):
                out.append(current)
                current = []
        result = []
        for ops in out:
            bounds = BoundsPen(glyphs)
            for op, args in ops:
                getattr(bounds, op)(*args)
            result.append((bounds.bounds, ops))
        return result


def cut(font, part, host, picks, weight):
    outlines = font.outlines(host, weight)
    if max(picks) >= len(outlines):
        sys.exit(f"{part}: {host} has only {len(outlines)} outlines (--list {host})")
    chosen = [outlines[i] for i in picks]
    x0 = min(b[0] for b, _ in chosen); y0 = min(b[1] for b, _ in chosen)
    x1 = max(b[2] for b, _ in chosen); y1 = max(b[3] for b, _ in chosen)
    scale = min(MAX_SCALE, EXTENT / max(x1 - x0, y1 - y0))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # Font units (y up) to the box (y down).
    transform = (scale, 0, 0, -scale, BOX / 2 - cx * scale, ASCENDER - CENTRE_Y + cy * scale)
    svg = SVGPathPen(None, ntos=lambda n: f"{round(n)}")
    pen = TransformPen(svg, transform)
    for _, ops in chosen:
        for op, args in ops:
            getattr(pen, op)(*args)
    return {"from": host, "weight": weight, "scale": round(scale, 2),
            "viewBox": f"0 0 {BOX} {BOX}", "d": svg.getCommands()}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--serif", help="path to Noto Serif JP (variable .ttf)")
    ap.add_argument("--list", metavar="KANJI", help="number this kanji's outlines and stop")
    args = ap.parse_args()
    font = Font(find_font(args.serif))

    if args.list:
        for i, (b, _) in enumerate(font.outlines(args.list, WEIGHT)):
            print(f"{i:2}  x {round(b[0]):4}–{round(b[2]):4}   y {round(b[1]):4}–{round(b[3]):4}")
        return

    outlines = {part: cut(font, part, *spec) for part, spec in PARTS.items()}
    OUTLINES_FILE.write_text(json.dumps({
        "meta": {
            "generated": datetime.date.today().isoformat(),
            "about": "Parts Noto lacks, cut from a Noto Serif JP kanji that has them "
                     "(tools/make_outlines.py). Fill d with the text colour in viewBox, "
                     "the em box (y down).",
            "font": f"Noto Serif JP ({font.version})",
            "licence": "SIL Open Font License 1.1",
        },
        "outlines": outlines,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    parts = json.loads(PARTS_FILE.read_text(encoding="utf-8"))
    placed = set()
    for tile in parts["tiles"]:
        for form in tile["forms"]:
            if form["glyph"] in outlines:
                form["outline"] = {k: outlines[form["glyph"]][k] for k in ("viewBox", "d")}
                placed.add(form["glyph"])
    PARTS_FILE.write_text(json.dumps(parts, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    for part, o in outlines.items():
        print(f"{part}  from {o['from']}, weight {o['weight']}, x{o['scale']}, {len(o['d'])} chars"
              + ("" if part in placed else "  (not in parts.json)"))
    lacking = [f["glyph"] for t in parts["tiles"] for f in t["forms"] if f.get("font") is False and "outline" not in f]
    if lacking:
        print(f"Still drawn from KanjiVG's strokes: {''.join(lacking)} (add them to PARTS)")


if __name__ == "__main__":
    main()
