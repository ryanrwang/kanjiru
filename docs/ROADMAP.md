# Kanjiru roadmap

The big steps from here to launch, in order, each with a prompt to start its own thread in `D:\Dropbox\Clearful\apps\kanjiru`. Tick a step off here when it merges.

Last updated: 2026-11-11.

## Done

- [x] **Scaffold:** design tokens and skins, catalogues, versioned save, start screen, deploy. Live at https://www.ryanrwang.com/apps/kanjiru/
- [x] **Word data:** 5,647 candidates at N3 or easier, the review page, and the EN/JP toggle (PR #1)
- [x] **Parts & palette:** 251-tile palette in `data/parts.json`, fixed part breakdowns with positions, hand fixes in `data/parts-overrides.json`, and the parts check page (step 1)
- [x] **Device transfer:** one-time codes from `api/transfer.php`, the Settings panel (gear in the header), Merge both or Replace this device, and copy/paste save text (step 7, PR #3)
- [x] **Engine:** scoring, game state and every power, the per-puzzle palette, dailies, stats and achievements in `js/engine/`; `tools/compile_game.py` writes `data/game/`; 71 engine tests and 12 compile tests (step 2)
- [x] **Game screen:** the one-kanji daily and practice in `js/play/`: board with flip reveal, parts palette, saved games, powers, points paid, result card with share text and countdown. Three levels (`js/config/levels.js`): Easy guesses kanji from a strip with a free meaning; Normal (the default) and Hard guess parts only, one per cell, with each cell a place in the kanji so parts go green or yellow. Normal has fewer tiles and counts the kanji that still fit; Hard's parts must make a real kanji (step 3, PR #5)
- [x] **One daily of 4–6 parts:** one `main` mode whose answers are 1–4 kanji with 4–6 parts in all; k1–k4 retired. One game for everyone: the parts in writing order, like Wordle's letters, with the split between kanji hidden. Settings switches: Hard (real kanji, use what's found) and Guided (split, places, frames, dimmed keys). Easy retired. A Wordle-style screen with a fixed 28-key keyboard pinned to the bottom. Keep playing after the daily, for full points. Claude's first word review: 603 Keep words (step 4)
- [x] **Loose strokes and hints:** answers with a loose single stroke (丨 丶 丿 乙 亅) leave the daily (`LISTS` `without`); 10 kanji fixed in `data/parts-overrides.json` bring back 25 words, so the daily has 453 answers. Parts a power shows (Reveal a part, Head start, Reveal a kanji) fill their cells, green, on each new row, and stay put at Hard. No page scroll while playing (step 4b)
- [x] **Points, shop & achievements:** points and hints held are a ledger (save v2), so merging devices adds them up exactly. A finished game pays its points, streak rewards, a bonus hint and achievements, shown on the result card and as toasts. The shop opens from the points in the header: hints and locked looks, two taps to buy. The power bar floats above the keyboard, open before the first guess. Hard win replaces Full set (step 5)
- [x] **Launch prep, off screen:** home-screen install (manifest, icons, iOS tags) and a network-first service worker for offline play; share previews with a 1200 × 630 image; first load on a phone from 2.9 s to 1.6 s to the daily (scripts and data fetched at once, gzipped data, a smaller font stylesheet); and dailies from an earlier epoch become keep-playing games, so launch day is one line and a recompile (step 8a)
- [x] **Players' feedback, round 1 (2026-11-10):** end a game at any time (Give up, or New puzzle), reset achievements, delete all data behind three asks, a diagonal line across keys not in the answer, an animated How to play (open for a new player, folded after a game), every game played under the play card, and 8 colours, 8 tile reveals and 8 win effects, all playing in the game (this was step 6)
- [x] **Hint overhaul:** a hints pill in the header (漢 › Play in a game) opens a modal: each hint, how many you hold and Use, with one more confirm. Every hint plays its own animation (正 tally strokes, a splitting layout, a brush-written meaning, parts dropping into cells, a sweep across the keys). One kanji guide frame per kanji holds strokes, layout and solved kanji; new rows show revealed parts faintly instead of filling them in. End game moves to the header flag. Meaning in Japanese for all 460 answers. Reading retired, Head start folded into Reveal a part (any time). The Points page lists hints one per row with Buy and Don't ask again (2026-11-10)
- [x] **Header and pages (2026-11-10):** 漢 and Back to start work again (a variable hid `window.history`); every header control is the same bordered pill; Points and Settings are pages with Close at the top right; How to play always above the play card and about a third quicker; the install tip folded at the bottom of the play page
- [x] **Parts audit (2026-11-10, PR #17):** after native players' feedback, every tile mapped to its Kangxi radical, display forms such as 𠆢 and 丷, 12 new tiles (263), and 273 kanji re-split (`docs/PARTS-AUDIT.md`). Adds `tools/build_data.py --parts-only`
- [x] **Audit fixes (2026-11-11):** a full audit (web app practice, accessibility, tokens, phones and desktop, saving, security). Fixed: two tabs writing over each other's save (`store.sync()`), an unreadable save kept aside, the browser asked to keep the save only after a game, page moves that set the tab title, tell screen readers and carry the keyboard's focus, tiles that keep their colours in Windows' contrast themes, Settings heading levels, look cards named by their text, 24 px credit links, a no-JavaScript line, notch gutters, iOS text sizing, a dangling token, an idle timer, and a tighter `api/transfer.php` (IPv6 /64 rate limit, a 50 MB cap, same-site only, stricter saves). The follow-ups are step 9
- [x] **Screens and menus:** the header holds only Points and Settings. The play page is home: a play card with the Hard and Guided switches, then How to play. The Points page holds the wallet, Looks with previews, Hints & powers and Achievements, and replaces the shop sheet. Settings gains Language, Appearance and a Debug mode (answer dots on the keys, add points) (2026-11-08)
- [x] **Motion polish (2026-11-11):** smooth, quick moves between states, every one a token: pages slide in and out like an iPhone's, modals rise in and fade out, folds ease open and shut, switches slide, a new look or language crossfades, hovers only on a mouse (step 9.1, item 3) with lifts on cards, presses on buttons and keys, a typed part pops (docs/DESIGN.md, "Motion")
- [x] **Desktop polish (2026-11-11):** after a desktop audit, the user chose subtle changes over a side-by-side layout (the audit, with screenshots: https://claude.ai/artifact/Hp7jxsihRcY5wZRNZ5q4CM). With a mouse: parts typed on the keyboard (each key shows its letter, Q to [, A to ', Z to N; `js/play/keys.js`), keys 48 px, the kanji guide at the hint card's 96 px and cells 80 px where they all still fit, a lifting guide frame with a clearer tooltip, Enter for New game and Esc for Done once the result has arrived, and a line in How to play. On every screen: the whole screen dims behind a modal. Replaces 9.3.4; 9.3.3 is now for phones on their side only
- [x] **Native audit (2026-11-12):** the answers and parts read as a native kanji expert (`docs/NATIVE-AUDIT.md`; the report: https://claude.ai/artifact/G3y65AgCHkiqvVWZYByYUR). 52 kanji re-split (茶 母 曜 感 常 周 令 成 …), green cells show the answer's form, the single strokes are keys only at Hard, 442 answers (bound forms such as 景 漢 院 out), and hand-written English meanings and jōyō readings
- [x] **Apps page card (2026-11-11, Clearful PR #11):** Kanjiru is listed on https://www.ryanrwang.com/apps/ (and clearful.net), with an 800 × 600 dark screenshot of a game in progress, `images/gallery/apps/kanjiru.webp` (item 4 of step 8b)

## Order

```
1 Parts & palette ✓ ──► 2 Engine ✓ ──► 3 Game screen ✓ ──► 4 One daily ✓ ──► 4b Loose strokes & hints ✓
                                          ├──► 5 Points, shop & achievements ✓
                                          ├──► 8a Launch prep ✓ ──► 8b Launch
                                          └──► 6 Skin effects ✓ (2026-11-10)
7 Device transfer  ✓ done
You: review words  (any time; the game only uses words marked Keep)
```

- **Next: the MVP launch (2026-11-10).** Left to do:
  1. Merge branch `launch-polish`: the end of a game glides to the result, the answer atop a lost game's card, the same header in a game, the back-to-apps mark on the play page only; then every save reset once (save v3), a language picker on the first visit and a tip at the gear after it, a 60-point welcome bonus card leading to the hints, a hints pill that stands out, debug mode hidden (8 taps on About's title, on or off), folds in Settings, no sideways shift, an eighth achievement, End game under the keyboard, cells grouped by kanji once the split is known, a lost game's answer at the board's tile size, the page dimmed but the hints pill while the welcome card shows, a shake and a reason under the row for a guess that can't be made, look cards of one height, and round Layout dots (docs/DESIGN.md has each).
  2. ~~The Apps page card (item 4 of step 8b).~~ Done 2026-11-11 (Clearful PR #11).
  3. Check the install on a real iPhone and Android phone once it's live.
  Tune the numbers (rows, keys, hint prices, points) after real play, not before.
- **Next: step 9, the audit follow-ups (agreed 2026-11-11).** Four PRs, planned in full below. On hold until the user's weekly usage resets; start with 9.1 when the user says go.
- **No dailies (2026-11-09):** the user chose random puzzles only, as many as you like, so there's no launch date (docs/DESIGN.md, "No dailies").
- **Words:** 460 answers from 603 Keep words are enough for launch. More can be added any time on the review page, then `tools/compile_game.py`. 114 Keep words with loose strokes come back as their kanji are fixed.

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

**Done** (step 5). Points became a ledger so a merge adds them exactly (docs/DESIGN.md, "Saving and devices"), the shop opens from the points in the header, and Hard win took Full set's place.

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

**Done** (2026-11-10), with the players' feedback: eight of each look, every tile reveal on the board and every win effect over it (docs/DESIGN.md, "Skins").

```
Kanjiru step 6: build the fancy skins.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Work on a new branch.

1. Tile reveal styles keyed by settings.tiles: Flip (a basic one is in styles.css, `tile-flip`), Ink bleed (ink spreading through the tile) and Hanko stamp (pressed like a seal).
2. Win effects keyed by settings.effect: Brush draw (the answer drawn stroke by stroke from KanjiVG; add stroke paths for answer kanji to the data build, keeping size in check), Petal fall and Hanabi.
3. Textures for Urushi (lacquer sheen) and Kinpaku (gold-leaf shimmer).
4. The Points page already plays an example of every look (sketches in styles.css for the unbuilt ones): keep each true to the real effect.
5. Structure it so a new effect is one catalogue entry plus one small module or CSS block.
6. Smooth on a mid-range phone, and off under prefers-reduced-motion.

Done when every skin in js/config/skins.js has its real look and effect and can be previewed, and none is still marked `soon` (the Points page won't sell a `soon` skin, and one an achievement unlocks can't be used until it's built).
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

Step 8 was split in two, so the half that doesn't touch the screens could run while the screen layout overhaul (branch `screen-polish`) reshaped them.

### 8a. Launch prep, off screen

**Done** (step 8a). What it left in place:
- **Install:** `manifest.webmanifest`, `icons/` (drawn by `tools/make_images.py` from `favicon.svg`), and the iOS tags in `index.html`'s `<head>`. iOS's status bar stays `default`; `black-translucent` would need the header to pad for `env(safe-area-inset-top)`.
- **Service worker:** `sw.js`, registered by `js/service-worker.js`. Network first for everything, a kept copy only when the network fails, and never `api/` or `review/`. Browsers allow it on https and localhost only, so the phone's LAN test link runs without it. The app's browser pane can't run service workers either; test them in Chrome.
- **Share previews:** Open Graph and Twitter tags, and `icons/share.png` (1200 × 630).
- **Performance:** measured on a simulated phone (150 ms, 4 Mbps, gzip): the daily showed at 2.9 s, now 1.6 s; first paint 0.9 s, now 0.75 s. The scripts came in 4 to 8 waves of imports, then the data; now `<link rel="modulepreload">` and data preloads fetch them all at once (`tests/head.test.js` keeps the list in step with the imports). The app's `.htaccess` gzips the JSON (340 KB → 100 KB) and has it rechecked on every visit, so a recompile reaches phones at once. The font stylesheet asks for weight ranges: 60 KB instead of 150. The data now arrives before the scripts, so slimming it further wouldn't pay.
- **Launch day:** `settleDailies()` in `js/store.js` turns a daily from another epoch into a keep-playing game, on load and on receiving a save (docs/DESIGN.md, "Dailies and stats").

### 8b. Launch

**Needs:** step 8a, and the screen layout overhaul merged.

**Progress (2026-11-08):** items 1–3 are on branch `launch`: the About page (`js/about.js`, from Settings and the result card), the install tip (`js/install.js`, on the play page and in Settings), keyboard play and screen reader text in the game, and WCAG AA contrast in every look (docs/DESIGN.md, "Accessibility"). Still to do: check the install on a real iPhone and Android phone once it's live, then items 4 and 5 on launch day.

**No dailies (2026-11-09):** for 3–5 people playing now and then, the user dropped the daily: every game is a random puzzle, and the streak is wins in a row. So item 5 and "Launch day, ready to run" steps 1–3 are dropped (PR #14, the epoch for 2026-11-10, was closed). Launching is item 4, the Apps page card, whenever the user wants; its h3 reads "A Kanji Word Puzzle".

**Launch day, ready to run** (steps 1–3 only if dailies come back):
1. In `tools/compile_game.py`, set `EPOCH = "YYYY-MM-DD"` to launch day, then run `python -I -X utf8 tools/compile_game.py`; on the day it prints "today is puzzle 1".
2. Run `node --test` and `python -I -X utf8 -m unittest discover -s tools`, commit `tools/compile_game.py` and `data/game/`, and merge to `main` that day (the deploy takes under a minute).
3. Check https://www.ryanrwang.com/apps/kanjiru/ shows Daily #1, and that `data/game/answers.json` there has the new epoch.
4. **Done 2026-11-11** (Clearful PR #11, squash `2bee27f`; the card went in with h2 "Kanjiru" and alt "Kanjiru kanji word puzzle app"). Apps page, in the Clearful repo (read `D:\Dropbox\Clearful\.claude\github-deploy.md` first): the user uploads an 800 × 600 `images/gallery/apps/kanjiru.webp` by FTP (a dark screenshot, like the other apps' cards), then a card goes into `apps/index.html` before Return to Top: `href="kanjiru/"`, `id="kanjiru"`, alt "Kanjiru kanji puzzle app", h2 "Kanjiru 漢じる", h3 "A Kanji Word Puzzle". The file mixes CRLF and LF, so keep its endings. Compare with the server first (`verify-live`), then branch, PR and squash-merge, and check `/apps/` on both domains.

```
Kanjiru step 8b: launch.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first (step 8a's notes are under "8. Launch"). Work in a new worktree on a new branch.

1. An About / credits screen in both languages. EDRDG asks for KANJIDIC and JMdict credit with links on a screen of its own; also credit KanjiVG and Jonathan Waller (see data/ATTRIBUTION.md). Put it where the new layout has room (Settings or the Points page).
2. An install tip: how to add Kanjiru to the home screen on iOS and Android (iOS Safari wipes a site's storage after 7 days without a visit; a home-screen app keeps it), with the transfer code and save text as a backup. Skip it when already installed (display-mode: standalone). Check the install on the live site on an iPhone and an Android phone.
3. Accessibility: keyboard play, screen reader labels, and contrast in every skin and both schemes.
4. Add Kanjiru to the Apps page: apps/index.html in the Clearful repo, which is a separate repo; read D:\Dropbox\Clearful\.claude\github-deploy.md first.
5. Launch day: ask me the date. On that day, set EPOCH in tools/compile_game.py to it, run python -I -X utf8 tools/compile_game.py, commit data/game/ and deploy (before the epoch there is no daily). Testers' earlier dailies become keep-playing games on their next visit (settleDailies() in js/store.js). Check the live site shows Daily #1.

Done when the About screen credits every source, it passes the accessibility checks, it's listed on /apps/, and puzzle 1 is live on launch day.
```

---

## 9. Audit follow-ups

**Agreed with the user on 2026-11-11; on hold until their weekly usage resets.** The audit's fixes are live (Done, above). Its report is a private artifact, https://claude.ai/artifact/4KrHMoktFtiApEfMzZjoaN (read it with the Artifact tool); everything needed to do the work is here. Four PRs, in order: 9.1, 9.2, 9.3, 9.4. Each starts from `main` after the one before it merges.

**Decided:**
- Colour-blind mode: both colours and marks. Marks show only with the mode on, unless the user says otherwise.
- Undo: a replaced or deleted save is kept for 7 days.
- A 14 px type step is allowed off the 4 px grid, for type only. Update the rule in CLAUDE.md, "Design Tokens".
- No lost-device backup: too much for a simple app. Kept as a possible feature (docs/DESIGN.md, "Saving and devices").
- The CSP is a `<meta>` tag, shipped enforced after testing; no report-only week (9.4 says why).

**Every PR:**
- **Self-checks before asking for a merge:** `node --test` and `python -I -X utf8 -m unittest discover -s tools`, with new tests for new logic. Then Playwright (preinstalled in cloud sessions) at 320 × 568, 390 × 844, 844 × 390 and 1440 × 900, light and dark, on the play page, Settings, Points, About, a game, the hints, the end-of-game ask and the result. axe-core on each (WCAG 2.2 AA and best practice; `npm i axe-core` in a scratch folder), and its colour-contrast rule in all 8 skins in both schemes. No sideways scroll, no console errors, no `[kanjiru config]` warnings. A code-review pass on the diff. The docs updated: CLAUDE.md's key files, DESIGN.md's decisions, and this step ticked.
- **Merging:** Claude squash-merges 9.1 and 9.2 once its checks and CI pass. The user merges 9.3 and 9.4 after their review.
- **Model:** the most capable one for 9.3 and 9.4, the judgement-heavy steps; 9.1 and 9.2 are routine.
- **Only Chromium runs in the cloud.** Safari, iOS and Firefox are the user's to check, where a step says so.

### 9.1 Foundations

1. **Tests before every deploy:** a test job (both suites) that runs on every pull request and on push to `main`; the deploy job in `.github/workflows/deploy.yml` needs it. Pin each action to a commit, like the existing ones.
2. **The data loads once:** measured 2026-11-11 in Chromium, a first visit makes 3 requests for the 3 JSON files; every later visit, with the service worker in control, makes 6, and logs "A preload for '…' is found, but is not used because it is a cross-world service worker resource mismatch" (Chromium's `Resource::CanReuse` won't reuse a preload a service worker answered for a script's fetch). Replace the three `<link rel="preload" as="fetch">` in `index.html` with a small classic script file in `<head>` that starts the three fetches and hands the promises to `loadData()` (`js/engine/data.js`). Not an inline script: the CSP in 9.4 forbids those. Update `tests/head.test.js`. Measure first and repeat visits before and after; the first visit must stay as fast (step 8a got it to 1.6 s).
3. ~~**Hover only where it exists:** wrap the `:hover` selectors in `@media (hover: hover)`.~~ Done in the motion polish (2026-11-11), with the rest of the hovers.
4. **A test that every CSS variable used is defined:** every `var(--x)` in `styles.css` and the JS must be defined by `tokens.js`, `styles.css` or the JS. Allow fallbacks (`var(--g, …)`) and the built name `--color-hint-badge-<id>`. It would have caught `--font-size-sm`.
5. **Docs:** turn the audit's Proposed entries in docs/DESIGN.md (dated 2026-11-11) into Decided; the user approved them.

### 9.2 Undo and toasts

1. **Undo for every action that replaces the save:** Replace and Merge (Settings, moving devices), Reset achievements and Delete all data. Before each, keep the whole save under its own localStorage key with the date. One copy at a time, the latest; it goes on the first load after 7 days.
2. **Where to undo:** in the toast that follows the action, and in Settings (Start over) until the copy expires, beside a "Delete for good" button that removes the copy at once. Restoring writes the save through `js/store.js`, so other tabs take it (`sync()`).
3. **Delete all data's asks:** they say it can be undone for 7 days (English and Japanese), since a copy now stays.
4. **Toasts (`js/toast.js`):** today each toast is one button that dismisses itself after 5 s (`transition.toast`). Make it text, an optional action (Undo) and a dismiss; pause the timer while it's hovered or focused (WCAG 2.2.1); and show a finished game's rewards in one toast (`renderResultCard()` in `js/play/screen.js`, `endFromCard()` in `app.js`).
5. **Tests:** keeping a copy, restoring it, and expiry.

### 9.3 Look

1. **Colour-blind mode.** Simulated with the Machado 2009 matrices, the green (#4C8B3F) and yellow (#B07F12) tiles have a contrast of 1.00 to 1 under protanopia and 1.29 to 1 under deuteranopia (the audit's own calculation).
   - A switch in Settings, Appearance. A new key in `settings` needs no migration.
   - In `tokens.js`, a third setting beside skin and light or dark: an attribute on `<html>`, applied before first paint from the save (`savedLook()`), and in `resolve()`, because the Points page reads tile colours from it in JS (`points.js`, `c.feedback`).
   - Colours: orange for right spot, blue for wrong spot. White text on them at 3:1 or more, and still apart under protanopia, deuteranopia and tritanopia.
   - Marks: a different small shape on right-spot and wrong-spot tiles, through all 8 tile reveals.
   - Everywhere a mark shows: board tiles, the keys, history squares, How to play and its legend, the kanji guide's green parts, the result card's answer, the Points page's examples, and the share squares (`rules.js` `share.marks` → 🟧🟦).
   - Text in English and Japanese.
2. **Type scale.** 62 of 108 `font-size` rules use 12 px; the next step is 16. Add 14 px. Notes, descriptions and secondary lines move to it; tags, eyebrows and uppercase labels stay at 12. Running text moves to rem. Glyphs inside tiles, keys and frames stay in px, tied to the cell size, or a larger browser text setting would overflow the fixed cells.
3. **One side-by-side game layout** for phones on their side: the board on the left, the keyboard on the right, and the result card taking the keyboard's column when the game ends. (Desktops keep one column: the user found side by side too big a change there, 2026-11-11; "Desktop polish" in Done.) At 844 × 390 today, six rows at the smallest cell (24 px) don't fit between the header and the keyboard, so the last rows slide under the keys. `fitBoard()` in `js/play/screen.js` sizes by height with the keyboard below; it needs a width split. `showResult()`, `glideToResult()` and `scrollGoal()` follow the end-of-game sequence the user shaped (the board held as played, the card in the keyboard's place, one glide), so keep its feel in the new layout.
4. ~~**Desktop width:** every page is a 560 px column today, and the Points page is 2,901 px tall at 1440 px wide. From 960 px: looks 8 across, hints and achievements side by side, and the play page using the width.~~ Replaced by "Desktop polish" (Done, 2026-11-11): the user kept the one column.
5. **Review:** before merging, a screenshot page for the user: phone, phone on its side and desktop, light and dark, the mode on and off. The user merges, then checks a game on their iPhone held sideways.

### 9.4 Fonts and CSP

1. **The source fonts:** the full Noto Serif CJK JP and Noto Sans CJK JP from https://github.com/notofonts/noto-cjk (`Serif/OTF/Japanese/NotoSerifCJKjp-<Weight>.otf`, `Sans/OTF/Japanese/NotoSansCJKjp-<Weight>.otf`). Pin a release; downloads go to `tools/sources/`.
   - Static CFF fonts, one per weight. Build only the weights the app uses: Serif 700 and 900, and the Sans weights between 400 and 700 that `styles.css` uses.
   - Licence: OFL 1.1, © Adobe, no Reserved Font Name, but "Noto is a trademark of Google Inc.", so the modified copies get their own family names (for example Kanjiru Serif and Kanjiru Sans). Credit them in `data/ATTRIBUTION.md` and the About page (`js/about.js`).
2. **Why it fixes the missing parts:** checked 2026-11-11 with fontTools. Google's Noto Sans JP and Noto Serif JP have 17,933 code points each and lack five part glyphs: 㐄 U+3404, 业 U+4E1A, 龵 U+9FB5, 龶 U+9FB6 and 𢆉 U+22189. Today the game draws those from KanjiVG strokes (`svg` on their forms in `data/parts.json`, drawn by `js/play/glyph.js`). The full CJK fonts have 44,777 (Serif Bold) and 44,810 (Sans Regular) code points, including 㐄 业 龵 龶, but not 𢆉.
3. **𢆉** (in 執 報 幸 摯) is the lower half of 幸: cut its outlines from Noto's own 幸 into our copies, and show it beside today's drawing in the screenshots. If it looks wrong, keep the drawing. Jigmo (CC0, from GlyphWiki) covers every CJK character, but it's a lighter Mincho that wouldn't match; its site was blocked in the cloud session.
4. **`tools/make_fonts.py`** (dev only, needs fontTools and brotli). Subset both families to the kanji in `data/game/kanji.json`, every part glyph and form in `data/parts.json`, kana, Latin and punctuation, and every character in `js/i18n/*.js` and the meanings in `data/game/answers.json`. Split them by character range, as Google does (it serves the two families as 248 files today), as WOFF2 with versioned names.
5. **Ship only if it's no heavier:** compare the bytes a first visit downloads (the play page, then a game) against Google's today.
6. **`tools/build_data.py`** decides which parts need drawings from Google's stylesheet (around lines 287 and 1025). Make it read our fonts instead, or the next rebuild brings the drawings back. Then the forms the fonts cover lose their `svg`; `glyph.js` keeps drawing any that still have one.
7. **Wiring:** `index.html` drops the Google Fonts links and preconnects; `@font-face` rules in `styles.css`. `sw.js`: same-origin font files cache first, since their names are versioned. `.htaccess`: the WOFF2 type and a long cache for the font files. `js/coin.js` is unaffected: its 金 is a stored outline.
8. **The CSP as a `<meta http-equiv="Content-Security-Policy">`**, first in `<head>`, before any script: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`. `'unsafe-inline'` styles are needed because `tokens.js` injects a `<style>`; every `innerHTML` in the app is fixed SVG (checked in the audit).
   - `frame-ancestors 'none'` only works as a header: one line in `.htaccess`.
   - Why a meta tag: without a reporting endpoint, a report-only header only logs to visitors' own consoles. A meta tag also applies under `php -S`, which ignores `.htaccess`, so the user can test it locally.
9. **Needs the user:** their site-root `.htaccess` (in the Clearful folder) before starting, since a CSP set there applies too and both must pass. Before merging, they test the play page, a game, Settings, Points and a transfer code in Safari and Firefox on the Mac under `php -S`, with the console open.

```
Kanjiru step 9.<n>: <title from docs/ROADMAP.md, step 9>.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first; step 9 holds the agreed plan for this PR, its decisions and its checks. Work on a new branch from main. Follow "Every PR" in step 9: the self-checks, the docs, and who merges. Ask me only where step 9 says the user is needed.
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
