# tools

## build_data.py

Builds `data/candidates.json` (the Kanjiru answers, with each kanji's info and parts) and `data/parts.json` (the parts palette).

1. Downloads the sources into `tools/sources/`: KANJIDIC2, KanjiVG, JMdict (common words), Jonathan Waller's JLPT vocab and kanji lists, and the Google Fonts CSS for Noto Sans JP and Noto Serif JP (to see which glyphs those fonts have). A file that is already there is reused. Credits and versions are in `data/ATTRIBUTION.md`.
2. Splits every jōyō kanji into palette tiles (see "Parts" below), using `data/parts-overrides.json` where a hand fix exists.
3. Writes `data/candidates.json`:
   - `kanji`: every jōyō kanji with strokes, grade, JLPT level, frequency, meanings, readings, `parts`, `atomic` (it is a tile itself) and `override` (its parts come from the overrides file).
   - `parts`: a list of `{el, pos}` in stroke order. `el` is the tile, `pos` is where it sits in the whole kanji, and `form` is added when the glyph shown differs from the tile (氵 for 水).
   - `words`: every N5 to N3 kanji that isn't a tile itself, plus the common JMdict words of 2 to 4 kanji that use only N5 to N3 kanji.
4. Writes `data/parts.json`: `tiles`, each with `id`, `strokes`, `uses` (jōyō kanji containing it) and `forms`. Each form has a `glyph`, its own `strokes` and `uses`, and, if the fonts may lack it, `font: false` (not in Noto Sans/Serif JP) or `jis: false` (not in JIS X 0213), plus `svg`: KanjiVG's strokes to draw instead (`viewBox` and `paths`; stroke them, no fill).
5. Prints a summary: the palette, parts per kanji, positions, single strokes, atomic answers, look-alike kanji, hand overrides, the kanji flagged on the review page (from `data/review.json`, read only), counts per length, and run time.

Python 3.10 or later, standard library only. Run it from the project folder (`-X utf8` lets Windows print the kanji in the summary):

```
python -I -X utf8 tools/build_data.py
```

The first run downloads about 17 MB and takes about 15 seconds. Later runs use the saved files and take about 5 seconds.

### Changing what it builds

The settings are constants at the top of the script:

- `MAX_LENGTH = 4`: the longest word, in kanji.
- `MAX_JLPT_LEVEL = 3`: the hardest JLPT level allowed. 3 means N5, N4 and N3; 2 adds N2.
- `MAX_GLOSSES = 3`: English glosses kept per word.
- `REQUIRE_COMMON = True`: keep only spellings JMdict marks common, or that Waller lists. This drops about 430 rare alternate spellings, such as 学文 for 学問.
- `PALETTE`: the tiles players tap. Adding or removing one changes every breakdown that uses it.
- `VARIANT_FORMS`: other glyphs a tile covers (氵 and 氺 for 水). They score as the tile.
- `LOOKALIKES`: KanjiVG element names drawn the same as a palette glyph (⻌ is 辶, 彐 is ヨ).
- `STROKE_PARTS`: the single-stroke tile for each KanjiVG stroke type.
- `STROKE_PATTERNS`: loose strokes that draw a tile (㇒ + ㇐ crossing is ナ).
- `KEEP_ATOMIC_ANSWERS = False`: a one-kanji answer that is a tile itself (金) leaves the answers. True keeps it.
- `SIDE_THRESHOLD`, `INSIDE_TOLERANCE`, `INSIDE_SHARE`: the geometry tests for positions.

### Parts

The rules, in order:

1. **A kanji that is a tile** (金, 車, 雨) is one part, `whole`.
2. **Cut at the highest tile:** walk KanjiVG's component tree and stop at the first group whose glyph is a tile or one of its forms. 語 = 言 + 五 + 口.
3. **Loose strokes:** strokes outside every tile become a tile from `STROKE_PATTERNS` (先's top is ⺧), or else one single-stroke tile each (本 = 木 + 一). A group KanjiVG names keeps its name: 壬's strokes run like ⺧ but stay strokes.
4. **Split elements** (KanjiVG's `kvg:part`, such as 衣 around 里 in 裏) are joined into one part. A piece whose partner went into another tile still counts if it has more than half the tile's strokes (業's 羊); otherwise it splits further (主 = 丶 + 王).
5. **Positions:** the kanji's first split decides, so 語's 五 and 口 are both `right`. An enclosure (KanjiVG's kamae, tare, nyo, or a split element with something inside) is `outer`, and a group with 75% of its outline inside it is `inner`. Otherwise KanjiVG's position is used, and where it has none, the groups' centres are compared (`none` when they overlap, as in 中).
6. **Hand fixes** in `data/parts-overrides.json` replace the result for that kanji.

### Hand fixes: data/parts-overrides.json

For kanji the rules get wrong. Each entry lists the parts in stroke order as `[glyph, position]`, with a `why`:

```json
"万": { "parts": [["一", "top"], ["力", "bottom"]], "why": "..." }
```

- **Glyphs:** palette tiles or their forms. The build stops on anything else.
- **Positions:** left, right, top, bottom, outer, inner, whole or none.
- **Drawings:** a glyph with no KanjiVG drawing elsewhere that the fonts may lack needs its stroke numbers, counting from 1: `["卌", "top", [3, 4, 5, 6, 7]]`.

To find what needs fixing, flag kanji on the parts check page (`review/parts.html`); the next build lists them.

## compile_game.py

Writes the slim files the game loads, into `data/game/` (they deploy; `candidates.json` doesn't):

- `kanji.json`: every jōyō kanji as a row of `fields`: strokes, JLPT level, frequency, up to 3 meanings (KANJIDIC's "radical (no. …)" labels dropped), on and kun readings, and parts as `[tile, position]` or `[tile, position, form]`. About 280 KB, 82 KB gzipped.
- `answers.json`: the daily schedule. `epoch` is the date of puzzle 1, `answers` lists each mode's answers in daily order (one list per `LISTS` entry), and `words` gives each answer of 2+ kanji its `[reading, meanings]`. One entry per line, so schedule changes diff cleanly.

```
python -I -X utf8 tools/compile_game.py
```

- **Answers are Keep words only,** from `data/review.json` (read, never written). With no Keep words every list is empty, and the summary says so. Use `--review PATH` to read another file, such as the main folder's when running from a worktree.
- **Left out:** one-kanji look-alikes (未 末 押 招: same parts in the same places as another kanji), and Keep words that are no longer candidates. The summary lists both.
- **Loose strokes:** a `LISTS` rule with `without` leaves out words with any of those tiles as a part. `main` leaves out the loose single strokes 丨 丶 丿 乙 亅 (`LOOSE_STROKES`; 一 is a real part and stays), since a cell holding one is close to guesswork. The words stay Keep, and come back on the next compile once `data/parts-overrides.json` fixes their kanji. The summary counts them, and lists any already-played day whose answer is now left out (it keeps its slot).
- **Stable order:** answers for days already played, up to tomorrow, never move. Every later day is shuffled again from a fixed seed, so newly kept words mix in evenly. A word cut after its day is listed but stays in its slot.
- **The summary** shows each list's answer count against the 365 a year of dailies needs.

Settings at the top:

- `EPOCH = "2026-11-01"`: the date of puzzle 1. Set it to launch day at launch, then never change it. A new epoch unlocks every day.
- `SHUFFLE_SEED`: changing it reorders every day not yet played.
- `LOCK_AHEAD_DAYS = 1`: days past today that are locked too, for time zones ahead of this computer.
- `ALLOW_LOOKALIKE_ANSWERS = False`: True keeps the look-alikes as answers.
- `MAX_KANJI_MEANINGS = 3`.

Tests, on small made-up data: `python -I -X utf8 -m unittest discover -s tools`.

### Review pages

`review/` is for checking the data locally, under PHP's built-in server. It never deploys.

- `index.html`: Keep, Maybe or Cut each word, and flag kanji whose parts look wrong.
- `parts.html`: the palette, every kanji's breakdown, and filters for flagged, hand-fixed, single-stroke and look-alike kanji. It also tests which palette glyphs this device's own fonts lack, so open it on a phone to check iOS or Android.

Both save to `data/review.json` through `review.php`.

### Updating a source

Source versions are pinned in the script (`KANJIVG_RELEASE`, `JMDICT_RELEASE`, `JLPT_VOCAB_RELEASE`, `WALLER_KANJI_SNAPSHOTS`). To move to a newer release, change the constant, delete the old file from `tools/sources/`, rerun, and update `data/ATTRIBUTION.md`. KANJIDIC2 has no versioned address: delete `tools/sources/kanjidic2.xml.gz` to fetch the current one.

`tools/sources/` is not committed.

## make_images.py

Draws the home-screen icons and the link-preview image into `icons/`, from the favicon's design (a vermilion seal with a white 漢):

```
python -I -X utf8 tools/make_images.py [--serif PATH] [--sans PATH]
```

It needs Pillow and the Noto Serif JP and Noto Sans JP variable fonts (Windows has both in `C:/Windows/Fonts`). Run it after changing the favicon, the brand colour or the share text, and commit the PNGs. The site keeps images for 30 days, so a changed image needs a new file name, in `manifest.webmanifest` and `index.html` too.
