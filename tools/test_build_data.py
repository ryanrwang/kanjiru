"""Tests for build_data.py's part rules and its --parts-only mode, on small
made-up KanjiVG data (never the real sources, never the network).

Run from the project folder:   python -I -X utf8 -m unittest discover -s tools
"""

from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_data as bd  # noqa: E402


def stroke(kind: str, x0: float, y0: float, x1: float, y1: float) -> dict:
    """A straight KanjiVG-style stroke from (x0, y0) to (x1, y1)."""
    d = f"M{x0},{y0}C{x0},{y0} {x1},{y1} {x1},{y1}"
    return {"type": kind, "d": d, "points": bd.stroke_points(d)}


def node(el, kids, raw=None, part=None) -> dict:
    return {"el": el, "raw": raw, "part": part, "number": None, "kids": kids}


TILES, FORM_TO_TILE = bd.palette_tiles()


def forms(parts) -> list[str]:
    return [p["form"] for p in parts]


class DrawnAs(unittest.TestCase):
    def test_strokes_decide_the_glyph_shown(self):
        strokes = [stroke("㇔", 40, 20, 50, 40), stroke("㇒", 70, 20, 60, 40)]
        self.assertEqual(bd.drawn_as("八", [0, 1], strokes), "丷")   # 前's top
        spread = [stroke("㇒", 50, 20, 30, 60), stroke("㇏", 60, 20, 80, 60)]
        self.assertEqual(bd.drawn_as("八", [0, 1], spread), "八")     # 公's top

    def test_a_shape_can_belong_to_another_tile(self):
        # 渇's 曷: KanjiVG's 人 is drawn ㇒ ㇟, the shape of 匕.
        strokes = [stroke("㇒", 60, 20, 40, 50), stroke("㇟", 45, 20, 70, 70)]
        root = node("曷", [node("人", [0, 1])])
        [part] = bd.cut(root, strokes, FORM_TO_TILE)
        self.assertEqual((part["el"], part["form"]), ("匕", "匕"))

    def test_every_shown_glyph_is_a_tile_or_form(self):
        for named, shapes in bd.DRAWN_AS.items():
            for shown in [named, *shapes.values()]:
                self.assertIn(shown, FORM_TO_TILE)

    def test_a_typo_stops_the_build(self):
        with mock.patch.dict(bd.DRAWN_AS, {"八": {"㇔㇒": "X"}}):
            with self.assertRaises(SystemExit):
                bd.palette_tiles()
        with mock.patch.dict(bd.COMPONENT_SPLITS, {"开": [("X", 1), ("廾", 3)]}):
            with self.assertRaises(SystemExit):
                bd.palette_tiles()


class Roof(unittest.TestCase):
    def test_a_wide_人_on_top_is_the_roof(self):
        # 今: 人 spread over a narrower line and hook.
        strokes = [stroke("㇒", 54, 10, 15, 50), stroke("㇏", 54, 10, 95, 50),
                   stroke("㇐", 35, 60, 75, 60), stroke("㇇", 30, 75, 70, 95)]
        root = node("今", [node("人", [0, 1], raw="top"), node(None, [2, 3], raw="bottom")])
        parts = bd.cut(root, strokes, FORM_TO_TILE)
        self.assertEqual((parts[0]["el"], parts[0]["form"]), ("人", "𠆢"))

    def test_a_narrow_人_is_still_人(self):
        # 内: 人 is narrower than the 冂 it pokes into.
        strokes = [stroke("㇑", 10, 30, 10, 100), stroke("㇆", 10, 30, 100, 100),
                   stroke("㇒", 55, 10, 40, 70), stroke("㇏", 55, 30, 70, 70)]
        root = node("内", [node("冂", [0, 1]), node("人", [2, 3], raw="top")])
        parts = bd.cut(root, strokes, FORM_TO_TILE)
        self.assertEqual(forms(parts), ["冂", "人"])

    def test_kanjivg_positions_win(self):
        # 傘's small 人 sit left and right, even where they look stacked.
        strokes = [stroke("㇒", 30, 20, 10, 40), stroke("㇔", 30, 20, 45, 40),
                   stroke("㇒", 30, 50, 10, 70), stroke("㇔", 30, 50, 45, 70)]
        root = node("从", [node("人", [0, 1], raw="left"), node("人", [2, 3], raw="right")])
        self.assertEqual(forms(bd.cut(root, strokes, FORM_TO_TILE)), ["人", "人"])


class ClosedSelf(unittest.TestCase):
    def test_己_inside_包_shows_as_巳(self):
        strokes = [stroke("㇒", 30, 10, 10, 60), stroke("㇆", 30, 10, 90, 90),
                   stroke("㇕", 30, 40, 60, 50), stroke("㇐", 30, 55, 60, 55), stroke("㇟", 30, 40, 70, 80)]
        root = node("包", [node("勹", [0, 1]), node("己", [2, 3, 4])])
        self.assertEqual(forms(bd.cut(root, strokes, FORM_TO_TILE, ancestors=("包",))), ["勹", "巳"])
        self.assertEqual(forms(bd.cut(root, strokes, FORM_TO_TILE, ancestors=("記",))), ["勹", "己"])


class ComponentSplits(unittest.TestCase):
    def kai(self, count: int):
        kinds = ["㇐", "㇐", "㇒", "㇑"][:count]
        strokes = [stroke(kind, 20 + i, 20 + 10 * i, 80, 20 + 10 * i) for i, kind in enumerate(kinds)]
        return node("研", [node("开", list(range(count)))]), strokes

    def test_an_element_splits_by_its_recipe(self):
        root, strokes = self.kai(4)
        parts = bd.cut(root, strokes, FORM_TO_TILE)
        self.assertEqual(forms(parts), ["一", "廾"])
        self.assertEqual([sorted(p["strokes"]) for p in parts], [[0], [1, 2, 3]])

    def test_a_recipe_that_does_not_fit_is_skipped(self):
        root, strokes = self.kai(3)
        self.assertIsNone(bd.component_parts(root["kids"][0], strokes, FORM_TO_TILE))
        self.assertEqual(forms(bd.cut(root, strokes, FORM_TO_TILE)), ["一", "一", "丿"])


class Misnamed(unittest.TestCase):
    def test_a_group_twice_its_tiles_size_is_looked_into(self):
        # 望: KanjiVG names the top 亡 though it holds 亡 and 月.
        strokes = [stroke("㇐", 10, 10 + i, 90, 10 + i) for i in range(7)]
        top = node("亡", [node("亡", [0, 1, 2]), node("月", [3, 4, 5, 6])])
        root = node("望", [top])
        self.assertEqual(forms(bd.cut(root, strokes, FORM_TO_TILE)), ["亡"])
        self.assertEqual(forms(bd.cut(root, strokes, FORM_TO_TILE, {"亡": 3, "月": 4})), ["亡", "月"])


class LooseStrokes(unittest.TestCase):
    def test_a_pattern_is_found_inside_a_longer_run(self):
        # 喜's bottom: ㇔ ㇒ then a line.
        strokes = [stroke("㇔", 40, 10, 45, 20), stroke("㇒", 60, 10, 55, 20), stroke("㇐", 20, 30, 80, 30)]
        self.assertEqual(forms(bd.cut(node(None, [0, 1, 2]), strokes, FORM_TO_TILE)), ["丷", "一"])

    def test_ナ_needs_the_run_to_itself(self):
        # 倉's ㇕ ㇐ ㇐ ㇒: the last line and stroke cross, but they aren't ナ.
        strokes = [stroke("㇕", 20, 20, 80, 40), stroke("㇐", 20, 30, 80, 30),
                   stroke("㇐", 20, 40, 80, 40), stroke("㇒", 30, 20, 10, 80)]
        self.assertEqual(forms(bd.cut(node(None, [0, 1, 2, 3]), strokes, FORM_TO_TILE)), ["乙", "一", "一", "丿"])
        cross = [stroke("㇐", 20, 40, 80, 40), stroke("㇒", 50, 20, 20, 80)]
        self.assertEqual(forms(bd.cut(node(None, [0, 1]), cross, FORM_TO_TILE)), ["ナ"])


class Palette(unittest.TestCase):
    def test_variant_forms_count_as_their_tile(self):
        for form, tile in {"𠆢": "人", "亻": "人", "丷": "八", "巳": "己", "㔾": "卩",
                           "牜": "牛", "⻊": "足", "⺮": "竹", "夾": "夹"}.items():
            self.assertEqual(FORM_TO_TILE[form], tile)

    def test_月_and_肉_stay_apart(self):
        self.assertEqual(FORM_TO_TILE["月"], "月")
        self.assertEqual(FORM_TO_TILE["肉"], "肉")


# --------------------------------------------------------------------------
# --parts-only, on a two-kanji world: 日, 月 (tiles) and 明 (日 + 月).
# --------------------------------------------------------------------------

def kanjivg_svg(char: str, groups: list) -> str:
    """A KanjiVG file. groups: [(element or None, position or None, [(type, d)])]."""
    code = f"{ord(char):05x}"
    body, n = [], 0
    for i, (element, position, paths) in enumerate(groups, 1):
        attrs = (f' kvg:element="{element}"' if element else "") + (f' kvg:position="{position}"' if position else "")
        body.append(f'<g id="kvg:{code}-g{i}"{attrs}>')
        for kind, d in paths:
            n += 1
            body.append(f'<path id="kvg:{code}-s{n}" kvg:type="{kind}" d="{d}"/>')
        body.append("</g>")
    return ('<svg xmlns="http://www.w3.org/2000/svg" xmlns:kvg="http://kanjivg.tagaini.net" viewBox="0 0 109 109">'
            f'<g id="kvg:StrokePaths_{code}"><g id="kvg:{code}" kvg:element="{char}">{"".join(body)}</g></g></svg>')


def line(x0, y0, x1, y1) -> str:
    return f"M{x0},{y0}C{x0},{y0} {x1},{y1} {x1},{y1}"


SUN = [("㇑", line(20, 20, 20, 90)), ("㇕", line(20, 20, 50, 90)), ("㇐", line(20, 55, 50, 55)), ("㇐", line(20, 90, 50, 90))]
MOON = [("㇒", line(65, 20, 60, 95)), ("㇆", line(65, 20, 95, 95)), ("㇐", line(65, 45, 95, 45)), ("㇐", line(65, 70, 95, 70))]
SINGLES = {"一": "㇐", "丨": "㇑", "丶": "㇔", "丿": "㇒", "乙": "㇕", "亅": "㇚"}


def info(strokes: int, jlpt: int, parts: list) -> dict:
    return {"strokes": strokes, "grade": 1, "jlpt": jlpt, "freq": 1, "meanings": ["m"], "on": ["オン"],
            "kun": ["くん"], "parts": parts, "atomic": False, "override": False}


class PartsOnly(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        sources = self.dir / "tools" / "sources"
        sources.mkdir(parents=True)
        data = self.dir / "data"
        data.mkdir()
        with zipfile.ZipFile(sources / bd.KANJIVG_FILE, "w") as z:
            z.writestr(f"kanji/{ord('日'):05x}.svg", kanjivg_svg("日", [(None, None, SUN)]))
            z.writestr(f"kanji/{ord('月'):05x}.svg", kanjivg_svg("月", [(None, None, MOON)]))
            z.writestr(f"kanji/{ord('明'):05x}.svg",
                       kanjivg_svg("明", [("日", "left", SUN), ("月", "right", MOON)]))
            for glyph, kind in SINGLES.items():  # stroke counts for the single-stroke tiles
                z.writestr(f"kanji/{ord(glyph):05x}.svg", kanjivg_svg(glyph, [(None, None, [(kind, line(10, 10, 90, 90))])]))
        ranges = "U+4E00-4E8F, U+65E5, U+6708"
        (sources / bd.NOTO_CSS_FILE).write_text(
            f"@font-face {{ font-family: 'Noto Sans JP'; unicode-range: {ranges}; }}\n"
            f"@font-face {{ font-family: 'Noto Serif JP'; unicode-range: {ranges}; }}\n", encoding="utf-8")
        self.sources_meta = {"KANJIDIC2": {"version": "kept as it was"}}
        candidates = {
            "meta": {"generated": "2000-01-01", "maxLength": 4, "maxJlpt": 3, "sources": self.sources_meta},
            "kanji": {
                "日": info(4, 5, [{"el": "日", "pos": "whole"}]),
                "月": info(4, 5, [{"el": "月", "pos": "whole"}]),
                "明": info(8, 4, [{"el": "丨", "pos": "none"}]),   # stale: the rebuild fixes it
            },
            "words": [
                {"word": "明", "length": 1, "jlpt": 4, "source": "kanji"},
                {"word": "明日", "length": 2, "reading": "あした", "meanings": ["tomorrow"], "jlpt": 5,
                 "jmdict": "1", "common": True, "source": "jmdict"},
            ],
        }
        (data / "candidates.json").write_text(json.dumps(candidates, ensure_ascii=False), encoding="utf-8")
        (data / "parts-overrides.json").write_text('{"kanji": {}}', encoding="utf-8")
        self.review = '{"decisions": {"明日": "keep"}, "parts": {}}'
        (data / "review.json").write_text(self.review, encoding="utf-8")
        self.patches = mock.patch.multiple(
            bd,
            PROJECT_DIR=self.dir, SOURCES_DIR=sources,
            OUTPUT_FILE=data / "candidates.json", PARTS_FILE=data / "parts.json",
            OVERRIDES_FILE=data / "parts-overrides.json", REVIEW_FILE=data / "review.json",
            PALETTE="一 丨 丶 丿 乙 亅 日 月", VARIANT_FORMS={}, DRAWN_AS={}, COMPONENT_SPLITS={},
        )
        self.patches.start()
        self.addCleanup(self.patches.stop)

    def run_parts_only(self) -> dict:
        def no_network(*_args, **_kwargs):
            raise AssertionError("--parts-only must not download anything it already has")
        with mock.patch.object(bd.urllib.request, "urlopen", no_network), contextlib.redirect_stdout(io.StringIO()):
            bd.main(["--parts-only"])
        return json.loads((self.dir / "data" / "candidates.json").read_text(encoding="utf-8"))

    def test_recomputes_parts_and_keeps_the_rest(self):
        out = self.run_parts_only()
        self.assertEqual(out["kanji"]["明"]["parts"], [{"el": "日", "pos": "left"}, {"el": "月", "pos": "right"}])
        self.assertTrue(out["kanji"]["日"]["atomic"])
        self.assertEqual(out["kanji"]["明"]["meanings"], ["m"])
        self.assertEqual(out["kanji"]["明"]["jlpt"], 4)
        self.assertEqual(out["meta"]["sources"], self.sources_meta)

    def test_words_keep_their_info_and_atomic_kanji_leave(self):
        words = {w["word"]: w for w in self.run_parts_only()["words"]}
        self.assertEqual(sorted(words), ["明", "明日"])   # 日 and 月 are tiles
        self.assertEqual(words["明日"]["reading"], "あした")

    def test_writes_the_palette(self):
        self.run_parts_only()
        tiles = json.loads((self.dir / "data" / "parts.json").read_text(encoding="utf-8"))["tiles"]
        uses = {t["id"]: t["uses"] for t in tiles}
        self.assertEqual((uses["日"], uses["月"]), (2, 2))

    def test_only_glyphs_the_fonts_lack_are_drawn(self):
        # ⺌ is in the fonts but not in JIS X 0213: text. 龶 is in neither: drawn.
        with zipfile.ZipFile(bd.SOURCES_DIR / bd.KANJIVG_FILE, "a") as z:
            for glyph in "⺌龶":
                z.writestr(f"kanji/{ord(glyph):05x}.svg", kanjivg_svg(glyph, [(None, None, [("㇑", line(50, 10, 50, 90))])]))
        css = bd.SOURCES_DIR / bd.NOTO_CSS_FILE
        css.write_text(css.read_text(encoding="utf-8").replace("U+6708", "U+6708, U+2E8C"), encoding="utf-8")
        with mock.patch.object(bd, "PALETTE", "一 丨 丶 丿 乙 亅 日 月 ⺌ 龶"):
            self.run_parts_only()
        tiles = json.loads((self.dir / "data" / "parts.json").read_text(encoding="utf-8"))["tiles"]
        form = {f["glyph"]: f for t in tiles for f in t["forms"]}
        self.assertEqual(form["⺌"].get("jis"), False)
        self.assertNotIn("svg", form["⺌"], "the game's Noto shows it")
        self.assertEqual(form["龶"].get("font"), False)
        self.assertIn("svg", form["龶"])
        self.assertNotIn("svg", form["日"])

    def test_never_writes_the_review_file(self):
        self.run_parts_only()
        self.assertEqual((self.dir / "data" / "review.json").read_text(encoding="utf-8"), self.review)

    def test_needs_a_candidates_file(self):
        (self.dir / "data" / "candidates.json").unlink()
        with self.assertRaises(SystemExit):
            self.run_parts_only()

    def test_without_the_flag_it_runs_the_full_build(self):
        with mock.patch.object(bd, "main_full") as full, mock.patch.object(bd, "main_parts_only") as parts:
            bd.main([])
        full.assert_called_once()
        parts.assert_not_called()


if __name__ == "__main__":
    unittest.main()
