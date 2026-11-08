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

- **Builder:** `tools/build_data.py` builds `data/candidates.json` and `data/parts.json`. The sources are pinned, and the credits are in `data/ATTRIBUTION.md`:
  - KANJIDIC2 (kanji info)
  - KanjiVG (parts, positions and stroke drawings)
  - JMdict common words
  - Jonathan Waller's JLPT lists
- **Waller's kanji lists:** tanos.co.uk is offline, so they come from Internet Archive snapshots (July–August 2020).
- **Common words only:** rare alternate spellings (学文 for 学問) are dropped (`REQUIRE_COMMON`).
- **Candidates:** 5,647 in all.

| Length | Candidates | On a JLPT list |
|---|---|---|
| 1 kanji | 534 | all |
| 2 kanji | 4,309 | 717 |
| 3 kanji | 660 | 46 |
| 4 kanji | 144 | 3 |

- **Decided — Review:** the user reviews words on `review/` (local only). The game uses only words marked Keep in `data/review.json`.
- **Decided — Atomic answers leave:** a one-kanji answer that is a palette tile itself (金, 車, 雨: 78 of them) isn't an answer, since its parts give no clues. It still appears inside longer words. `KEEP_ATOMIC_ANSWERS` brings them back.

## Part breakdowns

Every jōyō kanji has `parts` in `data/candidates.json`: palette tiles in stroke order, each with its position in the whole kanji. The palette is `data/parts.json`. The rules are in `tools/README.md` ("Parts").

- **Decided — Palette:** 251 tiles.
  - The radicals that jōyō kanji use, plus shapes that recur but aren't radicals (业, 免, 兼), and a few kanji that would otherwise fall apart into single strokes (五, 不, 半, 北).
  - ナ and マ stand for the katakana-like shapes in 右, 左 and 予.
  - The six single strokes 一 丨 丶 丿 乙 亅 cover what's left over.
- **Decided — Variants are the same part:** 氵 and 氺 count as 水, 亻 as 人, 扌 as 手, 忄 as 心, 刂 as 刀, 灬 as 火, 犭 as 犬, 礻 as 示, 衤 as 衣, 飠 as 食, 爫 as 爪, 耂 as 老, 覀 as 西, ⺧ as 牛, ⺷ as 羊.
  - **Why:** players learn them as one idea, a guess of 水 for 海 should score, and the palette stays small.
  - Each part keeps the glyph it appears as (`form`), so a revealed part can show 氵.
  - 月 and 肉 are different tiles: players see the shape 月 in 腸, not where it came from.
- **Decided — Depth: building blocks.** A kanji splits into the biggest pieces that are tiles, like jisho's radical search. 語 = 言 + 五 + 口, not 言 + 吾 (吾 isn't a tile).
- **Decided — Positions:** left, right, top, bottom, outer, inner, whole or none. The kanji's first split decides, so 語's 五 and 口 are both right.
  - Enclosures are outer and what they hold is inner (国 = 囗 outer + 玉 inner).
  - none is for parts that cross (中 = 口 + 丨).
- **Decided — Fonts:** 11 palette glyphs are drawn from KanjiVG's strokes instead of text.
  - Not in Noto Sans/Serif JP: 龶 㐄 业 𢆉.
  - Not in JIS X 0213, so a phone's own fonts may lack them: 𠂊 ⺌ ⺍ ⺗ ⺧ ⺷ 卌.
  - `review/parts.html` tests the device's own fonts. On Windows, all draw.
- **Hand fixes:** 10 kanji in `data/parts-overrides.json` (万 三 円 年 実 寒 声 勤 無 舞).

### How the known problems were fixed

| Problem | Now |
|---|---|
| Loose strokes reduced 本, 未, 末 to 木 | They become single-stroke tiles: 本 = 木 + 一 |
| Enclosure contents had no position (国, 間) | inner |
| Positions relative to a subgroup (命, 歯) | The first split decides: 命 = 人 + 一 top, 口 + 卩 bottom |
| No position at all (上, 中, 東) | Measured from the strokes: 上 = 卜 top + 一 bottom |
| Unprintable `CDP-…` names (原, 願, 武, 源) | Cut below them: 原 = 厂 outer + 白 and 小 inner |
| Split parts (裏, 衷, 主) | Joined: 裏 = 衣 outer + 里 inner; 主 = 丶 + 王 |
| Atomic answers (金, 車, 雨) | One part each, and out of the one-kanji answers |

### Still open

- **Look-alikes:** 未/末, 押/抽 and 拐/招 have the same parts in the same places. The engine needs a tie-break, or must accept either.
- **Clumsy breakdowns:** 160 answers still have single strokes, and a few have several (乗, 呼, 段, 喜, 候). Flag them on the parts check page, then fix them in `data/parts-overrides.json`.
- **Phones:** check `review/parts.html` on iOS and Android to confirm which glyphs need the drawings.

## Hosting

- **Live:** https://www.ryanrwang.com/apps/kanjiru/ (also clearful.net). Each push to `main` deploys by FTPS (`.github/workflows/deploy.yml`).
- **Not deployed:** `tools/`, `review/`, the data working files and `*.md`.
- **Local:** `php -S 0.0.0.0:8095 -t D:/Dropbox/Clearful`, then open `/apps/kanjiru/`.
- **Apps page:** not listed on `/apps/` yet; add it at launch.
