# Kanjiru design notes

The decisions so far, and why, so any new thread can pick up the game without the original conversation. Status of each: **Decided** (the user chose it), **Proposed** (suggested, not yet confirmed — confirm before building on it), or **Open**.

Last updated: 2026-11-07.

## The game

- **Decided — Concept:** Wordle for kanji. The player guesses the answer kanji (or word) and every guess colours its parts.
- **Decided — Name:** Kanjiru, written **漢じる**: 感じる (*kanjiru*, "to sense") with the 漢 of 漢字 in place of 感. The favicon is a vermilion hanko seal with 漢.
- **Decided — Modes by length:** the answer is 1, 2, 3 or 4 kanji (`js/config/modes.js`: k1–k4). 4-kanji answers include everyday compounds (天気予報, 電話番号) as well as idioms (一石二鳥).
- **Decided — Difficulty ceiling:** answers are JLPT N3 or easier, for learners, but words a native speaker also knows. Nothing obscure.
- **Decided — Everything scalable:** the number of kanji, skins, hint types and point values are catalogue entries, never hard-coded (see CLAUDE.md, "Rules").
- **Decided — Interface languages:** English and Japanese, with a toggle. It follows the device until the player picks.
- **Proposed — Guessable kanji:** any of the 2,136 jōyō kanji can be a guess, so native speakers aren't blocked. The candidate list shows easier ones first.
- **Proposed — Daily + practice:** one daily puzzle per mode, the same for everyone, rolling over at local midnight, plus unlimited practice. Streaks count dailies only.

## Feedback (Proposed)

Every guessed kanji is broken into parts, and each part gets a colour:

| Colour | Meaning |
|---|---|
| Green (`--color-feedback-hit`) | The part is in the answer, in the same position |
| Yellow (`--color-feedback-near`) | The part is in the answer, in a different position |
| Grey (`--color-feedback-miss`) | The part isn't in the answer |

- **Positions are needed** because a plain set of parts isn't unique: 員 and 唄 are both 口 + 貝, and 古 and 叶 are both 十 + 口.
- **Positions:** left, right, top, bottom, outer (enclosures such as 門, 囗, 广, 辶), inner (what they enclose), whole (an atomic kanji), none.
- **Worked example:** the answer is 明 (日 left, 月 right). 間 gives 門 grey and 日 yellow (日 is inside, not left). 時 gives 日 green and 寺 grey. 明 gives two greens.
- **Open — Repeated parts:** how to colour a part that appears twice (like Wordle's repeated letters). The engine step settles this.
- **Open — Longer words:** each slot gets its own colours, plus a marker for "this part is in another kanji of the word". Whether a 2–4 kanji guess must be a real word is also open; real words fit Wordle and teach vocab, and the input can narrow the choices as slots fill.

## Making a guess (Proposed)

- The player taps parts on a palette, grouped by stroke count like jisho.org's radical search.
- Parts that can't combine with the ones already picked grey out.
- A strip shows the real kanji that match, easiest first, and the player taps one to guess it. Every guess is therefore a real kanji, and its meaning can be shown, so guesses teach.
- Players who type Japanese can enter a kanji with their keyboard instead.

## Hints, powers and points

- **Decided — Game-like:** random bonus hints, hints you can use before the game starts (reveal one or several parts), and points earned per guess that buy hints and powers.
- **Decided — Catalogue:** `js/config/powers.js`. Each power names an `effect` (revealStrokes, revealLayout, revealMeaning, revealReading, revealParts, eliminateParts, addGuesses, revealKanji) plus `params`, `when` (before / during), `cost`, `hold` and `drop`.
- **Decided — Point values:** `js/config/economy.js`. Points come per part a guess uncovers (green 5, yellow 2) and per win (50 + 15 per unused row). Daily games pay more than practice, streak milestones pay a reward, and wins drop a random hint (30%, or 60% for a fast solve). Each mode multiplies its points.
- **Proposed — Base rules:** the meaning is free after guess 3. A Hard toggle (no free meaning) can come later.
- **Proposed — Honest sharing:** the share text marks a daily that used hints (e.g. 💡).
- **Open — Japanese mode:** the 意味 (Meaning) hint shows the English gloss, because the dictionary data is English only. For native speakers, the reading or example words may suit better.

## Skins

- **Decided — Tiers:** basic skins first (light, dark and a few colours), then elegant ones with animations and effects.
- **Decided — Slots:** colours (`theme`), tile reveal (`tiles`) and win effect (`effect`), mixed freely. The catalogue is `js/config/skins.js`; the colours live in `tokens.js` `THEMES`.
- **Free:** Classic, Ai 藍, Matcha 抹茶 and Sakura 桜, each light and dark; Flip tiles; None or Brush draw effect.
- **Locked:**
  - Urushi 漆 (800 pts, dark only) and Kinpaku 金箔 (30-day streak)
  - Ink bleed tiles (400 pts) and Hanko stamp tiles (7-day streak)
  - Petal fall (600 pts) and Hanabi 花火 (solve in 2 guesses)
- **Decided — Brand colour:** vermilion 朱 (#B8331F on buttons).

## Saving and devices

- **Decided — Storage:** saves live in the browser (`localStorage` key `kanjiru`, versioned, migrations in `js/store.js`).
- **Decided — Moving devices:** with a one-time code, from Settings (the gear in the header).
  - `api/transfer.php` stores a sent save under a 6-character code with no look-alikes (no 0/O or 1/I/L).
  - A code lasts 15 minutes and is deleted the first time it's read.
  - Saves are capped at 1 MB. Each IP gets 10 sends and 20 tries per 15 minutes, so codes can't be guessed.
  - Codes live in `api/codes/`: blocked from the web, ignored by Git and skipped by the deploy. File names are hashes of the codes.
  - Copy/paste save text works as a backup, with no server.
- **Decided — Receiving:** a device with no progress takes the received save as it is, looks included. A device with progress asks first: **Merge both** or **Replace this device**. It asks before the code is used, so cancelling doesn't waste it. "Progress" is anything but looks and language.
- **Decided — Merge rules** (`MERGE` in `js/store.js`). Each is safe to repeat, so sending saves back and forth never creates points or games:

| Part of the save | Merged as |
|---|---|
| Games (`history`) | Both kept. The same puzzle on both: the better result (a win, then fewer guesses, then fewer hints) |
| Streaks and stats | Worked out again from the joined games |
| Skins unlocked, achievements | Both kept; an achievement keeps the earlier date |
| Points, hints held | The higher of the two, not the sum |
| Looks and language | This device's stay |

- **Rule:** a new top-level key in the save needs a merge rule; `validate()` warns when one is missing.
- **Proposed — Exact points (step 5):** record the points each game paid and each purchase in the save, so a merge can add points exactly instead of taking the higher.
- **Server:** the site runs PHP 8.2 (`ea-php82` in the site's root `.htaccess`). The endpoint is written for PHP 7.4 and up, with core functions only.
- **Risk:** iOS Safari wipes a site's storage after 7 days without a visit. Installing to the home screen avoids it, and the save text is a backup.

## Word data

- **Builder:** `tools/build_data.py` builds `data/candidates.json`. The sources are pinned, and the credits are in `data/ATTRIBUTION.md`:
  - KANJIDIC2 (kanji info)
  - KanjiVG (parts)
  - JMdict common words
  - Jonathan Waller's JLPT lists
- **Waller's kanji lists:** tanos.co.uk is offline, so they come from Internet Archive snapshots (July–August 2020).
- **Common words only:** rare alternate spellings (学文 for 学問) are dropped (`REQUIRE_COMMON`).
- **Candidates:** 5,725 in all.

| Length | Candidates | On a JLPT list |
|---|---|---|
| 1 kanji | 612 | all |
| 2 kanji | 4,309 | 717 |
| 3 kanji | 660 | 46 |
| 4 kanji | 144 | 3 |

- **Decided — Review:** the user reviews words on `review/` (local only). The game uses only words marked Keep in `data/review.json`.

## Part breakdowns: known problems

The parts come from KanjiVG's top-level components. Before the game can score with them, these need fixing:

1. **Loose strokes aren't components:** 本, 未 and 末 all reduce to just 木; 白 → 日, 言 → 口, 鳥 → 灬.
2. **Enclosure contents have no position:** 国 = 囗 outer + 玉 none, and the same for 間 and 図. They should be inner.
3. **Positions are relative to a subgroup:** 命 comes out as 人 top, 一 top, 口 left, 卩 right.
4. **Several parts with no position at all:** 上, 中, 出, 東, 右.
5. **Variant forms:** 氵 (from 水), 亻 (人), 扌 (手), and 月 from 肉. Whether a variant matches its original is undecided.
6. **Unprintable component names:** `CDP-8BC4` (原, 願) and `CDP-8CB8` (武, 源).
7. **Split parts:** 裏 (衣 around 里), 衷, 主.
8. **Atomic answers give no clues:** 金, 車, 雨 and others.
9. **Open — Depth:** is 語 言 + 吾, or 言 + 五 + 口? This depends on the parts palette.
10. **Open — Fonts:** some components (⺌, 𠂉) may not render on every phone. KanjiVG's stroke drawings are a fallback.

## Hosting

- **Live:** https://www.ryanrwang.com/apps/kanjiru/ (also clearful.net). Each push to `main` deploys by FTPS (`.github/workflows/deploy.yml`).
- **Not deployed:** `tools/`, `review/`, the data working files and `*.md`.
- **Local:** `php -S 0.0.0.0:8095 -t D:/Dropbox/Clearful`, then open `/apps/kanjiru/`.
- **Apps page:** not listed on `/apps/` yet; add it at launch.
