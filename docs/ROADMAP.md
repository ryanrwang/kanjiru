# Kanjiru roadmap

The big steps from here to launch, in order, each with a prompt to start its own thread in `D:\Dropbox\Clearful\apps\kanjiru`. Tick a step off here when it merges.

Last updated: 2026-11-08.

## Done

- [x] **Scaffold:** design tokens and skins, catalogues, versioned save, start screen, deploy. Live at https://www.ryanrwang.com/apps/kanjiru/
- [x] **Word data:** 5,647 candidates at N3 or easier, the review page, and the EN/JP toggle (PR #1)
- [x] **Parts & palette:** 251-tile palette in `data/parts.json`, fixed part breakdowns with positions, hand fixes in `data/parts-overrides.json`, and the parts check page (step 1)
- [x] **Device transfer:** one-time codes from `api/transfer.php`, the Settings panel (gear in the header), Merge both or Replace this device, and copy/paste save text (step 7, PR #3)
- [x] **Engine:** scoring, game state and every power, the per-puzzle palette, dailies, stats and achievements in `js/engine/`; `tools/compile_game.py` writes `data/game/`; 71 engine tests and 12 compile tests (step 2)
- [x] **Game screen:** the one-kanji daily and practice in `js/play/`: board with flip reveal, parts palette, saved games, powers, points paid, result card with share text and countdown. Three levels (`js/config/levels.js`): Easy guesses kanji from a strip with a free meaning; Normal (the default) and Hard guess parts only, one per cell, with each cell a place in the kanji so parts go green or yellow. Normal has fewer tiles and counts the kanji that still fit; Hard's parts must make a real kanji (step 3, PR #5)
- [x] **One daily of 4–6 parts:** one `main` mode whose answers are 1–4 kanji with 4–6 parts in all; k1–k4 retired. One game for everyone: the parts in writing order, like Wordle's letters, with the split between kanji hidden. Settings switches: Hard (real kanji, use what's found) and Guided (split, places, frames, dimmed keys). Easy retired. A Wordle-style screen with a fixed 28-key keyboard pinned to the bottom. Keep playing after the daily, for full points. Claude's first word review: 603 Keep words (step 4)
- [x] **Loose strokes and hints:** answers with a loose single stroke (丨 丶 丿 乙 亅) leave the daily (`LISTS` `without`); 10 kanji fixed in `data/parts-overrides.json` bring back 25 words, so the daily has 453 answers. Parts a power shows (Reveal a part, Head start, Reveal a kanji) fill their cells, green, on each new row, and stay put at Hard. No page scroll while playing (step 4b)

## Order

```
1 Parts & palette ✓ ──► 2 Engine ✓ ──► 3 Game screen ✓ ──► 4 One daily ✓ ──► 4b Loose strokes & hints ✓
                                          ├──► 5 Points, shop & achievements
                                          ├──► 8 Launch
                                          └──► 6 Skin effects (after launch)
7 Device transfer  ✓ done
You: review words  (any time; the game only uses words marked Keep)
```

- **Next:** step 5, then 8. Step 6 can wait until after launch. Tune the numbers (rows, keys, hint prices, points) after real play, not before.
- **Words:** 453 daily answers from 603 Keep words are enough for launch (about 1.2 years). More can be added any time on the review page, then `tools/compile_game.py`. 146 Keep words with loose strokes come back as their kanji are fixed.

**Running threads at the same time:** every thread shares this one folder, and Git can only have one branch checked out in it. Two threads in the same folder will switch each other's branches. So either run one thread at a time, or start each one in its own worktree (the app's worktree option when you start a session).

---

## 1. Parts & palette

**Why first:** guess scoring is only as good as the part breakdowns, and the palette is what players tap.

```
Kanjiru step 1: fix the part breakdowns and build the parts palette.

Read CLAUDE.md, docs/DESIGN.md (especially "Part breakdowns: known problems") and docs/ROADMAP.md first. Work on a new branch.

Goal: every jōyō kanji gets a clean list of parts with positions the game can score, plus the palette of parts players pick from.

1. Propose the palette: the components players tap (aim for 150–250), each with a display glyph, stroke count and the variant forms it covers. Recommend whether variants (氵/水, 亻/人, 扌/手, 月/肉) count as the same part for scoring, and why.
2. Fix the known problems in tools/build_data.py, by rule where possible and with a hand-edited data/parts-overrides.json for the rest: loose strokes (本/未/末 → 木), enclosure contents marked none (国, 間 → inner), positions relative to a subgroup (命, 歯), parts with no position (上, 中, 東), unprintable CDP-… names (原, 願, 武, 源), and split parts (裏, 衷, 主).
3. Recommend the decomposition depth (語 = 言 + 吾, or 言 + 五 + 口?) against the palette, and how atomic answers (金, 車, 雨) should work, or whether they leave the answer pool.
4. Check which palette glyphs fail to render in Noto Sans/Serif JP and on iOS/Android system fonts, and propose a fallback (e.g. KanjiVG stroke SVGs for those parts).
5. Write data/parts.json (the palette), update the parts in data/candidates.json, and show the result on the review page, including the kanji I flagged (data/review.json → parts).

Ask me before the big choices (variants, depth, atomic answers). Done when every N3-or-easier kanji has parts that render, positions from the fixed set, and rules documented in tools/README.md and docs/DESIGN.md, and I've checked a sample on the review page.
```

## 2. Game engine

**Needs:** step 1's parts format.

```
Kanjiru step 2: build the game engine as pure, tested JavaScript, with no UI yet.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Step 1 (parts & palette) is merged; use data/parts.json and the parts in data/candidates.json. Work on a new branch.

1. Scoring rules first: write the exact rules in docs/DESIGN.md and confirm them with me before coding. Cover per-part green/yellow/grey with positions, repeated parts (like Wordle's repeated letters), variant forms, and for 2–4 kanji: per-slot colours plus "this part is in another kanji of the word".
2. js/engine/score.js: the scoring.
3. js/engine/game.js: game state (rows, guesses left, win/lose), every power effect in KNOWN_EFFECTS (js/registry.js) driven by js/config/powers.js, and points from js/config/economy.js.
4. js/engine/daily.js: date → puzzle number → answer per mode, the same for everyone, rolling over at local midnight; random answers for practice.
5. js/engine/stats.js: streaks and stats worked out from the save's history, and the achievement check from js/config/achievements.js.
6. A compile step (extend tools/build_data.py or add tools/compile_game.py) writing the slim files the game loads: answers per mode from the words I marked Keep in data/review.json, in a fixed shuffled order, and kanji info for every guessable kanji. Keep an eye on file size, and update deploy.yml so these files deploy.
7. Tests with node --test (no dependencies), with plenty of scoring edge cases.

Done when the tests pass, the rules are in docs/DESIGN.md, and nothing in the engine hard-codes a mode, power or number.
```

## 3. Game screen

**Done** (step 3). The game screen is `js/play/`. After playing it, the user asked for levels: the prompt below is Easy, and Normal and Hard guess parts only (docs/DESIGN.md, "Levels").

```
Kanjiru step 3: build the playable game screen for the 1-kanji daily and practice, on top of the engine in js/engine/.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Work on a new branch.

1. Board: one row per guess, showing the guessed kanji and its part tiles in their colours. The settings.tiles reveal style can start as a simple flip.
2. Parts palette: the puzzle's own tiles (state.palette from js/engine/game.js, 40 for one kanji), grouped by stroke count. Picking parts greys out parts that can't combine and narrows a strip of matching kanji, easiest first (narrow() in js/engine/palette.js); tapping one makes the guess. Also accept a kanji typed with a Japanese keyboard, if the palette can build it. Turned-away guesses return a code (over, length, not-kanji, not-in-palette, repeat): give each its text.
3. Hints: the free meaning after guess 3, and the powers in the player's inventory (before and during the game).
4. Result card: the answer with its meanings, readings and parts; points earned; streak; share text (daily number + emoji grid, with 💡 if hints were used); a countdown to the next daily; play practice.
5. On the start screen, k1 becomes playable. Other modes show "soon" until they have engine support and reviewed words.
6. Text through t() in English and Japanese, tokens only, phone first, reduced motion respected. Results save to history with engine.record() under daily.js historyKey(); a finished daily can't be replayed. Save the game in progress as its start and log (engine.replay rebuilds it).
7. Load the data with loadData() from js/engine/data.js. With no Keep words compiled yet, dailies are null: show "soon", and use a few test answers locally (never commit them).

Done when a full daily and a practice game play well on phone and PC (check both on the local server's LAN link) and nothing is hard-coded.
```

## 4. One daily of 4–6 parts

**Done** (step 4). It replaced the first plan, "Longer words (2–4 kanji)": after playing, one kanji had too few parts to feel like Wordle, so the user chose one daily whose answer has 4–6 parts in 1–4 kanji (docs/DESIGN.md, "The puzzle").

Settled after it: no real-word check at Hard, and the meaning stays a hint (docs/DESIGN.md, "Levels"). Still open, for later:
- **More words:** 2,389 common two-kanji words with 4–6 parts aren't on a JLPT list; many are worth keeping.
- **Tuning:** rows, keys, the Hard and Guided points, after a few days of play.

## 4b. Loose strokes and hints

**Done** (step 4b). The 5 most common left-out kanji (事 年 中 今 以) stay out: they're made of strokes, and as whole tiles their words would have under 4 parts (docs/DESIGN.md, "The puzzle").

```
Kanjiru step 4b: loose strokes out of the daily, and hints that fit the new rules.

Read CLAUDE.md, docs/DESIGN.md ("The puzzle", "Levels") and docs/ROADMAP.md first. Steps 1–4 are merged. Work in a new worktree on a new branch.

1. Loose strokes: in tools/compile_game.py, let a LISTS rule leave out answers with a part in a set of tiles, and leave 丨 丶 丿 乙 亅 out of "main" (not 一). The summary says how many were left out. Words stay Keep. Add compile tests. Recompile and commit data/game/.
2. Then list the left-out words whose breakdowns are worth fixing first (most common), and propose fixes for data/parts-overrides.json. Confirm them with me before changing data.
3. Reveal a part and Head start: show each revealed part in its cell, green, on the board (the next row starts with it filled in, like a green you found), not just as a name in the clues. Check Hard's "use what you found" still makes sense with it.
4. Check every power against the new rules (docs/DESIGN.md, "Hints under the new rules") and say which, if any, should change.

Done when the daily has no loose-stroke answers, revealed parts sit in their cells, and node --test and the tools tests pass.
```

## 5. Points, shop & achievements

**Needs:** step 3.

```
Kanjiru step 5: make the points economy real.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Work on a new branch.

1. Earning: a game's points (engine.points()) are already paid into the wallet when it ends (js/play/session.js finish()). Add streak rewards (streakRewards() in js/engine/stats.js), all from js/config/economy.js.
2. Random bonus hint drops after a win (engine.rollDrop() picks one, weighted by each power's drop value, respecting hold limits).
3. A shop: buy powers and locked skins with points, with confirm steps and clear prices in both languages.
4. Powers already work in game from the power bar (js/play/hints.js), spending the inventory; make them easy to find before the first guess. The open power bar pushes the page into a scroll (70 px at 402 × 780, 29 px at 375 × 667), since fitBoard() doesn't count it: make it float like the game message, or count it.
5. Achievements checked after each game (stats() and newAchievements() in js/engine/stats.js), with a toast, their rewards, and the skins they unlock. With one daily mode, "Full set" (every daily mode won in a day) now just means winning the daily: replace or retire it.
6. Show balance changes clearly (a small +points animation that respects reduced motion).

Done when a new player can earn, buy and use a hint and unlock a skin end to end, and every number still comes from js/config/.
```

## 6. Skin effects

**Needs:** step 3 (the board and result card exist).

```
Kanjiru step 6: build the fancy skins.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Work on a new branch.

1. Tile reveal styles keyed by settings.tiles: Flip (a basic one is in styles.css, `tile-flip`), Ink bleed (ink spreading through the tile) and Hanko stamp (pressed like a seal).
2. Win effects keyed by settings.effect: Brush draw (the answer drawn stroke by stroke from KanjiVG; add stroke paths for answer kanji to the data build, keeping size in check), Petal fall and Hanabi.
3. Textures for Urushi (lacquer sheen) and Kinpaku (gold-leaf shimmer).
4. Previews in the Looks picker on the start screen.
5. Structure it so a new effect is one catalogue entry plus one small module or CSS block.
6. Smooth on a mid-range phone, and off under prefers-reduced-motion.

Done when every skin in js/config/skins.js has its real look and effect and can be previewed.
```

## 7. Device transfer

**Done** (PR #3). It touched `api/`, a settings panel and `js/store.js`.

```
Kanjiru step 7: let players move their progress to a new device with a one-time code.

Read CLAUDE.md, docs/DESIGN.md ("Saving and devices") and docs/ROADMAP.md first. Work on a new branch.

1. api/transfer.php (Bluehost shared PHP; check which PHP version and extensions it has):
   - POST a save → a 6-character code with no look-alike characters.
   - Store it in a folder blocked from the web (.htaccess deny, gitignored, excluded from deploy).
   - Expire it after 15 minutes and delete it on first read.
   - Cap the size, add a simple per-IP rate limit, and return JSON errors.
2. A settings panel: "Send to another device" shows the code (a QR code is optional); "Receive" takes a code and asks before replacing anything. Also offer copy/paste of the save text as a backup.
3. Propose replace vs merge (joining histories and recounting streaks) and confirm with me. Use exportSave/importSave in js/store.js.
4. Text in English and Japanese.

Done when a save moves from PC to phone on the local server, and again on the live site after deploy.
```

## 8. Launch

**Last.**

```
Kanjiru step 8: get it ready to launch.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Work on a new branch.

1. An About / credits screen in both languages. EDRDG asks for KANJIDIC and JMdict credit with links on a screen of its own; also credit KanjiVG and Jonathan Waller (see data/ATTRIBUTION.md).
2. Home-screen install (web app manifest and icons, a basic service worker if it helps) so iOS Safari's 7-day storage wipe can't erase saves. Mention the transfer code as a backup.
3. Share previews (Open Graph and Twitter tags, a share image).
4. Accessibility: keyboard play, screen reader labels, and contrast in every skin and both schemes.
5. Performance: first load on a phone, data file sizes (data/game/kanji.json is about 82 KB gzipped), font loading.
6. Add Kanjiru to the Apps page: apps/index.html in the Clearful repo, which is a separate repo; read D:\Dropbox\Clearful\.claude\github-deploy.md first.
7. Set EPOCH in tools/compile_game.py to launch day, recompile, and commit data/game/ (puzzle 1 = launch day). Dailies are saved under their puzzle number only, so testers' pre-launch games would mark launch-day puzzles as played: bump VERSION in js/store.js with a migration that moves pre-launch history (main dailies and the retired k1–k4 games) aside.

Done when it installs to a phone's home screen, passes the accessibility checks, and is listed on /apps/.
```

---

## Your task: review words

Open http://localhost:8095/apps/kanjiru/review/ with the local server running:

```
php -S 0.0.0.0:8095 -t D:/Dropbox/Clearful
```

- **Done so far:** Claude's first pass, at your request: 603 Keep and 15 Cut, all with 4–6 parts (docs/DESIGN.md, "The puzzle"). Change any of them here.
- **Next:** the common words with 4–6 parts that aren't on a JLPT list. Only words with 4–6 parts and no loose single stroke (丨 丶 丿 乙 亅) can be dailies.
- **Start easy:** filter by length and "N5"/"N4"/"N3" to begin with the easiest words.
- **Bulk keep:** "Keep all pending on this page" speeds it up.
- **Flag parts:** use ⚐ on any kanji whose parts look wrong. The parts check page (`review/parts.html`) shows every kanji's parts and the palette. The build lists flagged kanji, and fixes go in `data/parts-overrides.json`.
- **Saving:** decisions save to `data/review.json`. Commit that file with the next push so it's kept in Git.
