"""Build data/candidates.json and data/parts.json for Kanjiru.

Downloads the source dictionaries into tools/sources/ (a file that is already
there is reused, not downloaded again), then writes:

  * candidates.json: every joyo kanji with its strokes, grade, JLPT level,
    frequency, meanings, readings and its parts (palette tiles, each with its
    position); and the answer candidates: single kanji at JLPT N5..N3 that
    aren't a tile themselves, and common JMdict words of 2..MAX_LENGTH kanji
    whose every kanji is N5..N3.
  * parts.json: the palette of parts players tap, with the variant forms
    each tile covers, and KanjiVG drawings for glyphs the fonts may lack.

Run it from the project folder:   python -I -X utf8 tools/build_data.py

Standard library only. The downloaded files are treated as untrusted data:
they are only parsed, never executed.
"""

from __future__ import annotations

import argparse
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
# Parts (docs/DESIGN.md, "Parts and palette")
# --------------------------------------------------------------------------

# The palette: every part players can tap, written as its main glyph,
# roughly by stroke count. A kanji splits into the highest KanjiVG
# components on this list; anything else splits further, and a stroke that
# belongs to no tile becomes one of the six single-stroke tiles. A kanji that
# is a tile itself is one part ("atomic").
#
# What earns a place: the radicals used by 2+ joyo kanji, plus shapes in 4+
# joyo kanji that KanjiVG can't split without leaving single strokes (业, 免,
# 兼...), plus a few kanji that would otherwise split into single strokes
# (不, 半, 五, 北, 以). Shapes that split into pieces a reader sees stay off
# (寺 = 土 + 寸, 千 = 丿 + 十, 主 = 丶 + 王). ナ and マ are the katakana that
# look like those shapes. The parts audit (docs/PARTS-AUDIT.md) added shapes
# whose split gave a wrong tile or a stroke salad: 且 (not 月 + 一), 今, 由,
# 申, 冊 (not 冂 + 廾), 夹 (not 大 人 人 大), 及 (not 丿 + 又), 巴 (not 己),
# 三 (for 春 奏 泰: 三 + 人) and 以.
PALETTE = """
一 丨 丶 丿 乙 亅
二 亠 人 儿 入 八 冂 冖 冫 几 凵 刀 力 勹 匕 匚 匸 十 卜 卩 厂 厶 又 乂 𠂊 𠂉 マ ナ 九 了 丂 乃
口 囗 土 士 夂 夕 大 女 子 宀 寸 小 ⺌ ⺍ 尢 尸 山 川 巛 工 己 巾 干 幺 广 廴 廾 弋 弓 ヨ 彑 彡 彳
    艹 辶 阝 丬 也 才 亡 三 及
心 戈 戸 手 支 攵 文 斗 斤 方 日 月 木 欠 止 歹 殳 毋 比 毛 氏 气 水 火 爪 父 片 牛 犬 王 夫 勿 尺
    井 廿 龶 㐄 五 不 卌 今 巴
玄 玉 瓦 生 用 田 疋 疒 癶 白 皮 皿 目 矢 石 示 禸 禾 穴 立 甘 牙 罒 业 乍 卯 司 央 巨 布 𢆉 可 北 半
    以 且 由 申 冊
竹 米 糸 缶 羊 羽 老 而 耒 耳 聿 肉 自 至 臼 舌 舟 艮 虍 虫 血 行 衣 西 瓜 共 戍 兆 曲 亥 亦 关 并
    朱 𠔉 𠂤 夹 𠂢 乑
見 角 言 谷 豆 豕 豸 貝 赤 走 足 身 車 辛 辰 酉 釆 里 甫 臣 余 我 呉
金 長 門 隹 雨 青 非 其 免 垂 岡 斉
面 革 音 頁 風 食 首 咼 爰 飛
馬 鬼 韋 竜 骨 鬲 兼 冓 袁
鳥 鹿 黄 曽 啇 祭
尞
㐮
監
"""

# Variant forms that count as the same part (decided: same part). The
# palette shows one tile, and a guess row shows the form the kanji uses.
# Most are the Kangxi radicals' own variants: 𠆢 is 人 as a roof (会, 今),
# 丷 is 八 drawn inward (前, 説), 牜 and ⺧ are 牛 on the left (物) and on top
# (告), ⻊ is 足 on the left (路), ⺮ is 竹 on top (答), 龵 is 手 on top (看),
# 巳 is 己 closed at the top (包, 選), 㔾 is 卩 with a curled foot (危, 範).
# 夾 is the older drawing of 夹 (頰). DRAWN_AS and ROOF say when KanjiVG's
# element shows as one of these.
VARIANT_FORMS = {
    "人": "亻𠆢",
    "水": "氵氺",
    "牛": "⺧牜",
    "羊": "⺷",
    "手": "扌龵",
    "心": "忄⺗",
    "刀": "刂",
    "火": "灬",
    "犬": "犭",
    "示": "礻",
    "衣": "衤",
    "食": "飠",
    "爪": "爫",
    "老": "耂",
    "西": "覀",
    "八": "丷",
    "足": "⻊",
    "竹": "⺮",
    "己": "巳",
    "卩": "㔾",
    "夹": "夾",
}

# KanjiVG names some parts by where they come from, not by how they are
# drawn: 会's roof is 人, 前's 丷 is 八, 渇's 匕 is 人. The strokes say what a
# reader sees. For a part KanjiVG names (left), the glyph its stroke types
# draw (first character of each type, as in STROKE_PATTERNS). A glyph that
# is a form of the same tile only changes what is shown; one that belongs to
# another tile (匕, マ, 冖) makes the part that tile.
DRAWN_AS = {
    "八": {"㇔㇒": "丷"},                              # 前 説 並 弟
    "牛": {"㇒㇐㇑㇀": "牜",                           # 物 特 牧: ends rising
           "㇒㇐㇑㇐": "⺧"},                           # 告 造 酷: the vertical stops
    "足": {"㇑㇕㇐㇑㇐㇑㇀": "⻊"},                      # 路 距 跡
    "竹": {"㇒㇐㇔㇒㇐㇒": "⺮"},                        # 答 第 等: short ticks, no verticals
    "羊": {"㇔㇒㇐㇑㇐㇐": "⺷"},                        # 美 義 差: the vertical stops
    "手": {"㇒㇐㇐㇒": "龵"},                           # 看
    "卩": {"㇆㇟": "㔾",                               # 危 範 宛
           "㇇㇔": "マ", "㇆㇔": "マ"},                  # 令's foot in 領 齢, as in 冷 鈴
    "人": {"㇒㇟": "匕"},                               # 曷 in 渇 喝 掲 謁 褐
    "宀": {"㇔㇖": "冖"},                               # 隺 in 確 鶴: no top dot
}

# 人 on top, at least this wide against what it covers, is the roof 𠆢 (会
# 今 命). 人 inside 冂 (内 病) is narrower: under 0.75 in this KanjiVG,
# against 0.9 and up for every roof.
ROOF_WIDTH = 0.85

# 己 closed at the top is 巳. KanjiVG draws both alike, so it goes by the
# element around it.
CLOSED_SELF_IN = {"包", "巷", "巽", "遷"}  # 包 抱 砲; 港; 選; 遷

# KanjiVG elements that aren't tiles but split into tiles cleanly, by
# their strokes in order: (glyph, how many strokes). Without these they
# fall apart into single strokes or the wrong tiles.
COMPONENT_SPLITS = {
    "重": [("𠂉", 2), ("里", 7)],             # 重 動 種 働 腫 薫 衝: 𠂉 over 里, as in 毎
    "午": [("𠂉", 2), ("十", 2)],             # 午 許: not 𠂉 over a 干 that shares its line
    "开": [("一", 1), ("廾", 3)],             # 開 研 形 刑 型: not 干 + 干
    "単": [("⺍", 3), ("日", 4), ("十", 2)],   # 戦 弾 禅, as 単 itself
    "劵": [("𠔉", 6), ("力", 2)],             # 勝 騰 謄: 𠔉 as in 券 巻
    "百": [("一", 1), ("白", 5)],             # 宿 縮 優 憂
    "𡗗": [("三", 3), ("人", 2)],             # 春 奏 奉 泰 俸 棒: 三 and 人
    "戋": [("二", 2), ("戈", 4)],             # 残 浅 銭 践 桟
    "丰": [("三", 3), ("丨", 1)],             # 邦 峰 縫 蜂 拝
    "彦": [("立", 5), ("厂", 1), ("彡", 3)],  # 顔 彦: 立 over 厂, as in 産
    "菐": [("业", 5), ("丷", 2), ("一", 1), ("夫", 4)],  # 僕 撲
    "奉": [("三", 3), ("人", 2), ("干", 3)],  # 奉 俸 棒: 三 and 人 over 干
    "卸": [("𠂉", 2), ("一", 1), ("止", 4), ("卩", 2)],  # 卸 御: 午 over 止, sharing its vertical
    "官": [("宀", 3), ("口", 3), ("口", 2)],  # 官 館 管 棺: two boxes under 宀, sharing a side
    "象": [("𠂊", 2), ("口", 3), ("豕", 7)],  # 象 像: the box's bottom line is 豕's first stroke
}

# KanjiVG element names drawn the same as another glyph. Players see shapes,
# so look-alikes are one part: ⻖ (from 阜) and ⻏ (from 邑) are both 阝.
# (月 from 肉, 王 from 玉 and the like need nothing: KanjiVG already names
# them by their shape.)
LOOKALIKES = {
    "⻌": "辶", "⻍": "辶", "辵": "辶",
    "⻖": "阝", "⻏": "阝",
    "⺨": "犭", "⺤": "爫", "⻞": "飠", "⺦": "丬",
    "⺕": "ヨ", "彐": "ヨ",
    "龹": "𠔉",
    "𠂇": "ナ", "丆": "ナ",
    "襾": "西",
    "戶": "戸", "靑": "青", "黃": "黄", "黑": "黒", "齒": "歯", "龍": "竜", "龜": "亀", "麥": "麦",
}

# A stroke outside every tile becomes a single-stroke part, by its KanjiVG
# stroke type: ㇐ horizontal, ㇑ vertical, ㇒ falling left, ㇔ ㇏ ㇀ dots and
# short strokes, ㇚ ㇁ hooks; every bent stroke (㇕ ㇆ ㇇ ㇜ ...) is 乙.
STROKE_PARTS = {
    "㇐": "一", "㇑": "丨", "㇒": "丿", "㇓": "丿",
    "㇔": "丶", "㇏": "丶", "㇀": "丶", "㇚": "亅", "㇁": "亅",
    "other": "乙",
}

# Loose strokes that draw a tile, by stroke type. A group KanjiVG names (壬,
# 夭) is that element, even when its strokes run the same way. ㇒ + ㇐ is ナ only when
# the ㇒ crosses the ㇐ (左, 佐); one that stops at it is 𠂉 (午, 海, 乾).
# (Learning these from every place KanjiVG names a tile was tried and gave
# wrong matches: 旦 runs like 目, 夭 like 攵, 由 like 田.)
STROKE_PATTERNS = {
    ("㇒", "㇐"): "ナ",
    ("㇐", "㇒"): "ナ",
    ("㇒", "㇐", "㇑", "㇐"): "⺧",                 # 先, 洗
    ("㇐", "㇑", "㇑", "㇐"): "廿",                 # 散
    ("㇒", "㇑", "㇕", "㇐", "㇕", "㇐"): "𠂤",     # 師, 帥
    ("㇔", "㇒"): "丷",                             # 南, 喜, 帝, 益, 逆: two strokes meeting below
    ("㇇", "㇔"): "マ",                             # 野's 予, as 予 itself
    ("㇔", "㇒", "㇐", "㇐", "㇒", "㇏"): "𠔉",     # 拳, as 券 and 巻
}
CROSSING = 0.6  # share of the ㇒'s height that must reach below the ㇐ for ナ

# Decided: a one-kanji answer that is a tile itself (金, 車, 雨) has one part
# and gives no clues, so it leaves the one-kanji answers. It stays guessable
# and stays in longer words.
KEEP_ATOMIC_ANSWERS = False

# Positions: the fixed set the game scores with.
POSITIONS = ["left", "right", "top", "bottom", "outer", "inner", "whole", "none"]
SIDE_THRESHOLD = 0.25  # how far apart (in sizes) two groups' centres must be to sit side by side
INSIDE_TOLERANCE = 6   # how far (of KanjiVG's 109 units) a group may poke out of an enclosure...
INSIDE_SHARE = 0.75    # ...and the share of its outline that must lie inside

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

# Google Fonts' stylesheet for the fonts the app loads, only to see which
# palette glyphs Noto Sans JP and Noto Serif JP cover. Google sends the
# per-range stylesheet only to browsers, hence a browser's User-Agent. It has
# no version: delete the file to fetch the current one.
NOTO_CSS_URL = (
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400"
    "&family=Noto+Serif+JP:wght@700&display=swap"
)
NOTO_CSS_FILE = "google-fonts-noto-jp.css"
BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------

PROJECT_DIR = Path(__file__).resolve().parent.parent
SOURCES_DIR = PROJECT_DIR / "tools" / "sources"
OUTPUT_FILE = PROJECT_DIR / "data" / "candidates.json"
PARTS_FILE = PROJECT_DIR / "data" / "parts.json"
OVERRIDES_FILE = PROJECT_DIR / "data" / "parts-overrides.json"  # hand-edited
REVIEW_FILE = PROJECT_DIR / "data" / "review.json"              # the review page's; only read

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
# The KanjiVG positions of a part that wraps around the rest.
ENCLOSURE_POSITIONS = {"kamae", "kamae1", "kamae2", "tare", "nyo", "⿵A", "⿶1"}


def normalize_position(raw: str | None) -> str:
    if raw is None:
        return "none"
    if raw not in POSITION_NAMES:
        raise SystemExit(f"Unknown KanjiVG position {raw!r}: add it to POSITION_NAMES")
    return POSITION_NAMES[raw]

ITERATION_MARK = "々"

SVG_NS = "http://www.w3.org/2000/svg"
KVG_NS = "http://kanjivg.tagaini.net"


def log(message: str) -> None:
    print(message, flush=True)


# --------------------------------------------------------------------------
# Downloading
# --------------------------------------------------------------------------

def download(url: str, file_name: str, user_agent: str = "kanjiru-build-data/1.0") -> Path:
    """Save url as tools/sources/<file_name>, unless that file already exists."""
    path = SOURCES_DIR / file_name
    if path.exists():
        log(f"  have  {file_name}")
        return path
    SOURCES_DIR.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": user_agent})
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
    paths["noto_css"] = download(NOTO_CSS_URL, NOTO_CSS_FILE, BROWSER_USER_AGENT)
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
# KanjiVG: component trees with stroke geometry
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


PATH_TOKEN = re.compile(r"[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE]-?\d+)?")
CURVE_STEPS = 8


def stroke_points(d: str) -> list[tuple[float, float]]:
    """Points along one KanjiVG stroke, sampling its curves.

    KanjiVG paths only use moveto and cubic curves (M, C, S, absolute or
    relative), so those are all this reads.
    """
    tokens = PATH_TOKEN.findall(d)
    points = []
    x = y = 0.0
    control = None  # the last curve's second control point, mirrored by S
    command = ""
    i = 0

    def take(count: int) -> list[float]:
        nonlocal i
        chunk = tokens[i:i + count]
        if len(chunk) != count or any(token.isalpha() for token in chunk):
            raise SystemExit(f"Unreadable KanjiVG path: {d}")
        i += count
        return [float(token) for token in chunk]

    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
        relative = command.islower()
        kind = command.upper()
        if kind == "M":
            dx, dy = take(2)
            x, y = (x + dx, y + dy) if relative else (dx, dy)
            points.append((x, y))
            control = None
        elif kind in ("C", "S"):
            values = take(6 if kind == "C" else 4)
            pairs = [(values[j], values[j + 1]) for j in range(0, len(values), 2)]
            if relative:
                pairs = [(x + px, y + py) for px, py in pairs]
            if kind == "S":
                first = (2 * x - control[0], 2 * y - control[1]) if control else (x, y)
                pairs.insert(0, first)
            (x1, y1), (x2, y2), (x3, y3) = pairs
            for step in range(1, CURVE_STEPS + 1):
                t = step / CURVE_STEPS
                u = 1 - t
                points.append((
                    u ** 3 * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3,
                    u ** 3 * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3,
                ))
            x, y = x3, y3
            control = (x2, y2)
        else:
            raise SystemExit(f"Unexpected path command {command!r} in KanjiVG: {d}")
    return points


def read_group(group: ET.Element, strokes: list[dict]) -> dict:
    """A KanjiVG <g> as a node; its strokes are appended to `strokes`.

    A node's kids are other nodes or stroke numbers (indexes into `strokes`).
    """
    attributes = kvg_attributes(group)
    element = attributes.get("element")
    phon = attributes.get("phon")
    if element is None and phon and len(phon) == 1:
        element = phon  # an unnamed group whose phonetic is one character (衷's 中)
    node = {
        "el": element,
        "raw": attributes.get("position"),
        "part": attributes.get("part"),
        "number": attributes.get("number"),
        "kids": [],
    }
    for child in group:
        if child.tag == f"{{{SVG_NS}}}g":
            node["kids"].append(read_group(child, strokes))
        elif child.tag == f"{{{SVG_NS}}}path":
            stroke_type = kvg_attributes(child).get("type", "")
            d = child.get("d", "")
            node["kids"].append(len(strokes))
            strokes.append({"type": stroke_type, "d": d, "points": stroke_points(d)})
    return node


def stroke_numbers(node: dict) -> list[int]:
    numbers = []
    for kid in node["kids"]:
        if isinstance(kid, int):
            numbers.append(kid)
        else:
            numbers.extend(stroke_numbers(kid))
    return numbers


def read_kanjivg(path: Path, wanted: set[str]) -> tuple[dict, dict]:
    """Return ({kanji: (root node, strokes)}, {glyph: (root, strokes)} for components).

    The second dict holds KanjiVG's drawings of characters that aren't
    wanted kanji (components such as ⺌), for the palette's fallback images.
    """
    trees = {}
    others = {}
    base_file = re.compile(r"^kanji/([0-9a-f]{5})\.svg$")  # not 08a9e-Kaisho.svg etc.
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            match = base_file.match(name)
            if not match:
                continue
            char = chr(int(match.group(1), 16))
            svg = parse_svg(archive.read(name).decode("utf-8"))
            root = svg.find(f".//{{{SVG_NS}}}g[@id='kvg:{match.group(1)}']")
            if root is None:
                continue
            strokes = []
            node = read_group(root, strokes)
            (trees if char in wanted else others)[char] = (node, strokes)
    return trees, others


# --------------------------------------------------------------------------
# Parts: splitting kanji into palette tiles
# --------------------------------------------------------------------------

def palette_tiles() -> tuple[list[str], dict[str, str]]:
    """Return (tile ids in palette order, {glyph: tile id}) from the settings."""
    tiles = PALETTE.split()
    if len(set(tiles)) != len(tiles):
        doubled = sorted({t for t in tiles if tiles.count(t) > 1})
        raise SystemExit(f"Listed twice in PALETTE: {''.join(doubled)}")
    form_to_tile = {tile: tile for tile in tiles}
    for tile, forms in VARIANT_FORMS.items():
        if tile not in form_to_tile:
            raise SystemExit(f"VARIANT_FORMS: {tile} is not in PALETTE")
        for form in forms:
            if form in form_to_tile:
                raise SystemExit(f"VARIANT_FORMS: {form} is already a tile or form")
            form_to_tile[form] = tile
    for single in STROKE_PARTS.values():
        if single not in form_to_tile:
            raise SystemExit(f"STROKE_PARTS: {single} is not in PALETTE")
    for named, shapes in DRAWN_AS.items():
        for shown in [named, *shapes.values()]:
            if shown not in form_to_tile:
                raise SystemExit(f"DRAWN_AS: {shown} is not a palette tile or form")
    for element, recipe in COMPONENT_SPLITS.items():
        for glyph, _count in recipe:
            if glyph not in form_to_tile:
                raise SystemExit(f"COMPONENT_SPLITS: {element} uses {glyph}, not a palette tile or form")
    return tiles, form_to_tile


def glyph_of(element: str | None) -> str | None:
    """The glyph players see for a KanjiVG element name."""
    return LOOKALIKES.get(element, element) if element else None


def stroke_part(stroke_type: str) -> str:
    """The single-stroke part for a KanjiVG stroke type such as ㇐ or ㇕b."""
    return STROKE_PARTS.get(stroke_type[:1], STROKE_PARTS["other"])


def shape_of(numbers, strokes: list[dict]) -> tuple:
    """A run of strokes by type (first character only: ㇑a and ㇑ are alike)."""
    return tuple(strokes[n]["type"][:1] for n in numbers)


def pattern_tile(numbers: list[int], strokes: list[dict]) -> str | None:
    """The tile these strokes draw by STROKE_PATTERNS, or None."""
    tile = STROKE_PATTERNS.get(shape_of(numbers, strokes))
    if tile == "ナ":
        slant = next(n for n in numbers if strokes[n]["type"][:1] == "㇒")
        flat = next(n for n in numbers if strokes[n]["type"][:1] == "㇐")
        ys = [y for _x, y in strokes[slant]["points"]]
        flat_y = sum(y for _x, y in strokes[flat]["points"]) / len(strokes[flat]["points"])
        if (max(ys) - flat_y) < CROSSING * (max(ys) - min(ys)):
            tile = "𠂉" if strokes[numbers[0]]["type"][:1] == "㇒" else None
    return tile


def drawn_as(glyph: str, numbers, strokes: list[dict]) -> str:
    """The glyph a part KanjiVG names `glyph` is drawn as (DRAWN_AS)."""
    return DRAWN_AS.get(glyph, {}).get("".join(shape_of(numbers, strokes)), glyph)


def is_roof(kid: dict, node: dict, strokes: list[dict]) -> bool:
    """人 on top of the rest of its group, about as wide as what it covers (会 今)."""
    others = [n for other in node["kids"] if other is not kid
              for n in ([other] if isinstance(other, int) else stroke_numbers(other))]
    if not others:
        return False
    mine = points_of(stroke_numbers(kid), strokes)
    rest = points_of(others, strokes)
    # KanjiVG's own position where it gives one (傘's small 人 are left and right).
    if (kid["raw"] or side_of(mine, rest)) != "top":
        return False
    box, under = box_of(mine), box_of(rest)
    return box[2] - box[0] >= ROOF_WIDTH * (under[2] - under[0])


def shown_form(glyph: str, kid: dict, node: dict, strokes: list[dict], ancestors: tuple) -> str:
    """The glyph a named part shows: DRAWN_AS, then the roof 𠆢 and the closed 巳."""
    if kid["part"]:
        return glyph  # a piece of a split element: its strokes aren't the whole shape
    form = drawn_as(glyph, stroke_numbers(kid), strokes)
    if form == "人" and is_roof(kid, node, strokes):
        return "𠆢"
    if form == "己" and CLOSED_SELF_IN & set(ancestors):
        return "巳"
    return form


def component_parts(node: dict, strokes: list[dict], form_to_tile: dict) -> list[dict] | None:
    """A COMPONENT_SPLITS element as its tiles, or None when its strokes don't fit."""
    numbers = sorted(stroke_numbers(node))
    recipe = COMPONENT_SPLITS[node["el"]]
    if len(numbers) != sum(count for _glyph, count in recipe):
        return None
    parts, start = [], 0
    for glyph, count in recipe:
        parts.append({"el": form_to_tile[glyph], "form": glyph,
                      "strokes": set(numbers[start:start + count]), "split": True})
        start += count
    return parts


def cut(node: dict, strokes: list[dict], form_to_tile: dict,
        tile_strokes: dict | None = None, ancestors: tuple = ()) -> list[dict]:
    """Split a node into the highest components that are palette tiles.

    Strokes that draw a tile by STROKE_PATTERNS are that tile, unless they
    are all of a group KanjiVG names. Any other stroke outside every tile becomes a single-stroke part.
    Pieces of a split element (kvg:part, such as 衣 around 里 in 裏) are kept
    apart here and joined by join_pieces. A named part shows the glyph its
    strokes draw (shown_form); an element in COMPONENT_SPLITS splits by its
    recipe; and a group named as a tile but holding more than twice that
    tile's strokes is misnamed (望's top is named 亡 but holds 亡 and 月), so
    it is looked into. `ancestors` are the elements around `node`.
    """
    parts = []
    run = []  # loose strokes in a row

    def end_run() -> None:
        # A named group made only of these strokes is that element (壬 runs like ⺧).
        named_whole = node["el"] is not None and len(run) == len(stroke_numbers(node))
        # From each stroke, the longest run of strokes that draws a tile
        # (喜's ㇔ ㇒ ㇐ is 丷 and a line); else a single-stroke part. ナ and
        # 𠂉 need the run to themselves: a ㇐ ㇒ inside a longer run is part
        # of something else (倉's ㇕ ㇐ ㇐ ㇒).
        i = 0
        while i < len(run):
            for j in range(len(run), i, -1):
                whole_run = j - i == len(run)
                tile = None if named_whole and whole_run else pattern_tile(run[i:j], strokes)
                if tile in ("ナ", "𠂉") and not whole_run:
                    tile = None
                if tile:
                    break
            if tile:
                parts.append({"el": form_to_tile[tile], "form": tile, "strokes": set(run[i:j]), "shape": True})
                i = j
            else:
                single = stroke_part(strokes[run[i]]["type"])
                parts.append({"el": single, "form": single, "strokes": {run[i]}, "single": True})
                i += 1
        run.clear()

    for kid in node["kids"]:
        if isinstance(kid, int):
            run.append(kid)
            continue
        end_run()
        glyph = glyph_of(kid["el"])
        numbers = stroke_numbers(kid)
        misnamed = bool(tile_strokes) and len(numbers) > 2 * tile_strokes.get(glyph, len(numbers))
        recipe = component_parts(kid, strokes, form_to_tile) if kid["el"] in COMPONENT_SPLITS else None
        if recipe:
            parts.extend(recipe)
        elif glyph in form_to_tile and not misnamed:
            form = shown_form(glyph, kid, node, strokes, ancestors)
            parts.append({
                "el": form_to_tile[form],
                "form": form,
                "strokes": set(numbers),
                "piece": (kid["el"], kid["number"]) if kid["part"] else None,
                "node": kid,
            })
        elif kid["el"] is None and pattern_tile(numbers, strokes):
            tile = pattern_tile(numbers, strokes)
            parts.append({"el": form_to_tile[tile], "form": tile,
                          "strokes": set(numbers), "shape": True})
        else:
            parts.extend(cut(kid, strokes, form_to_tile, tile_strokes, ancestors + (kid["el"],)))
    end_run()
    return parts


def join_pieces(parts: list[dict], strokes: list[dict], form_to_tile: dict, tile_strokes: dict) -> list[dict]:
    """Join the pieces of split elements.

    A piece whose partner was absorbed into another tile shares strokes with
    it (業's 羊 shares its last two with 木). It still counts as the element
    if it has more than half of the element's strokes; otherwise it splits
    further (主's 亠 is just its dot, so 主 = 丶 + 王).
    """
    groups = {}
    for part in parts:
        if part.get("piece"):
            groups.setdefault(part["piece"], []).append(part)
    joined = []
    for part in parts:
        key = part.get("piece")
        if key is None:
            joined.append(part)
            continue
        pieces = groups.get(key)
        if pieces is None:
            continue  # already joined into the first piece
        del groups[key]
        if len(pieces) == 1:
            if len(part["strokes"]) * 2 > tile_strokes.get(part["form"], 99):
                joined.append({key: value for key, value in part.items() if key not in ("piece", "node")})
            else:
                joined.extend(cut(part["node"], strokes, form_to_tile, tile_strokes))
        else:
            joined.append({
                "el": part["el"],
                "form": part["form"],
                "strokes": set().union(*(p["strokes"] for p in pieces)),
                "wrap": True,
            })
    return joined


def points_of(numbers, strokes: list[dict]) -> list[tuple[float, float]]:
    return [point for n in numbers for point in strokes[n]["points"]]


def box_of(points: list[tuple[float, float]]) -> tuple[float, float, float, float]:
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def is_inside(points: list, outer: tuple) -> bool:
    """Most of these points lie in the box (衷's 中 pokes out of 衣 at the top)."""
    x0, y0, x1, y1 = (outer[0] - INSIDE_TOLERANCE, outer[1] - INSIDE_TOLERANCE,
                      outer[2] + INSIDE_TOLERANCE, outer[3] + INSIDE_TOLERANCE)
    inside = sum(1 for x, y in points if x0 <= x <= x1 and y0 <= y <= y1)
    return inside >= INSIDE_SHARE * len(points)


def side_of(points: list, others: list) -> str:
    """left / right / top / bottom of `points` against `others`, or none.

    Compares the centres of the two stroke sets, scaled by their sizes. On
    the 1,712 two-part kanji where KanjiVG names both positions, this agrees
    with KanjiVG every time.
    """
    box, other_box = box_of(points), box_of(others)
    cx = sum(p[0] for p in points) / len(points)
    cy = sum(p[1] for p in points) / len(points)
    ox = sum(p[0] for p in others) / len(others)
    oy = sum(p[1] for p in others) / len(others)
    pad = 3  # KanjiVG's stroke width, so a single straight stroke has a size
    dx = (cx - ox) / ((box[2] - box[0] + other_box[2] - other_box[0]) / 2 + pad)
    dy = (cy - oy) / ((box[3] - box[1] + other_box[3] - other_box[1]) / 2 + pad)
    if abs(dx) >= abs(dy) and abs(dx) > SIDE_THRESHOLD:
        return "left" if dx < 0 else "right"
    if abs(dy) > abs(dx) and abs(dy) > SIDE_THRESHOLD:
        return "top" if dy < 0 else "bottom"
    return "none"


def place(root: dict, parts: list[dict], strokes: list[dict]) -> None:
    """Give each part its position in the whole kanji (sets part["pos"]).

    The kanji's first split decides: every part takes the position of the
    top-level group it sits in, so 語's 五 and 口 are both right. Groups
    come from KanjiVG; KanjiVG's position names them where it has one, an
    enclosure's contents are inner, and the rest go by geometry.
    """
    if len(parts) == 1:
        parts[0]["pos"] = "whole"
        return
    level = root
    while True:
        groups = [kid for kid in level["kids"] if isinstance(kid, dict)]
        if len(groups) == 1 and len(level["kids"]) == 1:
            level = groups[0]  # a group that holds everything: look inside it
            continue
        break
    units = []
    for kid in level["kids"]:
        if isinstance(kid, int):
            units.append({"strokes": {kid}, "raw": None, "wrap": False})
        else:
            units.append({"strokes": set(stroke_numbers(kid)), "raw": kid["raw"], "wrap": False})
    # A split element that wraps around other groups (衣 in 裏, 木 in 東)
    # becomes a group of its own.
    for part in parts:
        if not part.get("wrap"):
            continue
        spanned = [unit for unit in units if unit["strokes"] & part["strokes"]]
        if len(spanned) > 1:
            for unit in spanned:
                unit["strokes"] -= part["strokes"]
            units.append({"strokes": set(part["strokes"]), "raw": None, "wrap": True})
    units = [unit for unit in units if unit["strokes"]]
    if len(units) < 2:
        # Everything sits in one group: compare the parts themselves.
        units = [{"strokes": set(p["strokes"]), "raw": None, "wrap": bool(p.get("wrap"))} for p in parts]
    for unit in units:
        unit["points"] = points_of(unit["strokes"], strokes)
        unit["box"] = box_of(unit["points"])
    # KanjiVG's enclosures, and split elements with something inside them
    # (由's 日 is split only by the stroke crossing it, so it isn't one).
    enclosures = [
        u for u in units
        if u["raw"] in ENCLOSURE_POSITIONS
        or u["wrap"] and any(is_inside(o["points"], u["box"]) for o in units if o is not u)
    ]
    for unit in units:
        if unit in enclosures:
            unit["pos"] = "outer"
        elif any(is_inside(unit["points"], e["box"]) for e in enclosures):
            unit["pos"] = "inner"
        elif normalize_position(unit["raw"]) != "none":
            unit["pos"] = normalize_position(unit["raw"])
        else:
            unit["pos"] = None
    for unit in units:
        if unit["pos"] is None:
            others = [p for u in units if u is not unit for p in u["points"]]
            unit["pos"] = side_of(unit["points"], others) if others else "whole"
    for part in parts:
        first = min(part["strokes"])
        part["pos"] = next(u["pos"] for u in units if first in u["strokes"])


def split_kanji(kanji: str, root: dict, strokes: list[dict], form_to_tile: dict, tile_strokes: dict) -> list[dict]:
    """The parts of one kanji, in stroke order, each with el, form and pos."""
    glyph = glyph_of(kanji)
    if glyph in form_to_tile:
        # The kanji is a tile itself, so it is one part: 金 is 金 wherever it
        # appears, and as an answer it has nothing to split.
        parts = [{"el": form_to_tile[glyph], "form": glyph, "strokes": set(range(len(strokes)))}]
    elif root["el"] in COMPONENT_SPLITS and component_parts(root, strokes, form_to_tile):
        parts = component_parts(root, strokes, form_to_tile)  # 重 itself
    else:
        parts = join_pieces(cut(root, strokes, form_to_tile, tile_strokes, (root["el"],)),
                            strokes, form_to_tile, tile_strokes)
        if not parts:
            raise SystemExit(f"KanjiVG has no strokes for {kanji}")
    parts.sort(key=lambda part: min(part["strokes"]))
    place(root, parts, strokes)
    return parts


def read_overrides(path: Path, form_to_tile: dict) -> dict:
    """Return {kanji: [(tile, form, pos, strokes)]} from data/parts-overrides.json.

    A part is [glyph, position], or [glyph, position, [stroke numbers]] to
    say which of KanjiVG's strokes (counting from 1) draw it. The numbers
    are needed only for a glyph that has no drawing elsewhere and is missing
    from the fonts (卌 in 無).
    """
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    overrides = {}
    for kanji, entry in data.get("kanji", {}).items():
        rows = []
        for form, pos, *numbers in entry["parts"]:
            if form not in form_to_tile:
                raise SystemExit(f"{path.name}: {kanji} uses {form}, which is not a palette tile or form")
            if pos not in POSITIONS:
                raise SystemExit(f"{path.name}: {kanji} has position {pos!r}; use one of {', '.join(POSITIONS)}")
            rows.append((form_to_tile[form], form, pos, {n - 1 for n in numbers[0]} if numbers else None))
        if len(rows) == 1 and rows[0][2] != "whole" or len(rows) > 1 and any(r[2] == "whole" for r in rows):
            raise SystemExit(f"{path.name}: {kanji}: 'whole' is for a kanji with exactly one part")
        overrides[kanji] = rows
    return overrides


def is_jis(glyph: str) -> bool:
    """In JIS X 0213, so on every Japanese system font (Hiragino on Apple
    devices, Noto Sans CJK on Android, Yu Gothic and Meiryo on Windows)."""
    try:
        glyph.encode("shift_jis_2004")
        return True
    except UnicodeEncodeError:
        return False


def read_font_ranges(path: Path) -> dict[str, set[int]]:
    """{font family: code points} from a Google Fonts stylesheet's unicode-range lines."""
    families = {}
    for block in re.findall(r"@font-face\s*{([^}]*)}", path.read_text(encoding="utf-8")):
        family = re.search(r"font-family:\s*'([^']+)'", block)
        ranges = re.search(r"unicode-range:\s*([^;]+);", block)
        if not family or not ranges:
            continue
        covered = families.setdefault(family.group(1), set())
        for item in ranges.group(1).split(","):
            item = item.strip().upper().removeprefix("U+")
            if "-" in item:
                start, end = item.split("-")
                covered.update(range(int(start, 16), int(end, 16) + 1))
            elif item:
                covered.add(int(item, 16))
    if len(families) < 2:
        raise SystemExit(f"{path.name} has no per-range font list; delete it and rerun")
    return families


def fallback_drawing(glyph: str, occurrences: list, others: dict) -> dict:
    """KanjiVG strokes for a glyph, for screens whose fonts lack it.

    Uses KanjiVG's own file for the glyph when there is one, else the
    largest place it appears inside a kanji, cropped to its strokes.
    """
    if glyph in others:
        _root, strokes = others[glyph]
        return {"viewBox": "0 0 109 109", "paths": [s["d"] for s in strokes]}
    best = None
    for numbers, strokes in occurrences:
        x0, y0, x1, y1 = box_of(points_of(numbers, strokes))
        size = max(x1 - x0, y1 - y0)
        if best is None or size > best[0]:
            best = (size, numbers, strokes, (x0, y0, x1, y1))
    if best is None:
        raise SystemExit(f"No KanjiVG drawing for {glyph}")
    size, numbers, strokes, (x0, y0, x1, y1) = best
    # A square box around the strokes, with room for the stroke width.
    side = size + 8
    left = (x0 + x1) / 2 - side / 2
    top = (y0 + y1) / 2 - side / 2
    return {
        "viewBox": f"{left:.1f} {top:.1f} {side:.1f} {side:.1f}",
        "paths": [strokes[n]["d"] for n in sorted(numbers)],
    }


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


def build_parts(trees: dict, others: dict, wanted: set, kanjidic: dict, fonts: dict) -> tuple[dict, list, dict]:
    """Split every kanji into palette tiles.

    Returns ({kanji: parts}, palette for data/parts.json, numbers for the report).
    """
    tiles, form_to_tile = palette_tiles()
    overrides = read_overrides(OVERRIDES_FILE, form_to_tile)
    unknown = sorted(set(overrides) - wanted)
    if unknown:
        raise SystemExit(f"{OVERRIDES_FILE.name} lists kanji the data doesn't have: {''.join(unknown)}")

    # A glyph's usual stroke count, for join_pieces: KANJIDIC's, else KanjiVG's drawing.
    tile_strokes = {}
    for glyph in form_to_tile:
        if glyph in kanjidic and kanjidic[glyph]["strokes"]:
            tile_strokes[glyph] = kanjidic[glyph]["strokes"]
        elif glyph in others:
            tile_strokes[glyph] = len(others[glyph][1])

    shaped = []  # (kanji, glyph) found by STROKE_PATTERNS
    breakdowns = {}
    occurrences = {}  # glyph -> [(stroke numbers, strokes)], every complete appearance
    for k in sorted(wanted):
        root, strokes = trees[k]
        parts = split_kanji(k, root, strokes, form_to_tile, tile_strokes)
        shaped.extend((k, p["form"]) for p in parts if p.get("shape"))
        for part in parts:
            occurrences.setdefault(part["form"], []).append((part["strokes"], strokes))
        if k in overrides:
            parts = [{"el": tile, "form": form, "pos": pos} for tile, form, pos, _n in overrides[k]]
            for _tile, form, _pos, numbers in overrides[k]:
                if numbers is not None:
                    if max(numbers) >= len(strokes):
                        raise SystemExit(f"{OVERRIDES_FILE.name}: {k} has only {len(strokes)} strokes")
                    occurrences.setdefault(form, []).append((numbers, strokes))
        breakdowns[k] = parts

    def strokes_of(glyph: str) -> int:
        counts = {}
        for numbers, _strokes in occurrences.get(glyph, []):
            counts[len(numbers)] = counts.get(len(numbers), 0) + 1
        if counts:
            return max(counts, key=lambda n: (counts[n], -n))
        if glyph in kanjidic and kanjidic[glyph]["strokes"]:
            return kanjidic[glyph]["strokes"]
        if glyph in others:
            return len(others[glyph][1])
        raise SystemExit(f"No stroke count for palette glyph {glyph}")

    sans = fonts.get("Noto Sans JP", set())
    serif = fonts.get("Noto Serif JP", set())
    tile_uses = {tile: 0 for tile in tiles}
    form_uses = {}
    for parts in breakdowns.values():
        for tile in {p["el"] for p in parts}:
            tile_uses[tile] += 1
        for form in {p["form"] for p in parts}:
            form_uses[form] = form_uses.get(form, 0) + 1

    palette = []
    drawn, not_in_noto = [], []
    for tile in tiles:
        forms = []
        for glyph in [tile] + list(VARIANT_FORMS.get(tile, "")):
            form = {"glyph": glyph, "strokes": strokes_of(glyph), "uses": form_uses.get(glyph, 0)}
            in_noto = ord(glyph) in sans and ord(glyph) in serif
            if not is_jis(glyph):
                form["jis"] = False
            if not in_noto:
                form["font"] = False
                not_in_noto.append(glyph)
            if not is_jis(glyph) or not in_noto:
                form["svg"] = fallback_drawing(glyph, occurrences.get(glyph, []), others)
                drawn.append(glyph)
            forms.append(form)
        palette.append({"id": tile, "strokes": forms[0]["strokes"], "uses": tile_uses[tile], "forms": forms})
    palette.sort(key=lambda entry: (entry["strokes"], -entry["uses"], entry["id"]))

    report = {
        "shaped": shaped,
        "overrides": overrides,
        "unused_tiles": [tile for tile in tiles if tile_uses[tile] == 0],
        "unused_forms": [f["glyph"] for e in palette for f in e["forms"] if f["uses"] == 0 and f["glyph"] != e["id"]],
        "drawn": drawn,
        "not_in_noto": not_in_noto,
        "form_to_tile": form_to_tile,
    }
    return breakdowns, palette, report


def word_order(word: dict) -> tuple:
    jlpt = word["jlpt"]
    return (word["length"], 0 if jlpt else 1, -(jlpt or 0), word["word"])


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def report_parts(kanji: dict, palette: list, report: dict, atomic_answers: list) -> None:
    joyo = {k: v for k, v in kanji.items() if v["grade"]}
    answers = {k for k, v in joyo.items() if v["jlpt"] in ALLOWED_LEVELS}
    singles = set(STROKE_PARTS.values())
    log(f"Palette: {len(palette)} tiles, {sum(len(e['forms']) for e in palette)} glyphs. By strokes: "
        + " ".join(f"{n}:{sum(1 for e in palette if e['strokes'] == n)}"
                   for n in sorted({e['strokes'] for e in palette})))
    if report["unused_tiles"]:
        log(f"  WARNING tiles no kanji uses: {''.join(report['unused_tiles'])}")
    if report["unused_forms"]:
        log(f"  forms no kanji uses: {''.join(report['unused_forms'])}")
    log(f"  drawn from KanjiVG (not JIS or not in Noto JP): {''.join(report['drawn'])}")
    log(f"  not in Noto Sans/Serif JP at all: {''.join(report['not_in_noto']) or 'none'}")
    counts = {}
    for v in joyo.values():
        counts[len(v["parts"])] = counts.get(len(v["parts"]), 0) + 1
    log("Parts per joyo kanji: " + ", ".join(f"{n}: {c}" for n, c in sorted(counts.items()))
        + f" (average {sum(len(v['parts']) for v in joyo.values()) / len(joyo):.2f})")
    positions = {}
    for v in joyo.values():
        for p in v["parts"]:
            positions[p["pos"]] = positions.get(p["pos"], 0) + 1
    log("Positions: " + ", ".join(f"{pos} {positions.get(pos, 0)}" for pos in POSITIONS))
    with_singles = sorted(k for k, v in joyo.items() if any(p["el"] in singles for p in v["parts"]))
    log(f"Kanji with single-stroke parts: {len(with_singles)} "
        f"({sum(1 for k in with_singles if k in answers)} of them answers)")
    log(f"Atomic (a tile themselves): {sum(1 for v in joyo.values() if v['atomic'])} joyo kanji; "
        f"{len(atomic_answers)} one-kanji answers "
        + ("kept" if KEEP_ATOMIC_ANSWERS else "left out") + f": {''.join(atomic_answers)}")
    twins = {}
    for k, v in joyo.items():
        key = tuple(sorted((p["el"], p["pos"]) for p in v["parts"]))
        twins.setdefault(key, []).append(k)
    groups = [g for g in twins.values() if len(g) > 1]
    log(f"Look-alike breakdowns (same parts, same places): {len(groups)} groups, "
        f"{sum(len(g) for g in groups)} kanji, e.g. " + " ".join("/".join(g) for g in groups[:12]))
    by_glyph = {}
    for k, glyph in report["shaped"]:
        by_glyph.setdefault(glyph, []).append(k)
    log(f"Found by STROKE_PATTERNS: {len(report['shaped'])} parts in "
        f"{len({k for k, _ in report['shaped']})} kanji: "
        + " ".join(f"{g}({''.join(ks[:6])}{'…' if len(ks) > 6 else ''})" for g, ks in sorted(by_glyph.items(), key=lambda i: -len(i[1]))))
    log(f"Hand overrides applied: {len(report['overrides'])}")
    if REVIEW_FILE.exists():
        flagged = sorted(k for k, flag in json.loads(REVIEW_FILE.read_text(encoding="utf-8"))
                         .get("parts", {}).items() if flag == "flag")
        log(f"Kanji flagged on the review page: {len(flagged)}")
        for k in flagged:
            parts = kanji.get(k, {}).get("parts", [])
            log(f"  {k}: " + " ".join(f"{p.get('form', p['el'])}:{p['pos']}" for p in parts))


def kanji_entries(wanted: set, info: dict, levels: dict, breakdowns: dict, parts_report: dict) -> dict:
    """{kanji: entry} for candidates.json. `info` has each kanji's strokes,
    grade, freq, meanings, on and kun; `levels` its Waller JLPT level."""
    form_to_tile = parts_report["form_to_tile"]
    kanji = {}
    for k in sorted(wanted):
        entry = info[k]
        kanji[k] = {
            "strokes": entry["strokes"],
            "grade": entry["grade"],
            "jlpt": levels.get(k),
            "freq": entry["freq"],
            "meanings": entry["meanings"],
            "on": entry["on"],
            "kun": entry["kun"],
            "parts": [
                {"el": p["el"], "pos": p["pos"], **({"form": p["form"]} if p["form"] != p["el"] else {})}
                for p in breakdowns[k]
            ],
            "atomic": glyph_of(k) in form_to_tile,
            "override": k in parts_report["overrides"],
        }
    return kanji


def single_kanji_words(levels: dict) -> list[dict]:
    """The one-kanji candidates: every kanji on Waller's N5..N3 lists."""
    return [
        {"word": k, "length": 1, "jlpt": level, "source": "kanji"}
        for k, level in levels.items() if level in ALLOWED_LEVELS
    ]


def drop_atomic(words: list[dict], kanji: dict) -> tuple[list[dict], list[str]]:
    """Decided: a one-kanji answer that is a tile itself leaves the answers.
    Returns (words, the atomic one-kanji answers)."""
    atomic_answers = [w["word"] for w in words if w["length"] == 1 and kanji[w["word"]]["atomic"]]
    if not KEEP_ATOMIC_ANSWERS:
        words = [w for w in words if not (w["length"] == 1 and kanji[w["word"]]["atomic"])]
    return words, atomic_answers


def write_outputs(sources: dict, kanji: dict, words: list, palette: list) -> None:
    """Write data/candidates.json and data/parts.json."""
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
    parts_output = {
        "meta": {
            "generated": datetime.date.today().isoformat(),
            "about": "The parts palette: one tile per part players can tap. A tile's forms "
                     "are the glyphs it covers (氵 counts as 水). strokes and uses (joyo kanji "
                     "containing it) come from the part breakdowns in candidates.json.",
            "fonts": "font: false = not in Noto Sans JP or Noto Serif JP; jis: false = not in "
                     "JIS X 0213, so a phone's own fonts may lack it. Either way, svg holds "
                     "KanjiVG's strokes to draw instead (stroke them, no fill).",
            "positions": POSITIONS,
            "source": f"KanjiVG {KANJIVG_RELEASE} and data/parts-overrides.json",
            "licence": "CC BY-SA 4.0, adapted from KanjiVG (CC BY-SA 3.0, Ulrich Apel)",
        },
        "tiles": palette,
    }
    PARTS_FILE.write_text(
        json.dumps(parts_output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )


def main_parts_only() -> None:
    """Recompute every kanji's parts and data/parts.json, and nothing else.

    Kanji info and words come from the data/candidates.json already there,
    so only KanjiVG and the Noto stylesheet are needed (both on hosts that
    are rarely blocked). Use it after changing PALETTE, VARIANT_FORMS,
    POSITIONAL_FORMS, the splitting rules or data/parts-overrides.json.
    """
    started = time.perf_counter()
    if not OUTPUT_FILE.exists():
        raise SystemExit(f"--parts-only needs {OUTPUT_FILE.relative_to(PROJECT_DIR)}: run a full build first")
    previous = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
    log("Sources (parts only):")
    paths = {
        "kanjivg": download(KANJIVG_URL, KANJIVG_FILE),
        "noto_css": download(NOTO_CSS_URL, NOTO_CSS_FILE, BROWSER_USER_AGENT),
    }
    info = previous["kanji"]
    levels = {k: v["jlpt"] for k, v in info.items() if v.get("jlpt")}
    wanted = set(info)
    # Single kanji are listed again from their levels, so one that stops (or
    # starts) being a tile leaves (or rejoins) the answers as in a full build.
    multi_words = [w for w in previous["words"] if w["length"] > 1]
    words = sorted(single_kanji_words(levels) + multi_words, key=word_order)

    log("Reading KanjiVG...")
    trees, others = read_kanjivg(paths["kanjivg"], wanted)
    missing_from_kanjivg = sorted(wanted - set(trees))
    if missing_from_kanjivg:
        raise SystemExit(f"Kanji not in KanjiVG: {''.join(missing_from_kanjivg)}")

    log("Splitting kanji into parts...")
    fonts = read_font_ranges(paths["noto_css"])
    # Stroke counts for tile glyphs: KANJIDIC's for the joyo kanji (kept in
    # candidates.json), KanjiVG's drawings for the rest (隹, 亻).
    stroke_info = {k: {"strokes": v["strokes"]} for k, v in info.items()}
    breakdowns, palette, parts_report = build_parts(trees, others, wanted, stroke_info, fonts)
    kanji = kanji_entries(wanted, info, levels, breakdowns, parts_report)
    words, atomic_answers = drop_atomic(words, kanji)
    write_outputs(previous["meta"]["sources"], kanji, words, palette)

    log("")
    report_parts(kanji, palette, parts_report, atomic_answers)
    changed = sorted(k for k in wanted if kanji[k]["parts"] != info[k]["parts"])
    log(f"Kanji whose parts changed: {len(changed)}")
    log(f"Candidates: {len(words)} (was {len(previous['words'])})")
    log(f"Wrote {OUTPUT_FILE.relative_to(PROJECT_DIR)} ({OUTPUT_FILE.stat().st_size:,} bytes) "
        f"and {PARTS_FILE.relative_to(PROJECT_DIR)} ({PARTS_FILE.stat().st_size:,} bytes) "
        f"in {time.perf_counter() - started:.1f} s")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--parts-only", action="store_true",
        help="recompute parts and data/parts.json only, reading kanji info and words "
             "from the existing data/candidates.json (needs only KanjiVG and the Noto CSS)")
    args = parser.parse_args(argv)
    if args.parts_only:
        main_parts_only()
    else:
        main_full()


def main_full() -> None:
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

    words = sorted(single_kanji_words(kanji_levels) + multi_words, key=word_order)

    # Every joyo kanji, plus any other kanji a candidate uses.
    used = {c for w in words for c in w["word"]}
    wanted = joyo | used
    missing_from_kanjidic = sorted(wanted - set(kanjidic))
    if missing_from_kanjidic:
        raise SystemExit(f"Kanji not in KANJIDIC2: {''.join(missing_from_kanjidic)}")

    log("Reading KanjiVG...")
    trees, others = read_kanjivg(paths["kanjivg"], wanted)
    missing_from_kanjivg = sorted(wanted - set(trees))
    if missing_from_kanjivg:
        raise SystemExit(f"Kanji not in KanjiVG: {''.join(missing_from_kanjivg)}")

    log("Splitting kanji into parts...")
    fonts = read_font_ranges(paths["noto_css"])
    breakdowns, palette, parts_report = build_parts(trees, others, wanted, kanjidic, fonts)
    kanji = kanji_entries(wanted, kanjidic, kanji_levels, breakdowns, parts_report)
    words, atomic_answers = drop_atomic(words, kanji)

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

    write_outputs(sources, kanji, words, palette)

    # ---- Report ----
    log("")
    log(f"Joyo kanji: {len(joyo)} ({sum(1 for k in joyo if k in trees)} with parts, "
        f"{len(joyo - set(trees))} missing from KanjiVG: {''.join(sorted(joyo - set(trees)))})")
    log(f"Other kanji used by words: {''.join(sorted(used - joyo)) or 'none'}")
    log("Waller kanji per level: " + ", ".join(f"N{lv} {n}" for lv, n in sorted(level_counts.items(), reverse=True)))
    if level_duplicates:
        log(f"  listed at two levels (kept the easier): {level_duplicates}")
    report_parts(kanji, palette, parts_report, atomic_answers)
    log("Candidates (on Waller's list / common only):")
    for length in range(1, MAX_LENGTH + 1):
        group = [w for w in words if w["length"] == length]
        listed = sum(1 for w in group if w["jlpt"])
        log(f"  length {length}: {len(group)} ({listed} / {len(group) - listed})")
    log(f"Spellings dropped for {ITERATION_MARK}: {word_counts['dropped_iteration']}")
    log(f"Search-only spellings skipped: {word_counts['skipped_tagged']}")
    log(f"Spellings shared by several entries (deduped): {word_counts['duplicate_spellings']}")
    log(f"Rare spellings dropped (not common, not on Waller's list): {word_counts['dropped_not_common']}")
    log(f"Wrote {OUTPUT_FILE.relative_to(PROJECT_DIR)} ({OUTPUT_FILE.stat().st_size:,} bytes) "
        f"and {PARTS_FILE.relative_to(PROJECT_DIR)} ({PARTS_FILE.stat().st_size:,} bytes) "
        f"in {time.perf_counter() - started:.1f} s")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
