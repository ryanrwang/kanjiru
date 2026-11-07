"""Build data/candidates.json for Kanjiru.

Downloads the source dictionaries into tools/sources/ (a file that is already
there is reused, not downloaded again), then combines them into one JSON file:

  * every joyo kanji with its strokes, grade, JLPT level, frequency, meanings,
    readings and its KanjiVG component tree ("parts" and "tree");
  * the list of answer candidates: single kanji at JLPT N5..N3, and common
    JMdict words of 2..MAX_LENGTH kanji whose every kanji is N5..N3.

Run it from the project folder:   python -I tools/build_data.py

Standard library only. The downloaded files are treated as untrusted data:
they are only parsed, never executed.
"""

from __future__ import annotations

import csv
import datetime
import gzip
import html
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------

MAX_LENGTH = 4       # longest candidate word, in kanji
MAX_JLPT_LEVEL = 3   # hardest JLPT level allowed: 3 means N5, N4 and N3
MAX_GLOSSES = 3      # English glosses kept per word

# JMdict spellings tagged "search-only" (sK) are hidden forms that
# dictionaries never display, so they are not offered as answers.
SKIPPED_SPELLING_TAGS = {"sK"}

# Keep only spellings JMdict marks common (or that Waller lists). The
# others are mostly rare alternate spellings, such as 学文 for 学問.
REQUIRE_COMMON = True

# --------------------------------------------------------------------------
# Sources. Versions are pinned so a rebuild gives the same result; to move
# to a newer release, change the version here and delete the old file from
# tools/sources/. (KANJIDIC2 has no versioned URL: delete kanjidic2.xml.gz
# to fetch the current build.)
# --------------------------------------------------------------------------

KANJIDIC2_URL = "https://www.edrdg.org/kanjidic/kanjidic2.xml.gz"
KANJIDIC2_FILE = "kanjidic2.xml.gz"

KANJIVG_RELEASE = "r20260714"
KANJIVG_FILE = "kanjivg-20260714-main.zip"
KANJIVG_URL = (
    f"https://github.com/KanjiVG/kanjivg/releases/download/{KANJIVG_RELEASE}/{KANJIVG_FILE}"
)

JMDICT_RELEASE = "3.6.2+20261102210542"
JMDICT_FILE = f"jmdict-eng-common-{JMDICT_RELEASE}.json.zip"
JMDICT_URL = (
    "https://github.com/scriptin/jmdict-simplified/releases/download/"
    + urllib.parse.quote(JMDICT_RELEASE)
    + "/"
    + urllib.parse.quote(JMDICT_FILE)
)

# Jonathan Waller's JLPT vocab lists, joined to JMdict entry numbers by
# stephenmk/yomitan-jlpt-vocab (the CSVs in original_data/ at the release tag).
JLPT_VOCAB_RELEASE = "2025.08.01.0"
JLPT_VOCAB_URL = (
    "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/"
    f"{JLPT_VOCAB_RELEASE}/original_data/n{{level}}.csv"
)
JLPT_VOCAB_FILE = f"jlpt-vocab-{JLPT_VOCAB_RELEASE}-n{{level}}.csv"

# Jonathan Waller's JLPT kanji lists. tanos.co.uk is offline, so these are the
# Internet Archive's copies of his pages ("id_" = the page exactly as served).
WALLER_KANJI_SNAPSHOTS = {
    5: "20200806005029",
    4: "20200716184232",
    3: "20200724122309",
    2: "20200726143733",
    1: "20200731061258",
}
WALLER_KANJI_URL = "https://web.archive.org/web/{stamp}id_/http://www.tanos.co.uk/jlpt/jlpt{level}/kanji/"
WALLER_KANJI_FILE = "waller-kanji-n{level}-{stamp}.html"

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------

PROJECT_DIR = Path(__file__).resolve().parent.parent
SOURCES_DIR = PROJECT_DIR / "tools" / "sources"
OUTPUT_FILE = PROJECT_DIR / "data" / "candidates.json"

# The Waller levels the game accepts, easiest first: [5, 4, 3]
ALLOWED_LEVELS = list(range(5, MAX_JLPT_LEVEL - 1, -1))

# KanjiVG positions, reduced to the few the game shows.
POSITION_NAMES = {
    "left": "left",
    "right": "right",
    "top": "top",
    "bottom": "bottom",
    "kamae": "outer",
    "kamae1": "outer",
    "kamae2": "outer",
    "tare": "outer",
    "nyo": "outer",
    "tarec": "inner",
    "nyoc": "inner",
    # Rarer values in this KanjiVG release:
    "kamaec": "inner",  # the content of a kamae, like tarec and nyoc
    "⿵A": "outer",      # ideographic description: "surround from above", outer part
    "⿵B": "inner",      # ... and the part it surrounds
    "⿶1": "outer",      # "surround from below", outer part
    "⿶2": "inner",      # ... and the part it surrounds
    "middle": "none",   # middle of a three-row stack (霊, 黄); no game position for it
}

ITERATION_MARK = "々"

SVG_NS = "http://www.w3.org/2000/svg"
KVG_NS = "http://kanjivg.tagaini.net"


def log(message: str) -> None:
    print(message, flush=True)


# --------------------------------------------------------------------------
# Downloading
# --------------------------------------------------------------------------

def download(url: str, file_name: str) -> Path:
    """Save url as tools/sources/<file_name>, unless that file already exists."""
    path = SOURCES_DIR / file_name
    if path.exists():
        log(f"  have  {file_name}")
        return path
    SOURCES_DIR.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "kanjiru-build-data/1.0"})
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                data = response.read()
                # The Internet Archive replays tanos.co.uk's gzip transfer
                # encoding; store the plain page.
                if response.headers.get("Content-Encoding", "").lower() == "gzip":
                    data = gzip.decompress(data)
            break
        except OSError as error:
            if attempt == 3:
                raise SystemExit(f"Could not download {url}: {error}")
            log(f"  retry {file_name} ({error})")
            time.sleep(5 * attempt)
    partial = path.with_name(path.name + ".part")
    partial.write_bytes(data)
    partial.replace(path)
    log(f"  got   {file_name} ({len(data):,} bytes)")
    return path


def download_sources() -> dict[str, Path]:
    log("Sources:")
    paths = {
        "kanjidic2": download(KANJIDIC2_URL, KANJIDIC2_FILE),
        "kanjivg": download(KANJIVG_URL, KANJIVG_FILE),
        "jmdict": download(JMDICT_URL, JMDICT_FILE),
    }
    for level in ALLOWED_LEVELS:
        paths[f"vocab{level}"] = download(
            JLPT_VOCAB_URL.format(level=level), JLPT_VOCAB_FILE.format(level=level)
        )
    # All five kanji lists, so every kanji gets its level (not just N5..N3).
    for level, stamp in WALLER_KANJI_SNAPSHOTS.items():
        paths[f"kanji{level}"] = download(
            WALLER_KANJI_URL.format(stamp=stamp, level=level),
            WALLER_KANJI_FILE.format(stamp=stamp, level=level),
        )
    return paths


# --------------------------------------------------------------------------
# KANJIDIC2: strokes, grade, frequency, meanings and readings
# --------------------------------------------------------------------------

def read_kanjidic2(path: Path) -> tuple[dict, dict]:
    """Return ({kanji: info}, header) for every kanji in KANJIDIC2."""
    kanji = {}
    header = {}
    with gzip.open(path, "rb") as stream:
        for _event, element in ET.iterparse(stream):
            if element.tag == "header":
                header = {child.tag: (child.text or "").strip() for child in element}
            elif element.tag == "character":
                literal = element.findtext("literal")
                grade = element.findtext("misc/grade")
                freq = element.findtext("misc/freq")
                strokes = element.find("misc/stroke_count")  # first one is the accepted count
                kanji[literal] = {
                    "strokes": int(strokes.text) if strokes is not None else None,
                    "grade": int(grade) if grade else None,
                    "freq": int(freq) if freq else None,
                    # English meanings are the <meaning> elements with no m_lang.
                    "meanings": [
                        m.text for m in element.iterfind("reading_meaning/rmgroup/meaning")
                        if "m_lang" not in m.attrib
                    ],
                    "on": [
                        r.text for r in element.iterfind("reading_meaning/rmgroup/reading")
                        if r.get("r_type") == "ja_on"
                    ],
                    "kun": [
                        r.text for r in element.iterfind("reading_meaning/rmgroup/reading")
                        if r.get("r_type") == "ja_kun"
                    ],
                }
                element.clear()
    return kanji, header


# --------------------------------------------------------------------------
# Waller's JLPT lists
# --------------------------------------------------------------------------

def read_text(path: Path) -> str:
    data = path.read_bytes()
    if data[:2] == b"\x1f\x8b":  # a gzip-encoded page saved as-is
        data = gzip.decompress(data)
    return data.decode("utf-8")


def read_waller_kanji(paths: dict[str, Path]) -> tuple[dict, dict, list, list]:
    """Return ({kanji: level}, {level: count}, [kanji listed twice], [page dates])."""
    levels = {}
    counts = {}
    duplicates = []
    page_dates = set()
    for level in sorted(WALLER_KANJI_SNAPSHOTS, reverse=True):  # N5 first
        page = read_text(paths[f"kanji{level}"])
        # The list is the table whose header row is Kanji / Onyomi / Kunyomi / English;
        # the kanji is the first cell of each row.
        start = page.index("<th>Kanji</th>")
        table = page[start:page.index("</table>", start)]
        cells = re.findall(r"<tr>\s*<td>(.*?)</td>", table, flags=re.S)
        chars = [html.unescape(re.sub(r"<[^>]+>", "", cell)).strip() for cell in cells]
        for char in chars:
            if len(char) != 1:
                raise SystemExit(f"Unexpected cell {char!r} in Waller's N{level} kanji list")
            if char in levels:
                duplicates.append((char, levels[char], level))
                continue  # keep the easier level
            levels[char] = level
        counts[level] = len(chars)
        updated = re.search(r"Updated:\s*([A-Za-z]+ \d+, \d{4})", page)
        if updated:
            page_dates.add(updated.group(1))
    return levels, counts, duplicates, sorted(page_dates)


def read_waller_vocab(paths: dict[str, Path]) -> dict:
    """Return {(JMdict entry number, spelling): level} for the allowed levels."""
    vocab = {}
    for level in ALLOWED_LEVELS:  # easiest first, so a word keeps its easier level
        text = read_text(paths[f"vocab{level}"])
        for row in csv.DictReader(io.StringIO(text)):
            seq = row["jmdict_seq"].strip()
            spelling = row["kanji"].strip()  # empty when Waller lists the word in kana
            if seq and spelling:
                vocab.setdefault((seq, spelling), level)
    return vocab


# --------------------------------------------------------------------------
# KanjiVG: component trees
# --------------------------------------------------------------------------

def kvg_attributes(element: ET.Element) -> dict[str, str]:
    """The kvg:* attributes of an element, by local name (element, position...).

    Matched by local name because the files declare the kvg prefix twice with
    different URIs (http://kanjivg.tagaini.net in the DTD, and
    https://kanjivg.tagaini.net/ on the <svg> element).
    """
    return {
        key.rsplit("}", 1)[1]: value
        for key, value in element.attrib.items()
        if key.startswith("{")
    }


def parse_svg(text: str) -> ET.Element:
    """Parse a KanjiVG SVG without processing its DTD.

    The DTD only declares the kvg attributes, so it is dropped before parsing;
    if the file has no xmlns:kvg on its root, one is added.
    """
    text = re.sub(r"<!DOCTYPE.*?\]>", "", text, count=1, flags=re.S)
    if "xmlns:kvg=" not in text:
        text = text.replace("<svg ", f'<svg xmlns:kvg="{KVG_NS}" ', 1)
    return ET.fromstring(text)


def normalize_position(raw: str | None) -> str:
    if raw is None:
        return "none"
    if raw not in POSITION_NAMES:
        raise SystemExit(f"Unknown KanjiVG position {raw!r}: add it to POSITION_NAMES")
    return POSITION_NAMES[raw]


class TreeStats:
    """Counts of the KanjiVG quirks we smooth over, for the report."""

    def __init__(self) -> None:
        self.positions = set()          # every raw kvg:position seen
        self.lifted_groups = 0          # element-less groups whose children moved up
        self.merged_parts = 0           # kvg:part pieces merged into one part
        self.unmatched_parts = []       # (kanji, element): split piece with no partner at its level
        self.loose_strokes = []         # kanji with top-level strokes outside every component
        self.self_parts = []            # kanji whose only component is the kanji itself


def collect_nodes(group: ET.Element, kanji: str, stats: TreeStats) -> tuple[list[dict], int]:
    """Return (components directly inside a KanjiVG group, strokes outside them).

    A group without kvg:element is only a grouping, so its components are
    lifted into this level; a lifted component with no position of its own
    takes the grouping's position.
    """
    nodes = []
    loose_strokes = 0
    for child in group:
        if child.tag == f"{{{SVG_NS}}}path":
            loose_strokes += 1  # a stroke that belongs to no component at this level
            continue
        if child.tag != f"{{{SVG_NS}}}g":
            continue
        attributes = kvg_attributes(child)
        if "position" in attributes:
            stats.positions.add(attributes["position"])
        if "element" not in attributes:
            stats.lifted_groups += 1
            lifted, loose = collect_nodes(child, kanji, stats)
            loose_strokes += loose
            for node in lifted:
                if node["raw"] is None:
                    node["raw"] = attributes.get("position")
                nodes.append(node)
        else:
            nodes.append({
                "el": attributes["element"],
                "orig": attributes.get("original"),
                "raw": attributes.get("position"),
                "children": component_nodes(child, kanji, stats),
                "_part": attributes.get("part"),
                "_number": attributes.get("number"),
            })
    return nodes, loose_strokes


def component_nodes(group: ET.Element, kanji: str, stats: TreeStats) -> list[dict]:
    """Components directly inside a group, with split pieces merged."""
    nodes, _loose = collect_nodes(group, kanji, stats)
    return merge_split_parts(nodes, kanji, stats)


def merge_split_parts(nodes: list[dict], kanji: str, stats: TreeStats) -> list[dict]:
    """Merge the kvg:part pieces of one element (e.g. 衣 around 里 in 裏).

    The merged node sits where the first piece was, and its children are the
    pieces' children in order.
    """
    merged = []
    pieces = {}
    for node in nodes:
        part = node.pop("_part")
        number = node.pop("_number")
        if part is None:
            merged.append(node)
            continue
        key = (node["el"], number)
        if key not in pieces:
            pieces[key] = [node]
            merged.append(node)
        else:
            first = pieces[key][0]
            first["children"].extend(node["children"])
            if node["orig"] and not first["orig"]:
                first["orig"] = node["orig"]
            pieces[key].append(node)
    for (element, _number), group in pieces.items():
        node = group[0]
        raws = []
        for piece in group:
            if piece["raw"] not in raws:
                raws.append(piece["raw"])
        node["_raws"] = raws
        if len(group) == 1:
            stats.unmatched_parts.append((kanji, element))
        else:
            stats.merged_parts += 1
    return merged


def finish_node(node: dict) -> dict:
    """Give a node its final shape: el, orig, pos, raw, children."""
    raws = node.pop("_raws", None)
    if raws is not None and len(raws) > 1:
        # One element in two places (e.g. top + bottom): it wraps around the
        # rest of the kanji. raw lists the pieces' positions, joined with "+".
        raw = "+".join(r or "none" for r in raws)
        pos = "outer"
    else:
        raw = node["raw"]
        pos = normalize_position(raw)
    return {
        "el": node["el"],
        "orig": node["orig"],
        "pos": pos,
        "raw": raw,
        "children": [finish_node(child) for child in node["children"]],
    }


def read_kanjivg(path: Path, wanted: set[str]) -> tuple[dict, TreeStats]:
    """Return ({kanji: tree}, stats) for the wanted kanji."""
    trees = {}
    stats = TreeStats()
    base_file = re.compile(r"^kanji/([0-9a-f]{5})\.svg$")  # not 08a9e-Kaisho.svg etc.
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            match = base_file.match(name)
            if not match:
                continue
            kanji = chr(int(match.group(1), 16))
            if kanji not in wanted:
                continue
            svg = parse_svg(archive.read(name).decode("utf-8"))
            root = svg.find(f".//{{{SVG_NS}}}g[@id='kvg:{match.group(1)}']")
            if root is None:
                continue
            nodes, loose = collect_nodes(root, kanji, stats)
            nodes = [finish_node(n) for n in merge_split_parts(nodes, kanji, stats)]
            if loose and nodes:
                stats.loose_strokes.append(kanji)
            if not nodes:
                # Atomic kanji: no sub-components, so it is its own single part.
                nodes = [{"el": kanji, "orig": None, "pos": "whole", "raw": None, "children": []}]
            elif len(nodes) == 1 and nodes[0]["el"] == kanji:
                # Its only component is itself (王 drawn as the 玉 form, 竜 as
                # 龍): treat it as atomic, keeping orig and the sub-tree.
                nodes[0]["pos"] = "whole"
                stats.self_parts.append(kanji)
            trees[kanji] = nodes
    return trees, stats


def parts_of(tree: list[dict]) -> list[dict]:
    """The top level of a tree, without children."""
    return [{key: node[key] for key in ("el", "orig", "pos", "raw")} for node in tree]


# --------------------------------------------------------------------------
# JMdict: multi-kanji words
# --------------------------------------------------------------------------

def is_kanji(char: str) -> bool:
    code = ord(char)
    return (
        0x4E00 <= code <= 0x9FFF        # CJK Unified Ideographs
        or 0x3400 <= code <= 0x4DBF     # Extension A
        or 0xF900 <= code <= 0xFAFF     # Compatibility Ideographs
        or 0x20000 <= code <= 0x3FFFF   # Extensions B and later
    )


def applies(restriction: list[str], spelling: str) -> bool:
    return "*" in restriction or spelling in restriction


def read_jmdict(path: Path) -> dict:
    with zipfile.ZipFile(path) as archive:
        names = [n for n in archive.namelist() if n.endswith(".json")]
        if len(names) != 1:
            raise SystemExit(f"Expected one JSON file in {path.name}, found {names}")
        return json.loads(archive.read(names[0]).decode("utf-8"))


def build_words(jmdict: dict, kanji_levels: dict, vocab: dict) -> tuple[list, dict]:
    """Return (multi-kanji candidates, counts for the report)."""
    allowed = set(ALLOWED_LEVELS)
    options = {}          # spelling -> [(sort key, entry, kanji form, Waller level)]
    dropped_iteration = set()
    skipped_tagged = set()
    for order, entry in enumerate(jmdict["words"]):
        for form in entry["kanji"]:
            spelling = form["text"]
            if not 2 <= len(spelling) <= MAX_LENGTH:
                continue
            if not all(is_kanji(c) or c == ITERATION_MARK for c in spelling):
                continue
            others = [c for c in spelling if c != ITERATION_MARK]
            if not all(kanji_levels.get(c) in allowed for c in others):
                continue
            if ITERATION_MARK in spelling:
                dropped_iteration.add(spelling)
                continue
            if SKIPPED_SPELLING_TAGS & set(form.get("tags", [])):
                skipped_tagged.add(spelling)
                continue
            level = vocab.get((entry["id"], spelling))
            # Prefer: spelling marked common, then on Waller's list (easier
            # first), then JMdict order.
            key = (not form["common"], -(level or 0), order)
            options.setdefault(spelling, []).append((key, entry, form, level))

    words = []
    not_common = 0
    for spelling, choices in options.items():
        _key, entry, form, level = min(choices, key=lambda choice: choice[0])
        if REQUIRE_COMMON and not form["common"] and level is None:
            not_common += 1
            continue
        reading = next(
            (k["text"] for k in entry["kana"] if applies(k["appliesToKanji"], spelling)), None
        )
        glosses = []
        for sense in entry["sense"]:
            if not applies(sense["appliesToKanji"], spelling):
                continue
            for gloss in sense["gloss"]:
                if gloss["lang"] == "eng" and gloss["text"] not in glosses:
                    glosses.append(gloss["text"])
        words.append({
            "word": spelling,
            "length": len(spelling),
            "reading": reading,
            "meanings": glosses[:MAX_GLOSSES],
            "jlpt": level,
            "jmdict": entry["id"],
            "common": form["common"],
            "source": "jmdict",
        })
    counts = {
        "dropped_iteration": len(dropped_iteration - set(options)),
        "skipped_tagged": len(skipped_tagged - set(options)),
        "duplicate_spellings": sum(1 for c in options.values() if len(c) > 1),
        "dropped_not_common": not_common,
    }
    return words, counts


def word_order(word: dict) -> tuple:
    jlpt = word["jlpt"]
    return (word["length"], 0 if jlpt else 1, -(jlpt or 0), word["word"])


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main() -> None:
    started = time.perf_counter()
    paths = download_sources()

    log("Reading KANJIDIC2...")
    kanjidic, kd_header = read_kanjidic2(paths["kanjidic2"])
    joyo = {k for k, info in kanjidic.items() if info["grade"] and 1 <= info["grade"] <= 8}

    log("Reading Waller's JLPT lists...")
    kanji_levels, level_counts, level_duplicates, page_dates = read_waller_kanji(paths)
    vocab = read_waller_vocab(paths)

    log("Reading JMdict...")
    jmdict = read_jmdict(paths["jmdict"])
    multi_words, word_counts = build_words(jmdict, kanji_levels, vocab)

    single_words = [
        {"word": k, "length": 1, "jlpt": level, "source": "kanji"}
        for k, level in kanji_levels.items() if level in ALLOWED_LEVELS
    ]
    words = sorted(single_words + multi_words, key=word_order)

    # Every joyo kanji, plus any other kanji a candidate uses.
    used = {c for w in words for c in w["word"]}
    wanted = joyo | used
    missing_from_kanjidic = sorted(wanted - set(kanjidic))
    if missing_from_kanjidic:
        raise SystemExit(f"Kanji not in KANJIDIC2: {''.join(missing_from_kanjidic)}")

    log("Reading KanjiVG...")
    trees, tree_stats = read_kanjivg(paths["kanjivg"], wanted)

    kanji = {}
    for k in sorted(wanted):
        info = kanjidic[k]
        tree = trees.get(k, [])
        kanji[k] = {
            "strokes": info["strokes"],
            "grade": info["grade"],
            "jlpt": kanji_levels.get(k),
            "freq": info["freq"],
            "meanings": info["meanings"],
            "on": info["on"],
            "kun": info["kun"],
            "parts": parts_of(tree),
            "tree": tree,
        }

    sources = {
        "KANJIDIC2": {
            "url": KANJIDIC2_URL,
            "version": f"database {kd_header.get('database_version')}, "
                       f"created {kd_header.get('date_of_creation')}",
            "licence": "CC BY-SA 4.0 (EDRDG)",
        },
        "KanjiVG": {
            "url": KANJIVG_URL,
            "version": KANJIVG_RELEASE,
            "licence": "CC BY-SA 3.0 (Ulrich Apel)",
        },
        "JMdict (jmdict-simplified, eng-common)": {
            "url": JMDICT_URL,
            "version": f"{jmdict.get('version')}, JMdict {jmdict.get('dictDate')}",
            "licence": "CC BY-SA 4.0 (EDRDG)",
        },
        "JLPT vocab (Waller, via yomitan-jlpt-vocab)": {
            "url": JLPT_VOCAB_URL.format(level="{" + ",".join(map(str, ALLOWED_LEVELS)) + "}"),
            "version": JLPT_VOCAB_RELEASE,
            "licence": "CC BY-SA 4.0 (Stephen Kraus); lists CC BY (Jonathan Waller)",
        },
        "JLPT kanji (Waller, tanos.co.uk via Internet Archive)": {
            "url": WALLER_KANJI_URL.format(stamp=WALLER_KANJI_SNAPSHOTS[5], level=5),
            "version": "pages updated " + "; ".join(page_dates) + ", snapshots "
                       + ", ".join(f"N{lv} {st}" for lv, st in WALLER_KANJI_SNAPSHOTS.items()),
            "licence": "CC BY (Jonathan Waller)",
        },
    }

    output = {
        "meta": {
            "generated": datetime.date.today().isoformat(),
            "maxLength": MAX_LENGTH,
            "maxJlpt": MAX_JLPT_LEVEL,
            "sources": sources,
        },
        "kanji": kanji,
        "words": words,
    }
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    # ---- Report ----
    log("")
    log(f"Joyo kanji: {len(joyo)} ({sum(1 for k in joyo if k in trees)} with parts, "
        f"{len(joyo - set(trees))} missing from KanjiVG: {''.join(sorted(joyo - set(trees)))})")
    log(f"Other kanji used by words: {''.join(sorted(used - joyo)) or 'none'}")
    log("Waller kanji per level: " + ", ".join(f"N{lv} {n}" for lv, n in sorted(level_counts.items(), reverse=True)))
    if level_duplicates:
        log(f"  listed at two levels (kept the easier): {level_duplicates}")
    log(f"KanjiVG positions seen: {', '.join(sorted(tree_stats.positions))}")
    log(f"KanjiVG: {tree_stats.lifted_groups} element-less groups lifted, "
        f"{tree_stats.merged_parts} split parts merged, "
        f"{len(tree_stats.unmatched_parts)} unmatched split pieces, "
        f"{len(tree_stats.loose_strokes)} kanji with loose top-level strokes")
    log(f"  only component is itself (made whole): {''.join(tree_stats.self_parts) or 'none'}")
    log("Candidates (on Waller's list / common only):")
    for length in range(1, MAX_LENGTH + 1):
        group = [w for w in words if w["length"] == length]
        listed = sum(1 for w in group if w["jlpt"])
        log(f"  length {length}: {len(group)} ({listed} / {len(group) - listed})")
    log(f"Spellings dropped for {ITERATION_MARK}: {word_counts['dropped_iteration']}")
    log(f"Search-only spellings skipped: {word_counts['skipped_tagged']}")
    log(f"Spellings shared by several entries (deduped): {word_counts['duplicate_spellings']}")
    log(f"Rare spellings dropped (not common, not on Waller's list): {word_counts['dropped_not_common']}")
    log(f"Wrote {OUTPUT_FILE.relative_to(PROJECT_DIR)} "
        f"({OUTPUT_FILE.stat().st_size:,} bytes) in {time.perf_counter() - started:.1f} s")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
