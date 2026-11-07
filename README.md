# Kanjiru 感じる

A daily kanji puzzle in the spirit of Wordle. Guess the kanji, or a word of up to four kanji, from its parts. Each guess colours its parts: right part in the right spot, right part in the wrong spot, or not in the answer.

Answers stay at JLPT N3 or easier, so learners and native speakers can both play.

Play it at https://www.ryanrwang.com/apps/kanjiru/

## Status
Early. The start screen, skins, catalogues and save system are in; the game screen comes next.

## How it's built
- Vanilla JavaScript, no build step, no dependencies.
- Modes, skins, hints and powers, achievements and point values are catalogues in `js/config/`, so the game grows by adding entries.
- Progress is saved in the browser (localStorage).

## Data and credits
The kanji and word data come from:
- **KANJIDIC2** and **JMdict** by the Electronic Dictionary Research and Development Group (CC BY-SA 4.0)
- **KanjiVG** by Ulrich Apel and contributors (CC BY-SA 3.0)
- **JLPT level lists** by Jonathan Waller, tanos.co.uk (CC BY)

The data files are shared under the same terms. See `data/ATTRIBUTION.md` for details.
