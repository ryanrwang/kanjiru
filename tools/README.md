# tools

## build_data.py

Builds `data/candidates.json`, the list of Kanjiru answers with each kanji's info and part breakdown.

1. Downloads the sources into `tools/sources/`: KANJIDIC2, KanjiVG, JMdict (common words), and Jonathan Waller's JLPT vocab and kanji lists. A file that is already there is reused. Credits and versions are in `data/ATTRIBUTION.md`.
2. Writes `data/candidates.json`:
   - `kanji`: every jōyō kanji with strokes, grade, JLPT level, frequency, meanings, readings, `parts` (its top-level KanjiVG components) and `tree` (the full decomposition).
   - `words`: every N5 to N3 kanji, plus the common JMdict words of 2 to 4 kanji that use only N5 to N3 kanji.
3. Prints a summary: counts per length, KanjiVG quirks it smoothed over, and run time.

Python 3.10 or later, standard library only. Run it from the project folder:

```
python -I tools/build_data.py
```

The first run downloads about 17 MB and takes about 15 seconds. Later runs use the saved files and take about 2 seconds.

### Changing what it builds

The settings are constants at the top of the script:

- `MAX_LENGTH = 4`: the longest word, in kanji.
- `MAX_JLPT_LEVEL = 3`: the hardest JLPT level allowed. 3 means N5, N4 and N3; 2 adds N2.
- `MAX_GLOSSES = 3`: English glosses kept per word.
- `REQUIRE_COMMON = True`: keep only spellings JMdict marks common, or that Waller lists. This drops about 430 rare alternate spellings, such as 学文 for 学問.

### Updating a source

Source versions are pinned in the script (`KANJIVG_RELEASE`, `JMDICT_RELEASE`, `JLPT_VOCAB_RELEASE`, `WALLER_KANJI_SNAPSHOTS`). To move to a newer release, change the constant, delete the old file from `tools/sources/`, rerun, and update `data/ATTRIBUTION.md`. KANJIDIC2 has no versioned address: delete `tools/sources/kanjidic2.xml.gz` to fetch the current one.

`tools/sources/` is not committed.
