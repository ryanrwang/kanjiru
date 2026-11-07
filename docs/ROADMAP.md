# Kanjiru roadmap

The big steps from here to launch, in order, each with a prompt to start its own thread in `D:\Dropbox\Clearful\apps\kanjiru`. Tick a step off here when it merges.

Last updated: 2026-11-07.

## Done

- [x] **Scaffold:** design tokens and skins, catalogues, versioned save, start screen, deploy. Live at https://www.ryanrwang.com/apps/kanjiru/
- [x] **Word data:** 5,725 candidates at N3 or easier, the review page, and the EN/JP toggle (PR #1)

## Order

```
1 Parts & palette ──► 2 Engine ──► 3 Game screen ──► 4 Longer words
                                          ├──► 5 Points, shop & achievements
                                          └──► 6 Skin effects
7 Device transfer  (any time)
8 Launch           (last)
You: review words  (any time; the game only uses words marked Keep)
```

- **Start now:** steps 1 and 7. They touch different files.
- **After step 3:** steps 4, 5 and 6 can run side by side.

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

**Needs:** step 2. This is the step that makes the game playable.

```
Kanjiru step 3: build the playable game screen for the 1-kanji daily and practice, on top of the engine in js/engine/.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Work on a new branch.

1. Board: one row per guess, showing the guessed kanji and its part tiles in their colours. The settings.tiles reveal style can start as a simple flip.
2. Parts palette: grouped by stroke count. Picking parts greys out parts that can't combine and narrows a strip of matching kanji (any jōyō kanji, easiest first); tapping one makes the guess. Also accept a kanji typed with a Japanese keyboard.
3. Hints: the free meaning after guess 3, and the powers in the player's inventory (before and during the game).
4. Result card: the answer with its meanings, readings and parts; points earned; streak; share text (daily number + emoji grid, with 💡 if hints were used); a countdown to the next daily; play practice.
5. On the start screen, k1 becomes playable. Other modes show "soon" until they have engine support and reviewed words.
6. Text through t() in English and Japanese, tokens only, phone first, reduced motion respected. Results save to history; a finished daily can't be replayed.

Done when a full daily and a practice game play well on phone and PC (check both on the local server's LAN link) and nothing is hard-coded.
```

## 4. Longer words (2–4 kanji)

**Needs:** step 3.

```
Kanjiru step 4: turn on the 2, 3 and 4 kanji modes.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Steps 1–3 are merged. Work on a new branch.

1. Settle with me whether a guess must be a real word, and propose the input: fill slots with the parts palette, with the choices narrowing to real words as slots fill if we go that way.
2. Board and scoring per slot, including the "in another kanji" marker from the engine.
3. The meaning (and maybe the reading) as the main clue, as decided in docs/DESIGN.md, plus the Reveal a kanji power.
4. More rows for longer words (js/config/modes.js already sets 6/6/7/8).
5. A daily for each mode, plus the "Full set" achievement when all are solved in a day.

Done when all four modes play on phone and PC, and adding a 5-kanji mode would only need a catalogue entry and data.
```

## 5. Points, shop & achievements

**Needs:** step 3.

```
Kanjiru step 5: make the points economy real.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Work on a new branch.

1. Earning: points per part uncovered and per win, mode multipliers, daily vs practice, and streak rewards, all from js/config/economy.js.
2. Random bonus hint drops after a win, weighted by each power's drop value, respecting hold limits.
3. A shop: buy powers and locked skins with points, with confirm steps and clear prices in both languages.
4. "Before" powers on the game's start (Head start, Extra guess) and "during" powers in game.
5. Achievements checked after each game, with a toast, their rewards, and the skins they unlock.
6. Show balance changes clearly (a small +points animation that respects reduced motion).

Done when a new player can earn, buy and use a hint and unlock a skin end to end, and every number still comes from js/config/.
```

## 6. Skin effects

**Needs:** step 3 (the board and result card exist).

```
Kanjiru step 6: build the fancy skins.

Read CLAUDE.md, docs/DESIGN.md and docs/ROADMAP.md first. Work on a new branch.

1. Tile reveal styles keyed by settings.tiles: Flip, Ink bleed (ink spreading through the tile) and Hanko stamp (pressed like a seal).
2. Win effects keyed by settings.effect: Brush draw (the answer drawn stroke by stroke from KanjiVG; add stroke paths for answer kanji to the data build, keeping size in check), Petal fall and Hanabi.
3. Textures for Urushi (lacquer sheen) and Kinpaku (gold-leaf shimmer).
4. Previews in the Looks picker on the start screen.
5. Structure it so a new effect is one catalogue entry plus one small module or CSS block.
6. Smooth on a mid-range phone, and off under prefers-reduced-motion.

Done when every skin in js/config/skins.js has its real look and effect and can be previewed.
```

## 7. Device transfer

**Can start any time.** It touches `api/`, a settings panel and `js/store.js`.

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
5. Performance: first load on a phone, data file sizes, font loading.
6. Add Kanjiru to the Apps page: apps/index.html in the Clearful repo, which is a separate repo; read D:\Dropbox\Clearful\.claude\github-deploy.md first.

Done when it installs to a phone's home screen, passes the accessibility checks, and is listed on /apps/.
```

---

## Your task: review words

Open http://localhost:8095/apps/kanjiru/review/ with the local server running:

```
php -S 0.0.0.0:8095 -t D:/Dropbox/Clearful
```

- **Start easy:** filter by length and "N5"/"N4"/"N3" to begin with the easiest words.
- **Bulk keep:** "Keep all pending on this page" speeds it up.
- **Flag parts:** use ⚐ on any kanji whose parts look wrong; step 1 reads those flags.
- **Saving:** decisions save to `data/review.json`. Commit that file with the next push so it's kept in Git.
