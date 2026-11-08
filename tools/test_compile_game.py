"""Tests for compile_game.py, on small made-up data (never the real word list).

Run from the project folder:   python -I -X utf8 -m unittest discover -s tools
"""

from __future__ import annotations

import datetime
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import compile_game as cg  # noqa: E402


def kanji(parts, meanings=("thing",)):
    return {"strokes": 4, "jlpt": 5, "freq": 10, "meanings": list(meanings), "on": ["オン"], "kun": ["くん"],
            "parts": [{"el": el, "pos": pos, **({"form": form} if form else {})} for el, pos, form in parts]}


CANDIDATES = {
    "kanji": {
        "明": kanji([("日", "left", None), ("月", "right", None)], ("bright", "one radical (no.1)")),
        "日": kanji([("日", "whole", None)]),
        "本": kanji([("木", "top", None), ("一", "bottom", None)]),
        "未": kanji([("一", "top", None), ("木", "bottom", None)]),
        "末": kanji([("一", "top", None), ("木", "bottom", None)]),
        "海": kanji([("水", "left", "氵"), ("毋", "right", None)]),
        "時": kanji([("日", "left", None), ("寺", "right", None)]),
        "間": kanji([("門", "outer", None), ("日", "inner", None)]),
    },
    "words": [
        {"word": w, "length": 1} for w in ["明", "未", "末", "海", "時", "間"]
    ] + [
        {"word": "日本", "length": 2, "reading": "にほん", "meanings": ["Japan"]},
        {"word": "明日", "length": 2, "reading": "あした", "meanings": ["tomorrow"]},
        {"word": "本日", "length": 2, "reading": "ほんじつ", "meanings": ["today"]},
        {"word": "時間", "length": 2, "reading": "じかん", "meanings": ["time"]},
    ],
}

# One list per length, any number of parts: the tests below check the
# schedule, not the part rule (that's test_lists_*).
TEST_LISTS = {"1": {"lengths": (1,), "parts": (1, 99)}, "2": {"lengths": (2,), "parts": (1, 99)}}

EPOCH = "2026-11-01"
BEFORE = datetime.date(2026, 10, 1)   # nothing played yet


def review(*keep, cut=()):
    return {"decisions": {**{w: "keep" for w in keep}, **{w: "cut" for w in cut}}, "parts": {}}


def compile_(rev, previous=None, today=BEFORE, epoch=EPOCH, lists=TEST_LISTS):
    return cg.compile_answers(CANDIDATES, rev, previous, today, epoch, lists)


class Answers(unittest.TestCase):
    def test_no_review_means_empty_lists(self):
        doc, report = compile_(None)
        self.assertEqual(doc["answers"], {"1": [], "2": []})
        self.assertEqual(doc["words"], {})
        self.assertEqual(report["keep"], 0)

    def test_only_keep_words_become_answers(self):
        doc, _ = compile_({"decisions": {"明": "keep", "日本": "keep", "時": "cut", "間": "maybe"}})
        self.assertEqual(doc["answers"]["1"], ["明"])
        self.assertEqual(doc["answers"]["2"], ["日本"])
        self.assertEqual(doc["words"], {"日本": ["にほん", ["Japan"]]})

    def test_lists_take_keep_words_by_parts_and_length(self):
        # 明 has 2 parts, 日本 3 (日 + 木 一), 時間 4 (日 寺 + 門 日).
        rule = {"main": {"lengths": (1, 2, 3, 4), "parts": (4, 6)}}
        doc, report = compile_(review("明", "日本", "時間"), lists=rule)
        self.assertEqual(doc["answers"], {"main": ["時間"]})
        self.assertEqual(doc["words"], {"時間": ["じかん", ["time"]]})
        self.assertEqual(report["lists"]["main"]["by_length"], {2: 1})

    def test_lists_check_the_number_of_kanji(self):
        doc, _ = compile_(review("明", "日本", "時間"), lists={"one": {"lengths": (1,), "parts": (1, 9)}})
        self.assertEqual(doc["answers"], {"one": ["明"]})
        self.assertEqual(doc["words"], {})

    def test_the_real_main_list_wants_4_to_6_parts(self):
        self.assertEqual(cg.LISTS["main"]["parts"], (4, 6))

    def test_lookalikes_leave_the_one_kanji_answers(self):
        doc, report = compile_(review("明", "未", "末"))
        self.assertEqual(doc["answers"]["1"], ["明"])
        self.assertEqual(report["lookalikes"], ["未", "末"])

    def test_words_that_are_not_candidates_are_left_out(self):
        doc, report = compile_(review("明", "東京"))
        self.assertEqual(doc["answers"]["1"], ["明"])
        self.assertEqual(report["not_candidates"], ["東京"])

    def test_the_shuffle_is_fixed(self):
        a, _ = compile_(review("明", "海", "時", "間"))
        b, _ = compile_(review("間", "時", "海", "明"))
        self.assertEqual(a["answers"]["1"], b["answers"]["1"])
        self.assertEqual(sorted(a["answers"]["1"]), ["明", "時", "海", "間"])

    def test_days_already_played_never_move(self):
        first, _ = compile_(review("明", "海", "時"))
        played = first["answers"]["1"]
        # Puzzle 2 is today; tomorrow (3) is locked too. Then 間 is kept and 時 cut.
        today = datetime.date(2026, 11, 2)
        later, report = compile_(review("明", "海", "間", cut=["時"]), previous=first, today=today)
        self.assertEqual(later["answers"]["1"][:3], played)
        self.assertEqual(report["lists"]["1"]["locked"], 3)
        self.assertIn("間", later["answers"]["1"][3:])
        self.assertEqual(report["lists"]["1"]["locked_not_kept"], ["時"])

    def test_future_days_are_reshuffled_as_words_are_added(self):
        first, _ = compile_(review("明", "海"))
        later, _ = compile_(review("明", "海", "時", "間"), previous=first)
        self.assertEqual(sorted(later["answers"]["1"]), ["明", "時", "海", "間"])

    def test_a_new_epoch_unlocks_everything(self):
        first, _ = compile_(review("明", "海", "時"))
        later, report = compile_(review("明", "海", "時"), previous=first,
                                 today=datetime.date(2026, 11, 20), epoch="2026-12-01")
        self.assertEqual(report["lists"]["1"]["locked"], 0)
        self.assertEqual(later["epoch"], "2026-12-01")


class Kanji(unittest.TestCase):
    def test_rows_follow_the_fields(self):
        doc = cg.compile_kanji(CANDIDATES)
        self.assertEqual(doc["fields"], cg.KANJI_FIELDS)
        row = dict(zip(doc["fields"], doc["kanji"]["海"]))
        self.assertEqual(row["parts"], [["水", "left", "氵"], ["毋", "right"]])
        self.assertEqual(len(doc["kanji"]), len(CANDIDATES["kanji"]))

    def test_radical_labels_are_dropped_from_meanings(self):
        row = dict(zip(cg.KANJI_FIELDS, cg.compile_kanji(CANDIDATES)["kanji"]["明"]))
        self.assertEqual(row["meanings"], ["bright"])


class Files(unittest.TestCase):
    def test_answers_text_is_valid_json(self):
        doc, _ = compile_(review("明", "海", "日本", "本日"))
        self.assertEqual(json.loads(cg.answers_text(doc)), doc)
        empty, _ = compile_(None)
        self.assertEqual(json.loads(cg.answers_text(empty)), empty)

    def test_main_writes_both_files_and_never_touches_the_review(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            (tmp / "candidates.json").write_text(json.dumps(CANDIDATES, ensure_ascii=False), encoding="utf-8")
            rev = tmp / "review.json"
            rev.write_text(json.dumps(review("明", "時間"), ensure_ascii=False), encoding="utf-8")
            before = rev.read_bytes()
            out = tmp / "game"
            code = cg.main(["--candidates", str(tmp / "candidates.json"), "--review", str(rev),
                            "--out", str(out), "--today", "2026-10-01"])
            self.assertEqual(code, 0)
            self.assertEqual(rev.read_bytes(), before)
            self.assertEqual(json.loads((out / "answers.json").read_text(encoding="utf-8"))["answers"], {"main": ["時間"]})
            self.assertIn("明", json.loads((out / "kanji.json").read_text(encoding="utf-8"))["kanji"])


if __name__ == "__main__":
    unittest.main()
