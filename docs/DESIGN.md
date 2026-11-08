# Kanjiru design notes

The decisions so far, and why, so any new thread can pick up the game without the original conversation. Status of each: **Decided** (the user chose it), **Proposed** (suggested, not yet confirmed — confirm before building on it), or **Open**.

Last updated: 2026-11-08.

## The game

- **Decided — Concept:** Wordle for kanji. The player guesses the answer word from its parts, and every guess colours them.
- **Decided — One daily of 4–6 parts (step 4):** the answer is a word of 1 to 4 kanji with 4–6 parts in all, like Wordle's five letters ("The puzzle", below).
- **Decided — One game, two switches (step 4):** everyone plays Normal: the word's parts in writing order, one per cell, like Wordle's letters. Settings has two switches, Hard and Guided. Easy is retired ("Levels", below).
- **Decided — Name:** Kanjiru, written **漢じる**: 感じる (*kanjiru*, "to sense") with the 漢 of 漢字 in place of 感. The favicon is a vermilion hanko seal with 漢.
- **Decided — No modes by length (step 4):** the first plan had one mode per length (k1–k4 in `js/config/modes.js`). After playing, one kanji had too few parts to feel like Wordle, so one main mode (`main`) plays every length. k1–k4 are retired, kept so old saves still read.
- **Decided — Difficulty ceiling:** answers are JLPT N3 or easier, for learners, but words a native speaker also knows. Nothing obscure.
- **Decided — Everything scalable:** the number of kanji, skins, hint types and point values are catalogue entries, never hard-coded (see CLAUDE.md, "Rules").
- **Decided — Interface languages:** English and Japanese, picked in Settings. It follows the device until the player picks.
- **Decided — Guessable kanji:** any of the 2,136 jōyō kanji built from the puzzle's palette ("The palette", below). The candidate list shows easier ones first.
- **Decided — One daily, then keep playing (step 4):** one daily puzzle, the same for everyone, rolling over at local midnight. After it, players keep playing more puzzles, as many as they like, framed as carrying on, not as practice. They pay the same points (`practiceMultiplier` 1). Streaks count the daily only. Internally a "keep playing" game is still `kind: 'practice'`.
- **Decided — Tune by playing:** every rule, size and number below lives in `js/config/`, so balancing after playtests is a catalogue edit.

## The puzzle (Decided, step 4)

After playing step 3, the user found one kanji too short: 79% of one-kanji answers have only 2–3 parts, so one guess gives most of it away. Wordle has five letters.

- **Decided — 4–6 parts, 1–4 kanji:** an answer has 4–6 parts in all, in any number of kanji. `tools/compile_game.py` `LISTS` sets the rule; the daily plays the `main` list.
- **Why 4–6:** two-kanji words run from 2 to 13 parts; 68% have 4–6. It keeps most words and cuts both the giveaways and the monsters (優勝 has 13).
- **The mix:** of the 3,297 candidates with 4–6 parts, 88% are two kanji. In the first Keep list (603 words) it's 109 one-kanji, 472 two-kanji, 21 three-kanji and 1 four-kanji answer.
- **Decided — Parts in writing order, like letters (step 4, after playing):** each cell is one part of the answer, in writing order across the whole word: 時間 is 日 土 寸 門 日. Green: the right part in the right cell. Yellow: in the word, in another cell (same kanji or not). Grey: not in the word. Repeated parts work like Wordle's repeated letters. The engine is `scoreOrder()` in `js/engine/score.js`.
- **Decided — The split is hidden (for now):** the cells are one row, so where one kanji ends is part of the puzzle. Once all of a kanji's cells are green, the kanji shows above them, which gives that kanji's cells away. (Guided shows the split from the start.)
- **Why order:** with the kanji as the spot, order inside a kanji didn't matter and one-kanji days had no yellows. Order makes every day a Wordle-style puzzle, and teaches writing order.
- **Writing order isn't always obvious:** it's KanjiVG's component order, which is mostly left to right, top to bottom and outside in, but enclosures written last come last (近 is 斤 then 辶). 138 of the 603 answers have an enclosure. Players learn it from the colours; Guided helps.
- **Decided — Yellow is one colour:** the engine's `near` (another cell) shows yellow, and so does the older `other` mark (`--color-feedback-other`, its own token so a colour-blind mode can split it). 🟨 in the share text.
- **Decided — First Keep list:** the user asked Claude to review the words. The first pass keeps every candidate with 4–6 parts that's on Waller's N5–N3 vocab lists, marked common in JMdict, written in kanji (not usually kana), with no rare, archaic, slang or sensitive tags. It cuts 15 by hand: 自殺 and 人種 (sensitive), 家内 and 字引 (dated), 一体, 具体, 前者, 後者 and 気味 (odd as answers), and the short weekday names (日曜 to 土曜; the 曜日 forms stay). That's 603 Keep words, about 1.7 years of dailies, in `data/review.json`, which the review page can still change.
- **Open — More words:** 2,389 common two-kanji words with 4–6 parts aren't on a JLPT list. Many are everyday words worth keeping; review them later.
- **Decided — Loose strokes leave the daily for now (step 4b):** 177 of the 603 Keep answers had a stray single stroke as a part (丨 丶 丿 乙 亅; e.g. 今日, 電気, 仕事). With every part a cell, those cells are close to guesswork. They stay Keep, but the daily list leaves them out (`LISTS` `without` in `tools/compile_game.py`) until their breakdowns are fixed in `data/parts-overrides.json`; fixed ones come back on the next compile. 一 is a real part and stays. Days already played keep their answer (勝 and 経由 were days 8 and 9).
- **Decided — First fixes (step 4b):** 10 kanji fixed with tiles the palette already has, the way similar kanji split: 重 動 種 (𠂉 over 里, as in 毎), 産 (立 over 厂 and 生), 着 (羊 over 目), 表 (龶 衣), 平 (干 八, as in 前), 号 (口 丂), 母 (毋, as in 毎), 犯 (犭 卩, as in 危). That brought back 25 words: the daily has 453 answers, and 146 Keep words are still left out.
- **Decided — The rest stay out:** the most common left-out kanji (事 13 words, 年 11, 中 8, 今 7, 以 6) are made of strokes. As whole tiles, most of their words would have under 4 parts (仕事 would have 3), so a new tile wouldn't bring them back.
- **Decided — Live before launch:** since PR #6 the live URL plays the daily (epoch 2026-11-01). It isn't linked anywhere; step 8 sets the real epoch, so puzzle 1 is launch day.

## Scoring (Decided, step 2)

Every guessed kanji is broken into parts (`data/parts.json` tiles with positions), and each part gets a mark. The engine is `js/engine/score.js`; `tests/score.test.js` covers every example here. These are the rules for a guess that is a kanji (the retired Easy, and each kanji scored on its own). Every level now guesses parts in writing order across the word, like letters ("The puzzle", above; `scoreOrder()`).

| Mark | Colour | Meaning |
|---|---|---|
| `hit` | Green (`--color-feedback-hit`) | The part is in the answer, in the same position |
| `near` | Yellow (`--color-feedback-near`) | The part is in the answer, in a different position |
| `other` | Yellow (`--color-feedback-other`) | Per-kanji scoring only: the part isn't in this kanji, but is in another kanji of the word |
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
- **Totals:** times the mode's multiplier, the level's (Normal 1, Hard 1.5, Guided 0.75, Guided · Hard 1.125) and daily 1 / keep playing 1 (it was practice 0.5), rounded at the end. Part points pay on a loss too.
- **Starting points:** 150.
- **Why these:** the user asked for more generous points than the first draft (5 / 2 / 50 + 15). A typical daily win pays about 145. Tune after playing.

### Powers in the engine

- **When:** `before` is before the first guess; `during` is after it, until the game ends. A power that would show nothing new can't be used.
- **revealParts:** parts not yet green, picked in a seeded order, so replaying a game gives the same parts.
- **eliminateParts:** the most-used tiles that aren't in the answer and aren't already ruled out.
- **revealKanji:** never fills the last unsolved kanji.
- **Free meaning:** after guess 3, set per mode (`freeMeaning` in `js/config/modes.js`; 0 shows it from the start), and only at a level with `freeMeaning` (only the retired Easy). It isn't a power, so a game that only used it is still clean and gets no 💡.
- **Bonus drops:** after a win, 30% (60% when solved in half the rows or fewer), weighted by each power's `drop`, skipping powers held at their limit.

### Dailies and stats

- **Puzzle number:** days since the epoch, by the local date. The epoch is `EPOCH` in `tools/compile_game.py`, written into `data/game/answers.json` with the answer order (`js/engine/daily.js` reads it). Set it to launch day at step 8, then never change it.
- **Answer order:** a fixed (seeded) shuffle of the Keep words. Days already played, up to tomorrow, are locked; later days are shuffled again on each compile, so new Keep words mix in evenly. When the list runs out it starts again from the top.
- **A year of dailies** needs 365 answers. The main list has 453 (step 4b).
- **Practice:** a random Keep answer, skipping the last 30 played in that mode (`rules.js` `practice.avoidRecent`).
- **Streak:** one streak across modes: days in a row with at least one daily won. A day not yet played doesn't break it. Streak rewards pay each time a run reaches their length.
- **Stats:** wins, fastest win, clean wins, Hard wins and kanji collected count practice too. Streaks count dailies only. Kanji collected counts every kanji of a solved word.
- **History entries** (`js/store.js`): `{ date, guesses, won, powers: [ids], answer, level }`, under the puzzle number for a daily, or `p` + a timestamp for practice. `guesses` holds words, or for parts guesses the tile ids per kanji, so `engine.guess()` can replay either.

## The palette (Decided, step 2)

Each puzzle shows a subset of the 251 tiles instead of all of them, like Wordle's keyboard. The engine is `js/engine/palette.js`.

- **What's in it:** every part of the answer, the six single strokes (`rules.js` `palette.always`), and random decoys up to the mode's `palette` size in `modes.js` (40) times the level's `paletteScale` (0.7): 28 keys ("Levels").
- **Guesses:** only kanji built entirely from the palette's tiles, typed ones included (`rules.js` `guessFromPalette`).
- **Same for everyone:** a daily's palette comes from its puzzle number.
- **Decoys:** picked by weight: how many jōyō kanji use the tile, plus 20× how many kanji it shares with a part of the answer (`rules.js` `decoyWeight`). Neighbours make more real kanji buildable.
- **Why 40:** tested on the real data, a 40-tile palette leaves about 190 buildable jōyō kanji per puzzle, about 75 of them N3 or easier. 30 tiles leaves about 115, which felt too tight.
- **The leak:** the answer's parts are always in the palette; with 34 decoys that gives little away.
- **Why:** the user asked for it, since 251 tiles is a lot to scan on a phone.

## Levels (Decided, step 4)

Step 3 had three levels picked on the start screen: Easy (guess a kanji from a strip), Normal and Hard (guess parts). After playing step 4, the user asked for one game for everyone, with order mattering, and two settings. Each mix of the Settings switches is a level in `js/config/levels.js` (`settingsLevel()`), so games, history and points keep a level id.

| Level | Hard | Guided | Points | What changes |
|---|---|---|---|---|
| Normal (the default) | off | off | ×1 | One row of cells, split hidden |
| Hard | on | off | ×1.5 | Guesses must make real kanji and use what's been found |
| Guided | off | on | ×0.75 | The split, places, frames and counts show; keys that can't go in the cell dim |
| Guided · Hard | on | on | ×1.125 | Both |

- **Decided — Easy is retired:** it worked as a kanji finder, not a part puzzle. Its level stays (`offered: false`) so old games still read; a game on the go at Easy starts again at the current level.
- **Decided — Level switches:** Hard and Guided are switches on the play card ("Screens and menus"), each with its points multiplier. They apply to the next puzzle, and to one not started yet; while a game is on they hide, since it keeps the level it started at. (Step 4 had them in Settings.)
- **Decided — Hard: real kanji, any split:** the parts, in order, must split into real jōyō kanji, any way (the answer's split isn't needed). The row shows the kanji they make, fewest kanji first (子女, 村日), hanging off its right edge. The rows sit a little left of centre to leave it room, so the cells can be bigger: the user picked 48 px cells over centred 32 px ones for a 6-part answer on a 402 × 780 phone (2026-11-08). Note: many tiles are kanji on their own (日, 木, 口), so this mostly turns away guesses with parts that can't stand or combine (亠 月).
- **Decided — Hard: use what's been found:** like Wordle's hard mode, every green stays in its cell, and every part found green or yellow is in the guess again, as many times as it was found ("二 stays in cell 1", "Use 土"). A part a power showed stays in its cell too ("日 stays in cell 2: a hint showed it there"; step 4b).
- **Decided — Guided:** shows each kanji's cells apart, their places (左 右) above them, a frame per kanji filled in with the parts found green, and how many kanji still fit under it. The keyboard dims the keys no jōyō kanji has in the selected cell's place (`tilesForPlace()` in `js/engine/palette.js`); dimmed keys keep their spot. The selected cell's place name lights up above the board, instead of a line above the keyboard, which cost the cells 26 px (the user's pick, 2026-11-08); screen readers still hear it as the keyboard's name.
- **Decided — The keyboard never changes:** the same 28 keys (`paletteScale` 0.7 of the mode's 40) in the same spots for the whole game, at every level, in stroke order. Keys show the best mark each part has had, like Wordle's keyboard.
- **Decided — Every row, like Wordle:** every row shows from the start, the cells as big as fit, and nothing beside them. The parts sit at the bottom as a keyboard, pinned there, with Delete and Guess closing its last row, as in Wordle. Hints open from a button in the head. While a game is on, the site header steps aside.
- **Proposed — Delete:** empties the selected cell, or when it's empty, the one before it (like a backspace).
- **Proposed — Selecting cells:** one cell of the next row is selected. A tapped part fills it, then the next empty cell is selected; tapping a cell selects it, so its part can be swapped.
- **Decided — Kanji frame (Guided):** a frame in each answer kanji's shape fills in with each part found green, in its place, whether by a guess or a power. A dot stands for each part still hidden. A solved kanji shows whole, on green.
- **Proposed — Frame layout:** top and bottom span the frame; left, inner and right share the middle; an outer part (門, 辶) covers it all, with the inner inset. A place with several parts stacks them (土 over 寸 for 時). Several outer or crossing parts (日 and 疋 around 頁 in 題, 一 and 亻 in 存) would pile up past the frame, so they take a column of the middle, before the inner (step 4b). The frames catch up once the row has flipped.
- **Decided — The board fits the screen:** the user found a narrow column in the middle of a phone a poor use of space, and asked for a board that scales to any number of kanji.
- **Proposed — How it fits (`fitBoard()` in `js/play/screen.js`):** cells take the largest layout-token size (64, 56, 48, 40, 32 or 24 px) whose rows fit the width on one line and, with the head, frames, place names, clues found and keyboard, the screen's height. For those cells, Guided's frames take the largest size that fits (64 or 56 px, `layout.frame`, `frameSm`), no wider than their kanji's cells. Keys are 40 px high (`layout.key`) and drop to 32 (`keySm`) only to keep cells from shrinking below 40 px (2026-11-08: the user found the cells too small and the frames too big). The power bar and a message float just above the keyboard, over the board's last rows, so they take no room; the message stays 3 seconds (`transition.message` in `tokens.js`). Hard leaves room on the right for the row's kanji. If even 24 px cells are too wide, rows wrap between kanji. It refits when the screen turns or resizes.

  | Cells (frames) | Normal | Hard | Guided | Guided · Hard |
  |---|---|---|---|---|
  | 402 × 780, 4–5 parts | 64 | 56–64 | 56 (64) | 48–56 (64) |
  | 402 × 780, 6 parts | 56 | 48 | 48–56 (56–64) | 40 (56–64) |
  | 375 × 667, 4–5 parts | 56 | 48–56 | 40 (64) | 40 (64) |
  | 375 × 667, 6 parts | 48 | 40 | 40 (56–64) | 32–40 (56–64) |

  Clues found cost room too: on the 375 × 667 phone, one clue keeps Normal's 6-part cells at 48 px, and three take Guided to 32.
- **Proposed — The keyboard's rows (2026-11-08):** the fewest rows of keys at least 32 px wide that leave room at the end for Delete (one key) and Guess (two or more), so the 28 keys and both buttons take 4 rows of 8 on a phone, where they took 5 rows.
- **Proposed — Clues above the keyboard (2026-11-08):** the clues found share lines, each named by its power's icon; the name stays for screen readers. Three clues take 2 lines, where they took 3 rows.
- **Decided — No page scroll in a game (step 4b):** while the keyboard is up, the site footer and the page's bottom padding step aside too, so the screen doesn't scroll under the player's thumb. The game fills the screen then, so the keyboard sits at the bottom even when the cells are as big as the width allows, and the board takes the middle of what's left (2026-11-08). The result card brings them back.
- **Proposed — Short place names:** over cells narrower than 40 px, places use short names (L, R, btm, out, in; Japanese is already one character).
- **Decided — Kanji that fit (`countLeft`, Guided):** under each kanji's frame, how many kanji still fit that slot: the same number of parts, buildable from the palette, none swept away or shown grey, the revealed strokes, layout and parts, a green part at that cell of the kanji's writing order and a part not green there not at it (`engine.fits()`).
- **Decided — Normal takes any parts:** they don't have to make a kanji.
- **Decided — No free meaning:** only the Meaning hint shows it (`freeMeaning: false`).
- **Decided — Layout hint:** useful at Normal and Hard; at Guided the board already shows the layout.
- **Proposed — Look-alikes:** parts that are exactly the answer's, in the same order, win, even when a look-alike shares them (未 and 末); the compile step keeps the 4 look-alike answers out anyway.
- **Proposed — One daily for every level:** one daily, whatever the level, so puzzle numbers and streaks are shared. A game keeps the level it started at (in its start, `save.playing`), and its history entry records it. A game with no moves yet moves to a level picked since.
- **Proposed — Sharing:** the share text names the level (`Kanjiru 漢 #7 Normal 3/6`), with one square per cell. The squares are split by kanji only where the board showed the split (Guided).
- **Proposed — How to play:** the example rows show 時間's five cells: 口 日 寸 木 月 (日 yellow, 寸 green), then 日 土 寸 日 門, then 時間 solved.
- **Open — Tuning:** 28 keys, 6 rows, the Hard and Guided points, what each part pays. All catalogue edits; decide after a few days of play.
- **Decided — No real-word check at Hard:** the parts must make real kanji, any split; the guess doesn't have to be a real word.
- **Decided — Hints under the new rules (step 4b):** Reveal a part, Head start and Reveal a kanji put the parts they show in their cells, green: each new row starts with them filled in (`engine.shownCells()`). At Normal the player may change one; at Hard it stays. Stroke count, Layout and Reveal a kanji give away where kanji split; they stay as paid hints, since that's what they're for. Meaning, Reading, Sweep and Extra guess need no change. Reveal a kanji is only offered when the answer has 2 or more kanji.
- **Decided — Meaning stays a hint:** no free meaning at any level for now (`freeMeaning: false`). If dailies feel too hard, showing it after guess 4 is a one-line change.

## Screens and menus (Decided, 2026-11-08)

The user asked for a layout overhaul: the header holds only Points and Settings, the main page is the game, and points get a page of their own.

- **Decided — The header:** the brand (it goes home), the points as a pill (it opens the Points page, `#points`) and the gear (Settings). Language and light/dark moved into Settings.
- **Decided — The play page is home:** a play card for the daily: the mode's numeral as a hanko seal (`layout.seal`, in the skin's action colour), Daily #N, a line for where it stands (ready, going, solved, lost), the Hard and Guided switches, and Play (Continue once a game is on). After the daily it offers Keep playing and See result, titles the switches "Level for your next puzzle", and counts down to the next one. The user picked a card with the switches on it over starting a game straight away.
- **Decided — How to play:** under the play card, the 時間 example with a legend of the three colours. It's open until the first game, then folded (a `<details>`).
- **Decided — The Points page (`js/points.js`):** the wallet, big, with how points are earned and three counts (hints held, daily streak, achievements earned). Then Looks: the current look on five tiles, colour swatches drawn in each skin's own colours on its own page colour, and chips for tile reveal and win effect. A locked one opens its details under its row (price, or the achievement and how far along you are) with a two-tap Buy; a bought look goes on at once. Then Hints & powers, each with what it does, when it can be used, how many you hold and Buy. Then Achievements with progress. Back goes home.
- **Decided — Settings:** Language (English / 日本語) and Appearance (Auto / Light / Dark; a one-scheme skin fixes it, with a note why), then Move your progress, then Debug. Step 8 adds About here.
- **Decided — Debug mode, on the live site too:** a switch in Settings (`settings.debug`). On, every key whose part is in the answer shows numbered dots, the answer's cells that part fills in writing order, so the dots spell the whole answer in order. It also adds an "Add 500 pts" button (`ECONOMY.debugPoints`), which writes a ledger entry of kind `debug`, so the points merge and count like any other. The user chose to show the switch everywhere rather than on test servers only.
- **Decided — Controls (`js/dom.js`):** `switchRow()` is a checkbox with `role="switch"`, drawn as a sliding toggle (a `layout.switch` track, a 16 px knob inset 4 px); the whole row toggles it. `segmented()` is a row of buttons with `aria-pressed` for one of a few.
- **Proposed — Two buttons in a row:** side by side when each fits on one line, otherwise stacked full width (the play card, the result card).
- **Proposed — Redraws keep their place:** a change in Settings redraws the page behind it and the panel itself, each at the scroll it had.

## The game screen (steps 3 and 4)

- **Reveal:** each new row flips tile by tile (`settings.tiles`; Flip for now, step 6 adds the rest). Off under reduced motion.
- **Hints:** the bar of powers, with the count held and the points to spend, floats just above the keyboard (step 5). It's open before the first guess, so the before-the-game powers are easy to find, and closes after a guess or a power used; the Hints button in the head opens it again and shows how many hints are held. Clues already found stay on show under the head. Tapping a power opens a sheet that says what it does and why it can't be used now, if so; when you hold none, Buy takes Use's place (Buy, then a confirm that names the price), and Use comes back after, with the focus on it. Using one spends it. Parts it shows fill their cells on the board too ("Levels", "Hints under the new rules").
- **Saving:** the game on the go is saved as its start and log after every move (`save.playing`), so a reload carries on. A finished daily is recorded to history and can't be played again; its result shows until the next daily.
- **Points:** paid once, when a game ends: what `engine.points()` gives, then the streak rewards a won daily reaches, a bonus hint (`engine.rollDrop()`) and any achievements (`js/play/rewards.js`, step 5). Each is a ledger entry ("Saving and devices").
- **Rewards on show:** the result card lists each reward and the new balance; each also shows as a toast (`transition.toast` in `tokens.js`), over sheets too. The points in the header rise with a small "+N pts" when you're back on the play page, and fall with "−N" when you buy. Under reduced motion they show without moving.
- **Result card:** the answer with its meanings, readings and parts, points, streak, the balance with a link to the Points page ("Spend them"), share text and a countdown to the next daily, with Keep playing (after the daily) or Next puzzle (after another one). A game from another device (merged in) shows without points, since only its guesses are known.
- **Readings:** kun readings show their okurigana muted (か + つ). KANJIDIC sometimes lists a reading both with and without it (か.つ and かつ for 勝; 47 kanji), so the one that marks the okurigana is kept (`uniqueKun()` in `js/play/hints.js`).
- **Share text:** the mode's numeral, the daily number, the level, the score (X when lost) and one square per part per guess (`rules.js` `share`). 💡 marks a game that used a power.
- **Modes:** `listed` in `js/config/modes.js` gives a mode a play card and `playable` says the screen supports it; a mode with no answers shows "soon". The card offers the daily first, then Keep playing once it's done.

## Hints, powers and points

- **Decided — Game-like:** random bonus hints, hints you can use before the game starts (reveal one or several parts), and points earned per guess that buy hints and powers.
- **Decided — Catalogue:** `js/config/powers.js`. Each power names an `effect` (revealStrokes, revealLayout, revealMeaning, revealReading, revealParts, eliminateParts, addGuesses, revealKanji) plus `params`, `when` (before / during), `cost`, `hold` and `drop`.
- **Decided — Point values:** `js/config/economy.js`, with the rules in "Scoring", "Points". Daily games pay more than practice, streak milestones pay a reward, and wins drop a random hint. Each mode multiplies its points.
- **Decided — Base rules:** only the Meaning hint shows the meaning ("Levels"). (The retired Easy showed it free after guess 3.)
- **Decided — Honest sharing:** the share text marks a game that used a power with 💡 (step 3).
- **Decided — Buying (step 5, moved 2026-11-08):** the Points page sells hints and locked looks ("Screens and menus"); step 5's shop sheet is gone, and `js/shop.js` keeps only the rules (`powerOffer()`, `skinOffer()`, `buyPower()`, `buySkin()`). A power's sheet in a game sells one too. Every purchase takes two taps, Buy then a confirm with the price and what's left. Prices and hold limits come from `powers.js` and `skins.js`.
- **Decided — Achievements (step 5):** checked after every game and when the page opens, each paid once with its reward (points, a hint, or the look it unlocks), shown as a toast and listed on the Points page with progress. A hint reward may take you past the hold limit. Full set (every daily mode in a day) meant only a daily won with one mode, so it's retired (`retired: true`: never earned again, saves keep it) and **Hard win** (solve with Hard on, 200 pts) takes its place.
- **Open — Japanese mode:** the 意味 (Meaning) hint shows the English gloss, because the dictionary data is English only. For native speakers, the reading or example words may suit better.

## Skins

- **Decided — Tiers:** basic skins first (light, dark and a few colours), then elegant ones with animations and effects.
- **Decided — Slots:** colours (`theme`), tile reveal (`tiles`) and win effect (`effect`), mixed freely. The catalogue is `js/config/skins.js`; the colours live in `tokens.js` `THEMES`.
- **Free:** Classic, Ai 藍, Matcha 抹茶 and Sakura 桜, each light and dark; Flip tiles; None or Brush draw effect.
- **Locked:**
  - Urushi 漆 (800 pts, dark only) and Kinpaku 金箔 (30-day streak)
  - Ink bleed tiles (400 pts) and Hanko stamp tiles (7-day streak)
  - Petal fall (600 pts) and Hanabi 花火 (solve in 2 guesses)
- **Coming soon:** Ink bleed, Hanko, Petal fall and Hanabi aren't built yet (step 6), so they're marked `soon` in `skins.js`: the Points page doesn't sell them, and an achievement that unlocks one still does, ready for when it's built.
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
| Points and hints held (`ledger`) | Both sets of entries kept, joined by id, so each game, reward and purchase counts once and points add up exactly. A device's starting points join only when neither has progress |
| Looks, language and level (`settings`) | This device's stay |
| Games on the go (`playing`) | This device's stay; a daily the other device finished is in history, which wins |

- **Rule:** a new top-level key in the save needs a merge rule; `validate()` warns when one is missing.
- **Decided — Ledger (step 5):** points and hints held are a ledger (`js/ledger.js`, save v2): every gain and spend is an entry with its own random id (`why`: start, game, streak, drop, achievement, buy, use, debug for points added in debug mode, or v1 for what a v1 save held), and the balance is their sum, never below 0. Merging joins the entries, so it's exact and safe to repeat. A v1 save's wallet and hints become one `v1` entry; two devices that each had one keep the higher, as v1 merges did.
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
- **Hand fixes:** 20 kanji in `data/parts-overrides.json`: 万 三 円 年 実 寒 声 勤 無 舞 (step 1) and 重 動 種 産 着 表 平 号 母 犯 (step 4b).

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
- **Clumsy breakdowns:** 150 one-kanji candidates still have single-stroke parts, and a few have several (乗, 呼, 段, 喜, 候). Words with a loose stroke stay out of the daily ("The puzzle"). Flag them on the parts check page, then fix them in `data/parts-overrides.json`.
- **Phones:** check `review/parts.html` on iOS and Android to confirm which glyphs need the drawings.

## Hosting

- **Live:** https://www.ryanrwang.com/apps/kanjiru/ (also clearful.net). Each push to `main` deploys by FTPS (`.github/workflows/deploy.yml`).
- **Not deployed:** `tools/`, `review/`, `tests/`, `package.json`, the data working files and `*.md`. The game loads `data/game/` and `data/parts.json`.
- **Local:** `php -S 0.0.0.0:8095 -t D:/Dropbox/Clearful` on the PC, or `php -S 0.0.0.0:8099 -t ~/kanjiru-test` on the Mac, then open `/apps/kanjiru/`.
- **Apps page:** not listed on `/apps/` yet; add it at launch.
