"""Compile the slim data files the game loads, into data/game/.

  * kanji.json: every joyo kanji (every kanji a player may guess) with its
    strokes, JLPT level, frequency, meanings, readings and parts.
  * answers.json: the daily schedule. `epoch` is the date of puzzle 1, and
    each list in LISTS (one per mode: js/config/modes.js `answers`) has its
    answers in a fixed shuffled order; `words` has the reading and meanings
    of each answer of 2+ kanji.

Answers are only the words marked Keep on the review page (data/review.json,
read only). With no Keep words, the answer lists are empty and the summary
says so: this script never makes up answers.

The order is stable: answers for days already played (up to tomorrow, for
time zones ahead of this computer) never move. Everything after them is
shuffled again from a fixed seed, so newly kept words mix in evenly.

Run it from the project folder after build_data.py or after reviewing words:

    python -I -X utf8 tools/compile_game.py [--review PATH] [--today YYYY-MM-DD]

Standard library only.
"""

from __future__ import annotations

import argparse
import datetime
import gzip
import json
import random
import sys
from collections import defaultdict
from pathlib import Path

# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------

# The date of daily puzzle 1. Set it to launch day at launch (step 8), then
# never change it: every puzzle number, and so every daily answer, hangs on it.
EPOCH = "2026-11-01"

# Seed for the answer shuffle. Changing it reorders every day not yet played.
SHUFFLE_SEED = "kanjiru"

# Days after today whose answers are locked too (time zones ahead of this
# computer may already be on tomorrow).
LOCK_AHEAD_DAYS = 1

# The answer lists, one per mode (js/config/modes.js `answers`). A Keep word
# goes in each list whose rules it meets: how many kanji it has, and how
# many parts (palette tiles) they have in all. "main" is the daily: 4-6
# parts, like Wordle's five letters, in 1 to 4 kanji.
LISTS = {
    "main": {"lengths": (1, 2, 3, 4), "parts": (4, 6)},
}

# Kanji with the same parts in the same places as another joyo kanji (未/末)
# can't be told apart by scoring, so they leave the one-kanji answers.
ALLOW_LOOKALIKE_ANSWERS = False

MAX_KANJI_MEANINGS = 3   # meanings kept per kanji
DAYS_IN_A_YEAR = 365     # for the summary

PROJECT_DIR = Path(__file__).resolve().parent.parent
CANDIDATES_FILE = PROJECT_DIR / "data" / "candidates.json"
REVIEW_FILE = PROJECT_DIR / "data" / "review.json"   # the review page's; only read
OUT_DIR = PROJECT_DIR / "data" / "game"

KANJI_FIELDS = ["strokes", "jlpt", "freq", "meanings", "on", "kun", "parts"]


# --------------------------------------------------------------------------
# Kanji
# --------------------------------------------------------------------------

def clean_meanings(meanings: list[str]) -> list[str]:
    """Drops KANJIDIC's radical labels ('one radical (no.1)') and keeps the first few."""
    kept = [m for m in meanings if "radical (no" not in m]
    return (kept or meanings)[:MAX_KANJI_MEANINGS]


def compile_kanji(candidates: dict) -> dict:
    """Every joyo kanji as a row of KANJI_FIELDS. Parts are [tile, position]
    or [tile, position, form] when the glyph shown differs (氵 for 水)."""
    rows = {}
    for ch, k in candidates["kanji"].items():
        parts = [[p["el"], p["pos"]] + ([p["form"]] if p.get("form") else []) for p in k["parts"]]
        rows[ch] = [
            k["strokes"], k.get("jlpt"), k.get("freq"),
            clean_meanings(k.get("meanings") or []),
            k.get("on") or [], k.get("kun") or [], parts,
        ]
    return {
        "about": "Every joyo kanji a player may guess, as rows of `fields`. Parts are "
                 "[tile, position] or [tile, position, form]; tiles are data/parts.json's. "
                 "Written by tools/compile_game.py from data/candidates.json.",
        "fields": KANJI_FIELDS,
        "kanji": rows,
    }


def lookalikes(candidates: dict) -> set[str]:
    """Kanji whose parts and positions match another joyo kanji's exactly."""
    groups = defaultdict(list)
    for ch, k in candidates["kanji"].items():
        groups[tuple(sorted((p["el"], p["pos"]) for p in k["parts"]))].append(ch)
    return {ch for group in groups.values() if len(group) > 1 for ch in group}


# --------------------------------------------------------------------------
# Answers
# --------------------------------------------------------------------------

def puzzle_number(epoch: str, day: datetime.date) -> int:
    return (day - datetime.date.fromisoformat(epoch)).days + 1


def part_count(candidates: dict, word: str) -> int | None:
    """How many parts (palette tiles) a word's kanji have in all, or None
    when a kanji has no breakdown."""
    kanji = candidates["kanji"]
    if any(ch not in kanji for ch in word):
        return None
    return sum(len(kanji[ch]["parts"]) for ch in word)


def compile_answers(candidates: dict, review: dict | None, previous: dict | None,
                    today: datetime.date, epoch: str = EPOCH, lists: dict = LISTS) -> tuple[dict, dict]:
    """Returns (answers.json content, report for the summary)."""
    decisions = (review or {}).get("decisions") or {}
    keep = {word for word, decision in decisions.items() if decision == "keep"}
    by_word = {w["word"]: w for w in candidates["words"]}
    twins = set() if ALLOW_LOOKALIKE_ANSWERS else lookalikes(candidates)

    prev_answers = (previous or {}).get("answers") or {}
    prev_words = (previous or {}).get("words") or {}
    same_epoch = (previous or {}).get("epoch") == epoch
    locked_count = max(0, puzzle_number(epoch, today) + LOCK_AHEAD_DAYS)

    def fits(word: str, rule: dict) -> bool:
        info = by_word[word]
        parts = part_count(candidates, word)
        low, high = rule["parts"]
        return (info["length"] in rule["lengths"] and parts is not None and low <= parts <= high
                and not (info["length"] == 1 and word in twins))

    report = {
        "keep": len(keep),
        "not_candidates": sorted(w for w in keep if w not in by_word),
        "lookalikes": sorted(w for w in keep if w in by_word and by_word[w]["length"] == 1 and w in twins),
        "lists": {},
    }
    answers, words = {}, {}
    for name, rule in lists.items():
        wanted = {w for w in keep if w in by_word and fits(w, rule)}
        previous_list = prev_answers.get(name, []) if same_epoch else []
        locked = previous_list[:min(locked_count, len(previous_list))]
        rest = sorted(wanted - set(locked))
        random.Random(f"{SHUFFLE_SEED}:{name}").shuffle(rest)
        answers[name] = locked + rest
        lengths = defaultdict(int)
        for word in answers[name]:
            lengths[len(word)] += 1
        report["lists"][name] = {
            "answers": len(locked) + len(rest),
            "locked": len(locked),
            "locked_not_kept": sorted(w for w in locked if w not in wanted),
            "by_length": dict(sorted(lengths.items())),
        }
        for word in answers[name]:
            if len(word) > 1 and word not in words:
                info = by_word.get(word)
                words[word] = [info.get("reading", ""), info.get("meanings", [])] if info else prev_words.get(word, ["", []])

    doc = {
        "about": "The daily schedule: puzzle n (n = days since epoch + 1) plays answer n of its "
                 "mode's list, wrapping round. Only words marked Keep on the review page. Written by "
                 "tools/compile_game.py; words gives each 2+ kanji answer's [reading, meanings].",
        "epoch": epoch,
        "answers": answers,
        "words": words,
    }
    return doc, report


# --------------------------------------------------------------------------
# Writing
# --------------------------------------------------------------------------

def dumps(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def answers_text(doc: dict) -> str:
    """One answer, and one word's info, per line, so schedule changes diff cleanly."""
    lines = ["{", f'"about":{dumps(doc["about"])},', f'"epoch":{dumps(doc["epoch"])},', '"answers":{']
    entries = list(doc["answers"].items())
    for i, (length, items) in enumerate(entries):
        body = ",\n".join(dumps(w) for w in items)
        lines.append(f"{dumps(length)}:[" + (f"\n{body}\n" if items else "") + "]" + ("," if i < len(entries) - 1 else ""))
    lines.append("},")
    word_lines = ",\n".join(f"{dumps(w)}:{dumps(info)}" for w, info in doc["words"].items())
    lines.append('"words":{' + (f"\n{word_lines}\n" if word_lines else "") + "}")
    lines.append("}")
    return "\n".join(lines) + "\n"


def write_text(path: Path, text: str) -> None:
    """UTF-8 with \n line ends on every system (Python 3.9 has no write_text newline)."""
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else None


def size_note(text: str) -> str:
    raw = len(text.encode("utf-8"))
    zipped = len(gzip.compress(text.encode("utf-8")))
    return f"{raw / 1024:.0f} KB ({zipped / 1024:.0f} KB gzipped)"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--review", type=Path, default=REVIEW_FILE, help="the review page's decisions (read only)")
    parser.add_argument("--candidates", type=Path, default=CANDIDATES_FILE)
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    parser.add_argument("--today", type=datetime.date.fromisoformat, default=datetime.date.today(),
                        help="the date to lock days up to (default: today)")
    args = parser.parse_args(argv)

    candidates = read_json(args.candidates)
    if candidates is None:
        print(f"No {args.candidates}: run tools/build_data.py first.", file=sys.stderr)
        return 1
    review = read_json(args.review)
    previous = read_json(args.out / "answers.json")

    kanji_text = dumps(compile_kanji(candidates)) + "\n"
    doc, report = compile_answers(candidates, review, previous, args.today)
    text = answers_text(doc)

    args.out.mkdir(parents=True, exist_ok=True)
    write_text(args.out / "kanji.json", kanji_text)
    write_text(args.out / "answers.json", text)

    print(f"kanji.json: {len(candidates['kanji'])} kanji, {size_note(kanji_text)}")
    print(f"answers.json: {size_note(text)}, epoch {doc['epoch']} "
          f"(today is puzzle {puzzle_number(doc['epoch'], args.today)})")
    if review is None:
        print(f"\nNo review file at {args.review}.")
    if not report["keep"]:
        print("\nNo words are marked Keep yet, so every answer list is EMPTY and no mode has a daily.\n"
              "Mark words Keep on the review page, then run this again.")
    else:
        print(f"\nKeep words: {report['keep']}")
    for name, info in report["lists"].items():
        days = info["answers"]
        note = "a year of dailies" if days >= DAYS_IN_A_YEAR else f"{DAYS_IN_A_YEAR - days} short of a year"
        mix = ", ".join(f"{n} kanji: {c}" for n, c in info["by_length"].items())
        print(f"  {name}: {days} answers ({note}; {mix or 'none'}); {info['locked']} locked as already played")
        if info["locked_not_kept"]:
            print(f"    still scheduled though no longer Keep (day already played): {' '.join(info['locked_not_kept'])}")
    if report["lookalikes"]:
        print(f"Left out, look-alike kanji: {' '.join(report['lookalikes'])}")
    if report["not_candidates"]:
        print(f"Left out, no longer candidates: {' '.join(report['not_candidates'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
