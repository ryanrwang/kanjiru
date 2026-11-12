# Data sources and licences

`data/candidates.json` and `data/parts.json` are built by `tools/build_data.py` from the sources below. Each one is credited here with the exact version used. The script also writes this list into `meta.sources` of `candidates.json`.

Because they adapt CC BY-SA material, both files are shared under **CC BY-SA 4.0** (<https://creativecommons.org/licenses/by-sa/4.0/>). KanjiVG's CC BY-SA 3.0 lets adaptations use a later version of the same licence.

## KANJIDIC2

- **By:** Electronic Dictionary Research and Development Group (EDRDG), Monash University
- **URL:** <https://www.edrdg.org/kanjidic/kanjidic2.xml.gz> (project page: <https://www.edrdg.org/wiki/index.php/KANJIDIC_Project>)
- **Version:** database version 2026-311, file created 2026-11-07 (KANJIDIC2 has no numbered releases; the file is rebuilt daily)
- **Licence:** Creative Commons Attribution-ShareAlike 4.0, under the EDRDG licence terms: <https://www.edrdg.org/edrdg/licence.html>
- **Used for:** the list of jōyō kanji (grades 1 to 8), and each kanji's stroke count, grade, frequency rank, English meanings, on readings and kun readings.

## KanjiVG

- **By:** Ulrich Apel and the KanjiVG contributors
- **URL:** <https://github.com/KanjiVG/kanjivg/releases/download/r20260714/kanjivg-20260714-main.zip> (project: <https://kanjivg.tagaini.net>)
- **Version:** release r20260714 (14 July 2026), the `main` zip (non-variant SVG files only)
- **Licence:** Creative Commons Attribution-ShareAlike 3.0: <https://creativecommons.org/licenses/by-sa/3.0/>
- **Used for:** each kanji's component tree (`kvg:element`, `kvg:position`, `kvg:part`, `kvg:number`) and its strokes (`kvg:type` and the paths), which give the `parts` and their positions. The stroke paths are also copied into `data/parts.json` as `svg`, to draw the parts that fonts may lack.

## JMdict (via jmdict-simplified)

- **By:** JMdict is by EDRDG. The JSON conversion is by Dmitry Shpika (scriptin) in jmdict-simplified.
- **URL:** <https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20261102210542/jmdict-eng-common-3.6.2%2B20261102210542.json.zip> (JMdict project page: <https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project>)
- **Version:** jmdict-simplified 3.6.2+20261102210542, built from JMdict dated 2026-11-02. File `jmdict-eng-common`: English glosses, only entries with a common form.
- **Licence:** Creative Commons Attribution-ShareAlike 4.0, under the EDRDG licence terms: <https://www.edrdg.org/edrdg/licence.html>
- **Used for:** the 2 to 4 kanji words: spelling, whether that spelling is common, kana reading, up to 3 English glosses and the JMdict entry number.

## JLPT vocabulary levels: Jonathan Waller's lists, via yomitan-jlpt-vocab

- **By:** lists by Jonathan Waller (JLPT Resources, tanos.co.uk). JMdict entry numbers added by Stephen Kraus (stephenmk) in yomitan-jlpt-vocab.
- **URL:** `https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/2025.08.01.0/original_data/n5.csv`, and the same for `n4.csv` and `n3.csv` (repository: <https://github.com/stephenmk/yomitan-jlpt-vocab>)
- **Version:** release 2025.08.01.0 (the CSVs at that tag)
- **Licence:** the repository is CC BY-SA 4.0 (Stephen Kraus). Waller's lists are Creative Commons Attribution ("CC BY"), as above.
- **Used for:** a word's `jlpt` level, set only when that JMdict entry and that spelling are on Waller's N5, N4 or N3 list.

## JLPT kanji levels: Jonathan Waller's lists, via the Internet Archive

- **By:** Jonathan Waller, JLPT Resources (<http://www.tanos.co.uk/jlpt/>)
- **URL:** tanos.co.uk is offline (as of November 2026 its domain has no web address), so the script reads the Internet Archive's copies of the kanji list pages:
  - N5: <https://web.archive.org/web/20200806005029/http://www.tanos.co.uk/jlpt/jlpt5/kanji/>
  - N4: <https://web.archive.org/web/20200716184232/http://www.tanos.co.uk/jlpt/jlpt4/kanji/>
  - N3: <https://web.archive.org/web/20200724122309/http://www.tanos.co.uk/jlpt/jlpt3/kanji/>
  - N2: <https://web.archive.org/web/20200726143733/http://www.tanos.co.uk/jlpt/jlpt2/kanji/>
  - N1: <https://web.archive.org/web/20200731061258/http://www.tanos.co.uk/jlpt/jlpt1/kanji/>
- **Version:** the pages say "Updated: November 21, 2010". The snapshots are from July and August 2020, the last ones the archive holds (later captures are server errors). Counts: N5 79, N4 166, N3 367, N2 367, N1 1232.
- **Licence:** Creative Commons Attribution ("CC BY", no version given). Waller's "Use my data!" page says that everything on the site that isn't for sale is CC BY, with credit to the site: <https://web.archive.org/web/20251114165345/http://www.tanos.co.uk/jlpt/sharing/>
- **Used for:** each kanji's `jlpt` level, and so which kanji can be answers (N5 to N3) and which kanji a word may use.

## Noto Sans JP and Noto Serif JP coverage (Google Fonts)

- **URL:** <https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&family=Noto+Serif+JP:wght@700&display=swap>, fetched as a browser so it lists each font's `unicode-range`
- **Used for:** knowing which palette glyphs those fonts can draw (`font: false` in `data/parts.json`). Nothing from it is copied into the data. The fonts themselves are SIL Open Font License 1.1, and the app loads them from Google Fonts.
- **The coin:** the points' coin (`js/coin.js`) carries the outline of 金 from Noto Serif JP Black (weight 900, Google Fonts' v34), under the same SIL Open Font License 1.1, so it looks the same before the fonts load.

## Hand edits

Some dictionary data is replaced by hand (2026-11-12, the native audit), and `tools/compile_game.py` puts it into `data/game/`:

- `data/meanings-en.json`: English meanings for 57 one-kanji answers and 17 words, where KANJIDIC's keywords ("work, (kokuji)" for 働) or JMdict's rarer senses ("financial situation" for 台所) misled. Adapted from KANJIDIC and JMdict, under the same CC BY-SA 4.0.
- `data/one-kanji.json`: the one-kanji answers' readings as the jōyō table (2010) lists them, a subset of KANJIDIC's, and the word each stem is known by (選ぶ).

## Crediting in the app

EDRDG asks apps to credit JMdict and KANJIDIC on a screen of their own, such as an About screen, with links to the project pages above. KanjiVG asks for a credit and a link to <https://kanjivg.tagaini.net>. Waller asks for credit and a link to his site.
