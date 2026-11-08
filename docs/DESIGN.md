# Kanjiru design notes

The decisions so far, and why, so any new thread can pick up the game without the original conversation. Status of each: **Decided** (the user chose it), **Proposed** (suggested, not yet confirmed — confirm before building on it), or **Open**.

Last updated: 2026-11-08.

## The game

- **Decided — Concept:** Wordle for kanji. The player guesses the answer word from its parts, and every guess colours them.
- **Decided — One daily of 4–6 parts (step 4):** the answer is a word of 1 to 4 kanji with 4–6 parts in all, like Wordle's five letters ("The puzzle", below).
- **Decided — Levels:** Easy, Normal and Hard. Normal, the default, is a pure part guesser: one cell per part, grouped by kanji, with no kanji list and no free meaning ("Levels", below).
- **Decided — Name:** Kanjiru, written **漢じる**: 感じる (*kanjiru*, "to sense") with the 漢 of 漢字 in place of 感. The favicon is a vermilion hanko seal with 漢.
- **Decided — No modes by length (step 4):** the first plan had one mode per length (k1–k4 in `js/config/modes.js`). After playing, one kanji had too few parts to feel like Wordle, so one main mode (`main`) plays every length. k1–k4 are retired, kept so old saves still read.
- **Decided — Difficulty ceiling:** answers are JLPT N3 or easier, for learners, but words a native speaker also knows. Nothing obscure.
- **Decided — Everything scalable:** the number of kanji, skins, hint types and point values are catalogue entries, never hard-coded (see CLAUDE.md, "Rules").
- **Decided — Interface languages:** English and Japanese, with a toggle. It follows the device until the player picks.
- **Decided — Guessable kanji:** any of the 2,136 jōyō kanji built from the puzzle's palette ("The palette", below). The candidate list shows easier ones first.
- **Decided — One daily, then keep playing (step 4):** one daily puzzle, the same for everyone, rolling over at local midnight. After it, players keep playing more puzzles, as many as they like, framed as carrying on, not as practice. They pay the same points (`practiceMultiplier` 1). Streaks count the daily only. Internally a "keep playing" game is still `kind: 'practice'`.
- **Decided — Tune by playing:** every rule, size and number below lives in `js/config/`, so balancing after playtests is a catalogue edit.

## The puzzle (Decided, step 4)

After playing step 3, the user found one kanji too short: 79% of one-kanji answers have only 2–3 parts, so one guess gives most of it away. Wordle has five letters.

- **Decided — 4–6 parts, 1–4 kanji:** an answer has 4–6 parts in all, in any number of kanji. `tools/compile_game.py` `LISTS` sets the rule; the daily plays the `main` list.
- **Why 4–6:** two-kanji words run from 2 to 13 parts; 68% have 4–6. It keeps most words and cuts both the giveaways and the monsters (優勝 has 13).
- **The mix:** of the 3,297 candidates with 4–6 parts, 88% are two kanji. In the first Keep list (603 words) it's 109 one-kanji, 472 two-kanji, 21 three-kanji and 1 four-kanji answer.
- **Decided — The grouping shows (for now):** the cells come in one group per kanji (3 + 2 for 時間), so the player knows how many kanji and how many parts each has, like Wordle's word length.
- **Decided — The kanji is the spot at Normal:** green means the part is in this kanji, yellow that it's in another kanji of the word, grey that the word hasn't got it. The order of cells inside a kanji doesn't matter. One-kanji answers get no yellows at Normal, which is fine at under a fifth of days.
- **Decided — The place is the spot at Hard:** each cell is a place in its kanji (`places`), so green means right kanji and right place, and yellow means in the word but in another place or kanji. One yellow covers both; there's no third colour.
- **Decided — Yellow for another kanji:** the engine's `other` mark shows yellow (`--color-feedback-other`, its own token so a colour-blind mode can split it), and 🟨 in the share text.
- **Decided — First Keep list:** the user asked Claude to review the words. The first pass keeps every candidate with 4–6 parts that's on Waller's N5–N3 vocab lists, marked common in JMdict, written in kanji (not usually kana), with no rare, archaic, slang or sensitive tags. It cuts 15 by hand: 自殺 and 人種 (sensitive), 家内 and 字引 (dated), 一体, 具体, 前者, 後者 and 気味 (odd as answers), and the short weekday names (日曜 to 土曜; the 曜日 forms stay). That's 603 Keep words, about 1.7 years of dailies, in `data/review.json`, which the review page can still change.
- **Open — More words:** 2,389 common two-kanji words with 4–6 parts aren't on a JLPT list. Many are everyday words worth keeping; review them later.

## Scoring (Decided, step 2)

Every guessed kanji is broken into parts (`data/parts.json` tiles with positions), and each part gets a mark. The engine is `js/engine/score.js`; `tests/score.test.js` covers every example here. These are the rules for Easy, where a guess is a kanji; Normal and Hard guess parts, and each cell takes the position of the answer's part in that place ("Levels", below).

| Mark | Colour | Meaning |
|---|---|---|
| `hit` | Green (`--color-feedback-hit`) | The part is in the answer, in the same position |
| `near` | Yellow (`--color-feedback-near`) | The part is in the answer, in a different position |
| `other` | (2–4 kanji only; colour in step 4) | The part isn't in this kanji, but is in another kanji of the word |
| `miss` | Grey (`--color-feedback-miss`) | The part isn't in the answer, or every copy of it is already marked |

- **Positions are needed** because a plain set of parts isn't unique: 員 and 唄 are both 口 + 貝, and 古 and 叶 are both 十 + 口.
- **Positions:** left, right, top, bottom, outer (enclosures such as 門, 囗, 广, 辶), inner (what they enclose), whole (an atomic kanji), none. They must match exactly: `whole` only matches `whole`.
- **Variants:** parts are compared by tile, never by the glyph shown, so a guess of 水 scores against 海's 氵 (yellow: whole vs left).
- **Worked example:** the answer is 明 (日 left, 月 right). 間 gives 門 grey and 日 yellow (日 is inside, not left). 時 gives 日 green, 土 and 寸 grey. 明 gives two greens.

### Repeated parts

Like Wordle's repeated letters: greens first, then yellows, each in stroke order. Every marked part uses up one part of the answer, so the marks never claim more copies than the answer has.

| Answer | Guess | Marks | Why |
|---|---|---|---|
| 林 (木 left, 木 right) | 森 (木 top, 木 bottom, 木 bottom) | yellow, yellow, grey | The answer has two 木, not three |
| 休 (亻 left, 木 right) | 林 (木 left, 木 right) | grey, green | The green uses up the only 木 |
| 品 (口 top, 口 bottom ×2) | 語 (言 left, 五 right, 口 right) | grey, grey, yellow | One 口 in the guess, so one mark |

### Winning

- **One kanji:** the guess is the answer. At Normal and Hard: every cell green.
- **Look-alikes:** 未/末, 押/抽 and 拐/招 have the same parts in the same places. The compile step leaves the 4 of them that are answers (未 末 押 招) out of the one-kanji answers, so an all-green row is always the answer. They stay guessable, and stay in longer words.
- **Not a guess:** a kanji outside the jōyō list, one with a part that isn't in the palette, the wrong length, or a repeat of an earlier guess is turned away without using a row.

### Longer words (2–4 kanji)

1. Each slot is scored against the answer's kanji in the same slot, with the rules above. A slot holding the right kanji is solved.
2. Then a grey part whose tile is still unused in another slot of the answer is marked `other` instead. Same use-up rule: slots left to right, parts in stroke order, using only answer parts nothing else has marked.
3. Example: the answer is 日本 and the guess 本日. Slot 1 (本 vs 日): 木 and 一 are `other`, since both are in 本. Slot 2 (日 vs 本): 日 is `other`.
4. A look-alike in a slot (末 for 未) shows all green but isn't solved. Whether a guess must be a real word is step 4's call; the engine scores any kanji.

### Points

From `js/config/economy.js`, every number there:

- **Parts:** each part of the answer pays the first time a guess marks it: green 8, yellow 3, `other` 2. A part that goes yellow, then green, pays the difference, so each part pays at most 8.
- **Powers:** a part a power reveals counts as found and pays nothing later.
- **Win:** 80 + 20 per unused row, counted from the mode's own rows, so an Extra guess row can't pay.
- **Totals:** times the mode's multiplier, the level's (Easy 0.5, Normal 1, Hard 1.5) and daily 1 / keep playing 1 (it was practice 0.5), rounded at the end. Part points pay on a loss too.
- **Starting points:** 150.
- **Why these:** the user asked for more generous points than the first draft (5 / 2 / 50 + 15). A typical daily win pays about 145. Tune after playing.

### Powers in the engine

- **When:** `before` is before the first guess; `during` is after it, until the game ends. A power that would show nothing new can't be used.
- **revealParts:** parts not yet green, picked in a seeded order, so replaying a game gives the same parts.
- **eliminateParts:** the most-used tiles that aren't in the answer and aren't already ruled out.
- **revealKanji:** never fills the last unsolved kanji.
- **Free meaning:** after guess 3, set per mode (`freeMeaning` in `js/config/modes.js`; 0 shows it from the start), and only at a level with `freeMeaning` (Easy). It isn't a power, so a game that only used it is still clean and gets no 💡.
- **Bonus drops:** after a win, 30% (60% when solved in half the rows or fewer), weighted by each power's `drop`, skipping powers held at their limit.

### Dailies and stats

- **Puzzle number:** days since the epoch, by the local date. The epoch is `EPOCH` in `tools/compile_game.py`, written into `data/game/answers.json` with the answer order (`js/engine/daily.js` reads it). Set it to launch day at step 8, then never change it.
- **Answer order:** a fixed (seeded) shuffle of the Keep words. Days already played, up to tomorrow, are locked; later days are shuffled again on each compile, so new Keep words mix in evenly. When the list runs out it starts again from the top.
- **A year of dailies** needs 365 Keep words per mode. One kanji has 530 candidates once the look-alikes leave; four kanji has only 144, so its daily would repeat after 144 days.
- **Practice:** a random Keep answer, skipping the last 30 played in that mode (`rules.js` `practice.avoidRecent`).
- **Streak:** one streak across modes: days in a row with at least one daily won. A day not yet played doesn't break it. Streak rewards pay each time a run reaches their length.
- **Stats:** wins, fastest win, clean wins and kanji collected count practice too. Streaks and full-set days count dailies only. Kanji collected counts every kanji of a solved word.
- **History entries** (`js/store.js`): `{ date, guesses, won, powers: [ids], answer, level }`, under the puzzle number for a daily, or `p` + a timestamp for practice. `guesses` holds words, or for parts guesses the tile ids per kanji, so `engine.guess()` can replay either.

## The palette (Decided, step 2)

Each puzzle shows a subset of the 251 tiles instead of all of them, like Wordle's keyboard. The engine is `js/engine/palette.js`.

- **What's in it:** every part of the answer, the six single strokes (`rules.js` `palette.always`), and random decoys up to the mode's `palette` size in `modes.js`: 40, 50, 56 and 64 for 1–4 kanji.
- **Guesses:** only kanji built entirely from the palette's tiles, typed ones included (`rules.js` `guessFromPalette`).
- **Same for everyone:** a daily's palette comes from its puzzle number.
- **Decoys:** picked by weight: how many jōyō kanji use the tile, plus 20× how many kanji it shares with a part of the answer (`rules.js` `decoyWeight`). Neighbours make more real kanji buildable.
- **Why 40:** tested on the real data, a 40-tile palette leaves about 190 buildable jōyō kanji per puzzle, about 75 of them N3 or easier. 30 tiles leaves about 115, which felt too tight.
- **The leak:** the answer's parts are always in the palette; with 34 decoys that gives little away.
- **Why:** the user asked for it, since 251 tiles is a lot to scan on a phone.

## Levels (Decided, step 3)

After playing step 3, the user found it worked as a kanji finder, not a part guesser: once you know which parts are in the answer, the strip of kanji gives it away. The game is meant to be about guessing the parts (radicals), so it now has three levels (`js/config/levels.js`), picked on the start screen.

| Level | A guess is | Helpers | Meaning |
|---|---|---|---|
| Easy | A kanji, as in "Making a guess" below | Kanji strip, greyed-out parts, meanings on the rows | Free after guess 3 |
| Normal (the default) | Any parts, one per cell, grouped by kanji | The kanji is the spot; a count of the kanji that still fit; 70% of the tiles (28) | Only from the Meaning hint |
| Hard | Parts that make a real kanji in those places, one per cell | Cells are places; all the tiles | Only from the Meaning hint |

- **Decided — Cells:** each row has one cell per part of the answer, grouped by kanji, so the part count is known from the start.
- **Decided — Like Wordle's screen (step 4):** every row shows from the start, the cells as big as fit, and nothing beside them: no guess counter, dots or side column. The parts sit at the bottom as a keyboard, pinned there, with Delete and Guess keys in its last row. Hints open from a button in the head. While a game is on, the site header steps aside.
- **Proposed — Delete:** empties the selected cell, or when it's empty, the one before it (like a backspace). Clear is gone.
- **Proposed — Selecting cells:** one cell of the next row is selected. A tapped part fills it, then the next empty cell is selected; tapping a cell selects it, so its part can be swapped.
- **Decided — Parts by place at Hard:** a cell only takes parts that some jōyō kanji has in its place (`tilesForPlace()` in `js/engine/palette.js`). The keyboard shows the selected cell's place's parts, named above them ("Parts for left"); tapping a cell switches place. (The place buttons of step 3 are gone; Normal has no places.)
- **Proposed — Part colours by place:** at Hard, a part tried in the selected cell's place shows the mark it got there, so green means "right here". Otherwise a part in the answer shows yellow, and one ruled out shows grey. At Normal, keys show the best mark each part has had, like Wordle's keyboard.
- **Decided — Kanji frame (after playing):** a frame in each answer kanji's shape fills in with each part found green, in its place, whether by a guess or a power. A dot stands for each part still hidden. A solved kanji shows whole, on green.
- **Proposed — Frame layout:** top and bottom span the frame; left, inner and right share the middle; an outer part (門, 辶) covers it all, with the inner inset. A place with several parts stacks them (土 over 寸 for 時). The frame catches up once the row has flipped.
- **Decided — The board fits the screen (after playing):** the user found a narrow column in the middle of a phone a poor use of space, and asked for a board that scales to any number of kanji.
- **Proposed — How it fits (`fitBoard()` in `js/play/screen.js`):** cells take the largest layout-token size (64, 56, 48, 40, 32 or 24 px) whose rows fit the width on one line and, with the head, frames, place names and keyboard, the screen's height. Each kanji's frame sits above its own cells, 80 or 64 px. If even 24 px cells are too wide, rows wrap between kanji, never inside one. It refits when the screen turns or resizes. On a 402 × 780 phone a 6-part answer gets 48 px cells; on a 375 × 667 one, 32 px.
- **Proposed — Short place names:** over cells narrower than 40 px, places use short names (L, R, btm, out, in; Japanese is already one character).
- **Decided — Cells are places at Hard (`places`):** each cell stands for one of the answer's part positions, in order, and a line above the board names them (左 右, or 左 右 右 for 時). A part is green in its place, yellow in another place or kanji. Repeated parts work like Wordle's letters: three 木 picked for 森 are all green. All cells green wins. The engine is `scoreParts()` in `js/engine/score.js`.
- **Decided — Why places came, then went to Hard:** in step 3, parts-only guessing of one kanji was a guessing game, and places brought back yellow. With 4–6 parts over 1–4 kanji (step 4), the kanji is a natural spot and gives yellow by itself, so Normal drops places and Hard keeps them.
- **Decided — Kanji that fit (`countLeft`, Normal only):** each guess says how many kanji still fit everything seen so far: same shape, buildable from the palette, none swept away, the revealed strokes, layout and parts, and the same marks for every guess (`engine.fits()`). The next row shows the count before the first guess, and again when a power changes it.
- **Proposed — Where the count goes:** under each kanji's frame ("12 fit"), for the latest guess only. Each row's count is in its screen-reader label.
- **Decided — Fewer parts at Normal (`paletteScale` 0.7):** 28 tiles instead of 40, so each guess tests more of them. Hard keeps 40.
- **Decided — Normal takes any parts:** they don't have to make a kanji. **Hard** turns away parts that make no jōyō kanji in those places ("No kanji has those parts in those places").
- **Decided — No free meaning at Normal or Hard:** only the Meaning hint shows it (`freeMeaning: false`).
- **Decided — Layout hint at Hard:** the cells already show the layout, so the hint says it has nothing new to show. At Normal it works.
- **Open — Kanji on the rows:** the engine still works out the kanji a Hard row's parts make (the easiest when several share them, such as 員 and 唄), and it's in the row's screen-reader label, but the Wordle-style board has no room beside the rows to show it. The frame shows each kanji once solved.
- **Proposed — Look-alikes:** parts that are exactly the answer's, in the same places, win, even when a look-alike shares them (未 and 末).
- **Proposed — Points:** each level multiplies points, on top of the mode and daily or practice: Easy ×0.5, Normal ×1, Hard ×1.5 (`levels.js` `points`). Normal stays ×1 because the economy was tuned at ×1.
- **Proposed — One daily for every level:** a mode has one daily, whatever the level, so puzzle numbers and streaks are shared. A game keeps the level it started at (in its start, `save.playing`), and its history entry records it. A game with no moves yet moves to a level picked since.
- **Proposed — Sharing:** the share text names the level (`Kanjiru 一 #7 Normal 3/6`), with yellow squares at Normal and Hard too.
- **Proposed — Start screen:** the example rows follow the level picked: kanji guesses at Easy (answer 明), and at Normal and Hard three rows for 時間, with 寸 yellow in the wrong kanji (and at Hard, 日 yellow in the wrong place), then 時間 solved.
- **Open — Tuning Normal:** 28 tiles, 6 rows and the count may still be too hard, or too easy. More rows, a different `paletteScale` or cheaper hints are catalogue edits. Decide after playing.
- **Decided — One-part answers stay out:** one-part kanji (金, 車, 雨) are already out of the one-kanji answers ("Atomic answers leave", below), and the 4–6 part rule keeps them out anyway.
- **Open — Real words at Hard:** each kanji's parts must make a real kanji. Whether the whole word must be a real word too is still open (`options.isWord` already applies).

## Making a guess at Easy (Decided, built in step 3; longer words in step 4)

- The player taps parts on the puzzle's palette, grouped by stroke count like jisho.org's radical search. `narrow()` in `js/engine/palette.js` does the filtering below.
- Parts that can't combine with the ones already picked grey out. A tile's corner shows its most used other form (氵 on 水).
- A strip shows the real kanji that match, easiest first. Every guess is therefore a real kanji, and its meaning shows, so guesses teach.
- Players who type Japanese can enter a kanji with their keyboard instead. A typed kanji with a part outside the palette is shown with a red edge and turned away.
- **Proposed — Tap twice to guess:** the first tap puts the kanji in the next row with its parts and meaning; a second tap (or Guess) makes the guess. One tap was the plan, but a stray tap on a phone would waste a row.
- **Proposed — Longer words:** the next row says how many kanji the word has. Each tapped kanji fills the next slot, and the picked parts reset for the next kanji; once all are full, tapping the last one again guesses. Delete takes the last kanji off. Easy doesn't check that the word is real.
- **Palette colours:** each tile shows the best mark it has had (green, yellow, grey), like Wordle's keyboard. Parts a power reveals are green; parts Sweep removes are grey.

## The game screen (step 3)

- **Board at Easy, proposed:** the rows guessed so far, then the next row, then one dot per row left, and a guess counter in the head. Normal and Hard show every row instead ("Levels", above).
- **Reveal:** each new row flips tile by tile (`settings.tiles`; Flip for now, step 6 adds the rest). Off under reduced motion.
- **Hints:** at Easy, the free meaning after guess 3 (with a note until then). At every level, the bar of powers with the count held opens from the Hints button in the head (at Normal and Hard, above the keyboard); clues already found stay on show. Tapping a power opens a sheet that says what it does and why it can't be used now, if so. Using one spends it from the inventory.
- **Saving:** the game on the go is saved as its start and log after every move (`save.playing`), so a reload carries on. A finished daily is recorded to history and can't be played again; its result shows until the next daily.
- **Points:** paid into the wallet once, when a game ends: what `engine.points()` gives. Streak rewards, bonus drops and achievements are step 5.
- **Result card:** the answer with its meanings, readings and parts, points, streak, share text and a countdown to the next daily, with Keep playing (after the daily) or Next puzzle (after another one). A game from another device (merged in) shows without points, since only its guesses are known.
- **Share text:** the mode's numeral, the daily number, the level, the score (X when lost) and one square per part per guess (`rules.js` `share`). 💡 marks a game that used a power; the free meaning doesn't count.
- **Modes:** `listed` in `js/config/modes.js` puts a mode on the start screen and `playable` says the screen supports it; a mode with no answers shows "soon". The start screen offers the daily first, then Keep playing once it's done.

## Hints, powers and points

- **Decided — Game-like:** random bonus hints, hints you can use before the game starts (reveal one or several parts), and points earned per guess that buy hints and powers.
- **Decided — Catalogue:** `js/config/powers.js`. Each power names an `effect` (revealStrokes, revealLayout, revealMeaning, revealReading, revealParts, eliminateParts, addGuesses, revealKanji) plus `params`, `when` (before / during), `cost`, `hold` and `drop`.
- **Decided — Point values:** `js/config/economy.js`, with the rules in "Scoring", "Points". Daily games pay more than practice, streak milestones pay a reward, and wins drop a random hint. Each mode multiplies its points.
- **Decided — Base rules:** at Easy the meaning is free after guess 3 (set per mode). At Normal and Hard only the Meaning hint shows it ("Levels").
- **Decided — Honest sharing:** the share text marks a game that used a power with 💡 (step 3).
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
| Looks, language and level (`settings`) | This device's stay |
| Games on the go (`playing`) | This device's stay; a daily the other device finished is in history, which wins |

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

- **Decided — Review:** words are reviewed on `review/` (local only). The game uses only words marked Keep in `data/review.json`. The first pass was Claude's, at the user's request ("The puzzle", above).
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

- **Look-alikes:** settled in step 2: 未 末 押 招 leave the one-kanji answers ("Scoring", "Winning").
- **Clumsy breakdowns:** 160 answers still have single strokes, and a few have several (乗, 呼, 段, 喜, 候). Flag them on the parts check page, then fix them in `data/parts-overrides.json`.
- **Phones:** check `review/parts.html` on iOS and Android to confirm which glyphs need the drawings.

## Hosting

- **Live:** https://www.ryanrwang.com/apps/kanjiru/ (also clearful.net). Each push to `main` deploys by FTPS (`.github/workflows/deploy.yml`).
- **Not deployed:** `tools/`, `review/`, `tests/`, `package.json`, the data working files and `*.md`. The game loads `data/game/` and `data/parts.json`.
- **Local:** `php -S 0.0.0.0:8095 -t D:/Dropbox/Clearful`, then open `/apps/kanjiru/`.
- **Apps page:** not listed on `/apps/` yet; add it at launch.
