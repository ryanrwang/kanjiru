# Native audit

2026-11-12. Branch `claude/charming-fermat-e70h8a`. The user asked for an audit "as a native Japanese kanji expert" of the parts and gameplay (anything a native speaker would find odd, jarring, unfair or unclear while building up the kanji) and of the answers (words most Japanese speakers know, and N4 to N3 learners can reach). The report, with every finding: https://claude.ai/artifact/G3y65AgCHkiqvVWZYByYUR. The user agreed to every recommendation and to Claude's default on each open call.

## How

- Every one of the 460 answers, their 380 kanji, the 460 Japanese meaning lines and the other 232 N5 to N3 kanji were read by eye.
- A script checked every jōyō kanji's parts against its stroke count, plus loose strokes, tile use and word levels.
- Each doubtful shape was rendered in Noto Sans JP and Noto Serif JP, the fonts the game loads, beside its tiles. KanjiVG's element trees and stroke types were read for every kanji changed.
- The official jōyō reading table (bunka.go.jp) and KANJIDIC2 (edrdg.org) are blocked from the cloud session, so the readings in `data/one-kanji.json` are written from knowledge. Check any that look off.

## What changed

### On the board

- **Green cells show the answer's form.** A green cell is that part of the answer, so it shows the glyph the answer has there: a solved 会議 reads 𠆢 二 厶 言 ⺷ 我, not 人 二 厶 言 羊 我. Yellow and grey cells keep the key's glyph. `scoreOrder()` in `js/engine/score.js`.
- **Only 一 is on every keyboard.** 丨 丶 丿 乙 亅 are in no answer (`LOOSE_STROKES`), so at Normal and Guided they were dead keys. They stay at Hard and Guided · Hard, where a guess must make real kanji (`strokeKeys` in `js/config/levels.js`, `palette.strokeKeys` in `js/config/rules.js`), and they are never decoys elsewhere.
- **A key shows up to two other forms.** 人 shows 亻 and 𠆢; 水 shows 氵 and 氺. (Later the same day: one form only, `docs/DESIGN.md`, "Key forms".)
- **A one-kanji stem shows its word.** 選 is not said alone, so the result card shows 選ぶ above its meaning (`data/one-kanji.json`, `forms` in `answers.json`). The round isn't called "a kanji" up front: that would tell the player the answer has one kanji, which Normal keeps hidden.

### Parts

52 kanji changed. Every one still sums to its stroke count.

| Kanji | Was | Now | Why |
|---|---|---|---|
| 茶 | 艹 余 | 艹 𠆢 木 | 艹 + 余 is 荼, another kanji |
| 母 | 毋 | 母 (a form of 毋) | 母 has two dots, 毋 one stroke |
| 曜 躍 濯 | 羽 | ヨ ヨ | the jōyō form has ヨヨ over 隹; 習 keeps 羽 |
| 感 減 憾 威 蔑 滅 | 戍 | 戌 (new tile) | 一 inside, not 人; 機 幾 keep 戍 |
| 常 堂 党 賞 掌 償 | 冂 | 冖 | 尚's frame squeezed over 口 |
| 周 週 調 彫 | 士 | 土 | the lower line is the longer |
| 令 冷 鈴 零 領 齢 | マ | 卩 | printed fonts draw 卩; マ is handwriting |
| 区 医 匹 匿 | 匸 | 匸 (a form of 匚) | one printed shape, one key |
| 成 城 盛 誠 | 𠂊 戈 | 成 (new tile) | no reader sees 𠂊 + 戈 |
| 歳 | 止 厂 一 小 戈 | 止 戌 小 | a stroke salad |
| 南 献 | 丷 干 | 𢆉 | the same shape is 𢆉 in 幸 報 |
| 貫 慣 | 毋 | 毌 (a form of 毋) | a straight vertical |
| 卵 | 卯 丶 | 卯 丶 丶 | two dots |
| 良 娘 | 丨 | 丶 | written and taught as a dot |
| 慈 滋 磁 | 艹 玄 玄 | 丷 一 幺 幺 | KanjiVG names the top 艹 and each 幺 玄; this also set the 玄 tile back to 5 strokes |
| 籠 襲 | 竜 | 龍 (a form of 竜) | the full form |
| 左 友 | ナ outer | ナ top | as 右 有 |
| 者 考 | 耂 outer | 耂 top | a crown, not an enclosure |

Rules, in `tools/build_data.py`: `DRAWN_AS` gains 冂 → 冖, 玄 → 幺 and 戍 → 戌, and now applies to split elements once their pieces are joined (感's 戍 wraps 口). The 卩 → マ entries left. `VARIANT_FORMS` gains 匚: 匸, 毋: 母 毌 and 竜: 龍. The 龍 → 竜 look-alike left. 28 hand fixes are new in `data/parts-overrides.json` (51 in all).

### Answers

442 answers (460 before). Left: 景 漢 商 館 観 院 給 報 験 演 婦 警 (never said alone; each lives on in longer answers such as 漢字 and 報告), 歳 舞 (stroke salads), 一人一人 (four whole-kanji cells), 図書 (Maybe: it lives in 図書館), and 南 and 構成, which fell to 3 parts.

Kept, the user's call: the 22 words that run above N3 in practice (相続 破産 供給 見解 …), all on Waller's N3 list; and the dated 下宿 飛行場 上等 書物.

### Meanings and readings

- `data/meanings-en.json`: English for every one-kanji answer (働 was "work, (kokuji)", 院 "Inst.") and 17 words whose dictionary glosses led with a rare sense (台所 "financial situation", 外交 "selling door-to-door").
- `data/one-kanji.json`: the one-kanji answers' readings as the jōyō table lists them. KANJIDIC also lists readings outside it (愛 かな.しい, 寝 みたまや).
- `data/meanings-ja.json`: 日曜日 and 月曜日 no longer both claim to start the week; 土曜日 no longer reads 金の次; 部長 heads several 課; 近代 ends with the war; 茶色 is no longer こい黄赤.

## Left alone

- **疋 under 定 是 題:** its top is flat there. The flat form (𤴓) is outside Noto, so it would show as a box.
- **留's top:** 卯 is where it comes from; the shape is 𠂎 + 刀, and no tile fits.
- **郎 朗 廊:** their left is a 6-stroke form of 良. Splitting it needs a new shape; none is an answer.
- **喜:** 士 口 丷 一 口. The building-block rule would give 十 豆 口 (3 parts), so it stays as it is, a known exception.
- **Rare tiles:** 120 answers have a tile only a few kanji use (啇 冓 袁). They stay.
