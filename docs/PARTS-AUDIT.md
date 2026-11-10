# Parts audit

2026-11-10. Branch `claude/radical-audit`. Status: Proposed (docs/DESIGN.md, "Part breakdowns").

## Why

Native Japanese players said: "Some of the radicals are inaccurate, like 人 being used as another similar looking one. And some of the combinations of radicals also don't make sense."

Both were true. KanjiVG, where the breakdowns come from, names each part by where it comes from, not by the shape a reader sees. So the roof of 会 was shown as 人, the inward strokes of 前 as 八, and 渇's 匕 as 人. Where a shape wasn't a tile, the build fell back to single strokes or the wrong tiles: 狭 was 犭 大 人 人 大, 派 was 氵 丿 丿 亻 丿 丶, 組 was 糸 月 一.

The goal: every tile a player sees is a part a native reader would name for that shape, and every breakdown is pieces that make sense together.

## How

- **References:** the two pages the user found (kanjialive.com's 214 radicals and Wikipedia's list of kanji radicals by frequency) could not be reached from this session: the network proxy blocks both hosts. The radical numbers, variants and names below are from knowledge of the 214 Kangxi radicals. Check any that look off.
- **Sources:** KanjiVG r20260714 (the pinned release) and the Noto stylesheet, rebuilt with the new `tools/build_data.py --parts-only`. KANJIDIC2 and the Internet Archive are blocked here, so kanji info and words come from the existing `data/candidates.json`, unchanged.
- **Order:** kanji in the main answers first (374 kanji), then the other Keep words (92), then the rest at N3 or easier (146), then the rest of jōyō (1,524). Every breakdown in the first three groups was read by eye; shapes in doubt were drawn from KanjiVG's strokes, each part in its own colour. The rest of jōyō was checked through the rules, and every kanji with 3 or more loose strokes was looked at.
- **Kept:** the decided rules. Variants are the same part (氵 is 水). 月 and 肉 stay apart. Building blocks: the biggest pieces that are tiles. Positions come from the first split. Answers have 4 to 6 parts, and a loose single stroke (丨 丶 丿 乙 亅) keeps a word out of the main list. No tile was removed or renamed, since saved guesses store tile ids.

## Summary

| | Before | After |
|---|---|---|
| Tiles | 251 | 263 (12 new) |
| Glyphs (tiles and their forms) | 268 | 289 |
| Kanji whose breakdown changed | | 273: 160 in tiles or positions, 113 only in the glyph shown |
| Hand fixes in `data/parts-overrides.json` | 20 | 25 |
| Glyphs drawn from KanjiVG (fonts may lack them) | 11 | 18 |
| Jōyō kanji with a loose single stroke | 563 | 477 |
| ... of them N3 or easier | 150 | 129 |
| Main answers | 453 | 461 |
| Keep words left out for a loose stroke | 146 | 114 |
| Candidates | 5,647 | 5,642 (今 以 由 申 三 are tiles now, so they left the one-kanji candidates) |

## What changed

### What a part shows

A part shows the glyph a reader sees. These are forms of the same tile, so they score as that tile, like 氵 for 水. The rule is in `tools/build_data.py`: `DRAWN_AS` (by the part's stroke types), `ROOF_WIDTH` (𠆢) and `CLOSED_SELF_IN` (巳). Every kanji that shows each form now:

| Shown | Tile | Kanji | Which (answers and Keep first) |
|---|---|---|---|
| 𠆢 | 人 | 39 | 会合全論験命答給冷険絵界領企検幹介輪創齢令鈴診倉舎零捨剣倫珍舗搭拾傘塔栓脊倹詮 |
| 丷 | 八 | 39 | 前平説南呼喜弟税評並従隊献益逆普善脱締尊僕縦帝撲鋭遂墜悦猶坪閲譜膳繕諦煎遵塑遡 |
| 牜 | 牛 | 5 | 物特犠牲牧 |
| ⺧ | 牛 | 5 | 先告洗造酷 |
| ⻊ | 足 | 11 | 路踏躍露跡距踊践跳蹴踪 |
| ⺮ | 竹 | 24 | 答等笑箱第策算管筋築籍節簡範筆簿筒符笛篤箸箇箋籠 |
| ⺷ | 羊 | 10 | 議差美義儀養犠窯羨羞 |
| 龵 | 手 | 1 | 看 |
| 巳 | 己 | 9 | 選港抱包砲胞飽泡遷 |
| 㔾 | 卩 | 8 | 犯危範腕厄怨氾宛 |
| 夾 | 夹 | 1 | 頰 |

- **𠆢 (ひとやね):** 人 on top of the rest of its group, at least 0.85 as wide as what it covers. Every roof in this KanjiVG measures 0.9 or more; 人 inside 冂 (内 病 柄) measures under 0.75. 傘's four small 人 keep KanjiVG's left and right positions, so they stay 人.
- **丷:** 八 written ㇔ ㇒, the two strokes meeting below (前 説 並 弟). 八 written ㇒ ㇏, spreading (公 分 六), stays 八. Loose ㇔ ㇒ strokes are 丷 too (南 喜 帝 益 逆).
- **牜 and ⺧:** 牛 ending in a rising stroke is 牜 (物 特 牧). 牛 whose vertical stops at the last line is ⺧ (告 造 酷), as 先 already was. 件 and 解 keep a full 牛.
- **⻊:** 足 ending in a rising stroke (路 距 跡). 促 and 捉 keep a full 足.
- **⺮:** 竹 with short ticks for verticals: every 竹 on top (答 第 等 箱).
- **⺷:** 羊 whose vertical stops above the last line (美 義 差 養). 洋 群 善 keep 羊.
- **龵:** 手 on top, ending in ㇒ (看).
- **巳:** 己 inside 包 (包 抱 砲 胞 泡 飽), 港's 巷, 選's 巽 and 遷. KanjiVG draws 巳 and 己 the same, so this goes by the element around it.
- **㔾:** 卩 with a curled foot, ㇆ ㇟ (危 厄 範 宛 怨 腕 氾 犯).
- **夾:** the older drawing of 夹, in 頰.

### Wrong tiles

A part drawn as another tile is now that tile.

| Kanji | Was | Now | Why |
|---|---|---|---|
| 渇 喝 掲 謁 褐 | 人 | 匕 | KanjiVG's 人 in 曷 is drawn ㇒ ㇟, the shape of 匕 (and 渇 has 11 strokes, not 12) |
| 領 齢 | 卩 | マ | 令's foot is drawn ㇇ ㇔ like マ, as 冷 鈴 零 already were |
| 野 | 乙 丶 了 | マ 了 | 予, as 予 itself |
| 確 鶴 | 宀 | 冖 | KanjiVG names it 宀, but it has no top dot |
| 開 研 形 刑 型 | 干 干 | 一 廾 | 开 is two lines over 廾; KanjiVG's second 干 was one stroke |
| 望 | 亡 王 | 亡 月 王 | KanjiVG names the top 亡, though it holds 亡 and 月 |
| 午 許 | 𠂉 干 | 𠂉 十 | 干 shared its top line with 𠂉 |
| 御 卸 | 𠂉 干 卜 丨 丶 | 𠂉 一 止 | 午 over 止, sharing its vertical |
| 戦 弾 禅 | ⺍ 日 一 丨 | ⺍ 日 十 | as 単 itself |
| 優 憂 | 一 丿 日 | 一 白 | 百 is 一 over 白 |
| 顔 | 立 丿 彡 | 立 厂 彡 | 立 over 厂, as in 産 |
| 働 勲 腫 薫 衝 | 丿 一 里 | 𠂉 里 | 重 is 𠂉 over 里, as 重 itself |
| 勝 騰 謄 拳 | 丶 丿 二 人 | 𠔉 | the top of 券 and 巻 |
| 春 奏 泰 奉 | 一 一 大 | 三 人 | 三 and 人, the reading players learn (春 is 三 人 日) |
| 実 | 一 夫 (a hand fix) | 三 人 | the same 三 and 人 as 春, so the hand fix left |
| 残 浅 銭 践 桟 | 一 一 戈 | 二 戈 | |
| 象 像 | 𠂊 丨 乙 丨 豕 | 𠂊 口 豕 | the box's bottom line is 豕's first stroke |
| 官 館 管 棺 | 宀 口 乙 一 | 宀 口 口 | two boxes under 宀, sharing a side |

### New tiles

Shapes that recur, or are well-known kanji, whose split was wrong or a stroke salad. Each is a kanji or a named component.

| Tile | Kanji | Was |
|---|---|---|
| 且 | 助 組 祖 査 宜 租 粗 狙 阻 畳 | 月 + 一: 且 has no 月 in it |
| 冊 | 論 輪 倫 編 偏 遍 柵 嗣 | 冂 + 廾 |
| 夹 (夾) | 狭 峡 挟 頰 | 大 人 人 大 (and 一 strokes) |
| 及 | 吸 級 扱 | 丿 + 又: 及 isn't 又 |
| 巴 | 色 絶 肥 把 艶 | 己, though 巴 has a fourth stroke |
| 今 | 念 含 吟 琴 陰 貪 捻 | 𠆢 一 乙 |
| 由 | 油 宙 笛 袖 軸 抽 届 演 専 恵 穂 画 | 日 + 丨 |
| 申 | 神 伸 紳 捜 痩 | 日 + 丨 |
| 三 | 春 奏 泰 奉 俸 棒 実 寿 鋳 拝 峰 蜂 縫 邦 承 | 一 一 一 |
| 以 | 似 | 丨 丶 丶 人: it fell apart into strokes, like 不 and 北 |
| 𠂢 | 派 脈 | 丿 丿 亻 丿 丶 |
| 乑 | 衆 | 亻 丿 丿 丿 丶 (as dictionaries split it: 血 + 乑) |

### Rules added to tools/build_data.py

- `DRAWN_AS`, `ROOF_WIDTH`, `CLOSED_SELF_IN`: the glyph a part shows, above.
- `COMPONENT_SPLITS`: KanjiVG elements that aren't tiles, split into tiles by stroke counts, wherever they appear. 重 午 开 単 劵 百 𡗗 戋 丰 彦 菐 奉 卸 官 象. A recipe whose stroke count doesn't fit is skipped.
- **Misnamed groups:** a group named as a tile but holding more than twice its strokes is looked into (望).
- **Loose strokes:** a stroke pattern can start at any stroke of a run, longest first (喜's ㇔ ㇒ ㇐ is 丷 and 一). ナ and 𠂉 still need the run to themselves, or 倉's ㇕ ㇐ ㇐ ㇒ would give a ナ. New patterns: ㇔ ㇒ is 丷, ㇇ ㇔ is マ, and 拳's unnamed top is 𠔉.
- **LOOKALIKES:** KanjiVG's 龹 (騰) is 𠔉.
- **`--parts-only`:** recomputes parts and `data/parts.json` from the existing `data/candidates.json`, downloading only KanjiVG and the Noto stylesheet (`tools/README.md`).

### Hand fixes

25 kanji, in `data/parts-overrides.json`. The rules now give 三 重 動 種 犯 平 実 on their own (犯 and 平 now show 㔾 and 丷), so those 7 left. 12 are new.

| Kanji | Parts | Why |
|---|---|---|
| 万 | 一:top 力:bottom | The two strokes under the line draw 力; KanjiVG leaves them loose. |
| 円 | 冂:outer 丨:inner 一:inner | The stroke and line sit inside 冂; KanjiVG gives no positions, so they came out none. |
| 年 | 𠂉:top 干:bottom 丨:bottom | KanjiVG splits 干 around the other strokes, which left loose strokes and an enclosure. |
| 寒 | 宀:top 共:bottom 一:bottom 冫:bottom | The middle is 共 with an extra line; KanjiVG has it as loose strokes and a split 三. |
| 声 | 士:top 尸:bottom 丨:bottom | KanjiVG leaves the bottom as four loose strokes; it reads as 尸 with a stroke down its left. |
| 勤 | 艹:left 口:left 王:left 力:right | KanjiVG's 菫 isn't a tile and its bottom is loose strokes; it draws 口 over 王. |
| 無 | 𠂉:top 卌:top 一:top 灬:bottom | KanjiVG leaves the top as eight loose strokes. 卌 isn't in JIS, so its strokes are listed for the drawing. |
| 舞 | 𠂉:top 卌:top 一:top 夕:bottom 㐄:bottom | Same top as 無, which KanjiVG leaves as loose strokes. |
| 産 | 立:top 厂:bottom 生:bottom | 立 over 厂 and 生: the stroke down the left and 立's last line draw 厂; KanjiVG leaves the stroke loose. |
| 着 | 羊:top 目:bottom | 羊 over 目; the long stroke is part of 羊 here, and KanjiVG leaves it loose. |
| 表 | 龶:top 衣:bottom | KanjiVG splits 衣 around 龶, which left 二 and a loose stroke on top. |
| 号 | 口:top 丂:bottom | The bottom is 丂; KanjiVG leaves it as a line and a loose stroke. |
| 母 | 毋:whole | The shape is the 毋 tile, as in 毎 and 海; KanjiVG leaves its two dots loose. |
| 内 | 冂:outer 人:inner | 人 sits inside 冂; KanjiVG gives no positions, so they came out top and bottom. |
| 両 | 一:top 冂:outer 山:inner | 一 over 冂 holding 山; KanjiVG gives no positions, so they came out none. |
| 画 | 一:top 由:inner 凵:outer | 一 over 由 held in 凵; KanjiVG gives no positions, so they came out none. |
| 在 | 一:top 亻:left 土:right | ナ's line on top, with its stroke and a vertical drawing 亻 under it and 土 to the right; KanjiVG's split put 一 and 亻 both on top. |
| 存 | 一:top 亻:left 子:right | Same shape as 在, with 子 for 土; KanjiVG's split made 一 and 亻 an enclosure. |
| 乗 | 禾:none 廿:none | 禾 (the top stroke and line, the long vertical and the two legs) with 廿 across its middle, where the old 乘 had 北; KanjiVG leaves the middle as five loose strokes. |
| 謄 | 月:left 𠔉:right 言:right | 月 beside 𠔉 over 言, as 騰 is 月 beside 𠔉 over 馬; KanjiVG splits 朕 across the two sides, which left loose strokes. |
| 塞 | 宀:top 共:top 一:top 土:bottom | The middle is 共 with an extra line, as in 寒; KanjiVG has it as loose strokes. |
| 僅 | 亻:left 廿:right 口:right 王:right | The right is 廿 over 口 over 王, as 勤 is 艹 over 口 over 王; KanjiVG leaves 口 and 王 as loose strokes. |
| 謹 | 言:left 艹:right 口:right 王:right | The right is 艹 over 口 over 王, as in 勤; KanjiVG leaves 口 and 王 as loose strokes. |
| 衆 | 血:top 乑:bottom | 血 over 乑, as dictionaries split it; KanjiVG leaves the bottom as 亻 and four loose strokes. 乑 is only here, so its strokes are listed for its stroke count. |
| 脊 | 𠆢:top 二:top 二:top 月:bottom | The top is a roof with 二 on each side, over 月; KanjiVG's 人 overlaps the 二s, so the roof wasn't found. |

## Tile to radical map

All 263 tiles. 188 stand for 183 of the 214 Kangxi radicals (some radicals have two tiles: 小 has 小 ⺌ ⺍, 巛 has 川 巛, 彐 has ヨ 彑, 玉 has 玉 王). The other 75 are not radicals: kanji used as parts (五 不 北), recurring components (业 免 兼), and katakana-like shapes (ナ マ). "Filed under" is the radical a Kangxi dictionary lists the character under. Uses: jōyō kanji with the tile. Forms: the glyphs the tile shows, first the tile's own.

| Tile | Forms | Strokes | Kangxi | Japanese name | Uses | e.g. | Note |
|---|---|---|---|---|---|---|---|
| 一 | 一 | 1 | 1 一 | いち | 253 | 本同政事 |  |
| 丿 | 丿 | 1 | 4 丿 | の, はらいぼう | 121 | 務界第向 |  |
| 丨 | 丨 | 1 | 2 丨 | ぼう, たてぼう | 84 | 年中円界 |  |
| 乙 | 乙 | 1 | 5 乙 | おつ, おつにょう | 79 | 民決七世 | also stands for 乚 and other bent strokes |
| 丶 | 丶 | 1 | 3 丶 | てん | 75 | 約主的認 |  |
| 亅 | 亅 | 1 | 6 亅 | はねぼう | 18 | 事打争町 |  |
| 人 | 人 亻 𠆢 | 2 | 9 人 | ひと; 亻 にんべん; 𠆢 ひとやね | 167 | 会合内代 |  |
| 十 | 十 | 2 | 24 十 | じゅう | 79 | 戦協午千 |  |
| 刀 | 刀 刂 | 2 | 18 刀 | かたな; 刂 りっとう | 74 | 分前制初 |  |
| 八 | 八 丷 | 2 | 12 八 | はち; 丷 | 72 | 分前六公 |  |
| 儿 | 儿 | 2 | 10 儿 | ひとあし, にんにょう | 62 | 発党四統 |  |
| 又 | 又 | 2 | 29 又 | また | 57 | 経最度取 |  |
| 冖 | 冖 | 2 | 14 冖 | わかんむり | 55 | 学受続軍 |  |
| 厶 | 厶 | 2 | 28 厶 | む | 55 | 会法治強 |  |
| 亠 | 亠 | 2 | 8 亠 | なべぶた | 52 | 市高京六 |  |
| 𠂉 | 𠂉 | 2 | not a radical |  | 47 | 年動午権 | the ノ一 top of 毎, 午, 族 |
| 冂 | 冂 | 2 | 13 冂 | けいがまえ, どうがまえ | 45 | 同党内高 |  |
| 二 | 二 | 2 | 7 二 | に | 40 | 会発院元 |  |
| 力 | 力 | 2 | 19 力 | ちから | 36 | 動務協加 |  |
| 勹 | 勹 | 2 | 20 勹 | つつみがまえ | 36 | 約的別局 |  |
| 厂 | 厂 | 2 | 27 厂 | がんだれ | 36 | 産原反歳 |  |
| 匕 | 匕 | 2 | 21 匕 | さじ, ひ | 34 | 化指死能 |  |
| 乂 | 乂 | 2 | not a radical |  | 27 | 気区使欧 | メ shape (気, 区, 図); Kangxi files it under 丿 |
| 冫 | 冫 | 2 | 15 冫 | にすい | 26 | 資次終楽 |  |
| 𠂊 | 𠂊 | 2 | not a radical |  | 26 | 成争急鮮 | ク shape (色, 争, 危, 魚); KanjiVG's name for the ⺈ top, from 勹 or 刀 |
| 凵 | 凵 | 2 | 17 凵 | うけばこ | 25 | 出画脳離 |  |
| マ | マ | 2 | not a radical |  | 22 | 通務野領 | katakana-like shape (予, 通, 勇, 冷) |
| 卜 | 卜 | 2 | 25 卜 | ぼく, うらない | 22 | 上外下点 |  |
| 卩 | 卩 㔾 | 2 | 26 卩 | ふしづくり; 㔾 まげわりふ | 21 | 報命危迎 |  |
| 九 | 九 | 2 | not a radical |  | 17 | 勢究丸熱 | kanji, filed under 乙 (5) |
| 几 | 几 | 2 | 16 几 | つくえ | 15 | 処航抗築 |  |
| ナ | ナ | 2 | not a radical |  | 14 | 有若佐右 | katakana-like shape (左, 右, 有), from 𠂇 |
| 了 | 了 | 2 | not a radical |  | 11 | 務野予承 | kanji, filed under 亅 (6) |
| 匚 | 匚 | 2 | 22 匚 | はこがまえ | 8 | 欧駆勘殴 |  |
| 入 | 入 | 2 | 11 入 | いる | 7 | 輸込諭癒 |  |
| 丂 | 丂 | 2 | not a radical |  | 5 | 考号巧朽 | the bottom of 号, 考 |
| 乃 | 乃 | 2 | not a radical |  | 4 | 秀誘携透 | kanji, filed under 丿 (4) |
| 匸 | 匸 | 2 | 23 匸 | かくしがまえ | 4 | 区医匹匿 |  |
| 口 | 口 | 3 | 30 口 | くち, くちへん | 282 | 中同事部 |  |
| 土 | 土 | 3 | 32 土 | つち, つちへん | 95 | 時社地場 |  |
| 艹 | 艹 | 3 | 140 艸 (variant) | くさかんむり | 81 | 藤難護備 | variant of 艸 |
| 宀 | 宀 | 3 | 40 宀 | うかんむり | 63 | 定実家安 |  |
| 大 | 大 | 3 | 37 大 | だい | 57 | 決参美天 |  |
| 辶 | 辶 | 3 | 162 辵 (variant) | しんにょう | 57 | 連選通進 | variant of 辵 |
| 女 | 女 | 3 | 38 女 | おんな, おんなへん | 49 | 要安数委 |  |
| 寸 | 寸 | 3 | 41 寸 | すん | 48 | 時対持府 |  |
| 阝 | 阝 | 3 | 170 阜 (variant) | こざとへん; おおざと (邑, 163) | 46 | 部都院際 | ⻖ (from 阜) and ⻏ (from 邑) are one tile: the same shape |
| 夂 | 夂 | 3 | 34 夂 | ふゆがしら | 41 | 後変各終 | also 夊 (35, すいにょう), which Japanese fonts draw the same |
| 小 | 小 | 3 | 42 小 | しょう | 39 | 京県原歳 |  |
| 士 | 士 | 3 | 33 士 | さむらい | 37 | 調続結売 |  |
| 尸 | 尸 | 3 | 44 尸 | しかばね | 33 | 局展声屋 |  |
| 广 | 广 | 3 | 53 广 | まだれ | 33 | 度府広応 |  |
| 山 | 山 | 3 | 46 山 | やま, やまへん | 32 | 出島両満 |  |
| 巾 | 巾 | 3 | 50 巾 | はば | 30 | 市制常席 |  |
| ヨ | ヨ | 3 | 58 彐 (variant) | けいがしら | 29 | 事当争急 | shown as the katakana ヨ, which is the same shape |
| 廾 | 廾 | 3 | 55 廾 | にじゅうあし | 25 | 開研展算 |  |
| 子 | 子 | 3 | 39 子 | こ, こへん | 23 | 学教好字 |  |
| 彳 | 彳 | 3 | 60 彳 | ぎょうにんべん | 23 | 後得役待 |  |
| 工 | 工 | 3 | 48 工 | たくみ | 21 | 式空試差 |  |
| ⺍ | ⺍ | 3 | 42 小 (variant) | つかんむり | 20 | 学戦挙営 | variant of 小 on top (学, 単, 覚); its own tile |
| 囗 | 囗 | 3 | 31 囗 | くにがまえ | 20 | 国四回団 |  |
| 己 | 己 巳 | 3 | 49 己 | おのれ; 巳 み | 19 | 選改記配 | 巳 and 已 are filed under 己 |
| 夕 | 夕 | 3 | 36 夕 | ゆうべ | 17 | 外多名移 |  |
| 弓 | 弓 | 3 | 57 弓 | ゆみ, ゆみへん | 17 | 強第引費 |  |
| ⺌ | ⺌ | 3 | 42 小 (variant) | しょうかんむり | 16 | 党当常消 | variant of 小 on top (光, 当, 常); its own tile |
| 三 **new** | 三 | 3 | not a radical |  | 16 | 実春邦承 | kanji, filed under 一 (1); new in the audit |
| 干 | 干 | 3 | 51 干 | いちじゅう, ほす | 16 | 年平南幹 |  |
| 彡 | 彡 | 3 | 59 彡 | さんづくり | 16 | 参形影修 |  |
| 亡 | 亡 | 3 | not a radical |  | 9 | 望荒忘網 | kanji, filed under 亠 (8) |
| 川 | 川 | 3 | 47 巛 (variant) | かわ | 9 | 流州順荒 | variant of 巛 |
| 弋 | 弋 | 3 | 56 弋 | しきがまえ | 9 | 代式武試 |  |
| 玄 | 玄 | 3 | 95 玄 | げん | 9 | 率蓄滋磁 |  |
| 廴 | 廴 | 3 | 54 廴 | えんにょう | 8 | 建健延庭 |  |
| 丬 | 丬 | 3 | 90 爿 (variant) | しょうへん | 7 | 状将装寝 | variant of 爿 |
| 幺 | 幺 | 3 | 52 幺 | いとがしら | 7 | 後機幼幻 |  |
| 也 | 也 | 3 | not a radical |  | 4 | 地施他池 | kanji, filed under 乙 (5) |
| 及 **new** | 及 | 3 | not a radical |  | 4 | 級吸扱 | kanji, filed under 又 (29); new in the audit |
| 彑 | 彑 | 3 | 58 彐 (variant) | けいがしら | 4 | 互縁剝彙 | variant of 彐 (互, 縁) |
| 才 | 才 | 3 | not a radical |  | 4 | 財材閉 | kanji, filed under 手 (64) |
| 尢 | 尢 | 3 | 43 尢 | だいのまげあし | 3 | 就稽蹴 |  |
| 巛 | 巛 | 3 | 47 巛 | まがりがわ | 3 | 災巡拶 |  |
| 日 | 日 | 4 | 72 日 | ひ, ひへん | 171 | 時間東者 | also stands for 曰 (73, ひらび) |
| 木 | 木 | 4 | 75 木 | き, きへん | 158 | 本東業相 |  |
| 水 | 水 氵 氺 | 4 | 85 水 | みず; 氵 さんずい; 氺 したみず | 148 | 決法治派 |  |
| 心 | 心 忄 ⺗ | 4 | 61 心 | こころ; 忄 りっしんべん; ⺗ したごころ | 98 | 意性総思 |  |
| 手 | 手 扌 龵 | 4 | 64 手 | て; 扌 てへん | 97 | 持指投打 |  |
| 月 | 月 | 4 | 74 月 | つき, つきへん | 92 | 前明期勝 | also the 月 shape of 肉 (⺼, にくづき): decided, players see 月 |
| 火 | 火 灬 | 4 | 86 火 | ひ; 灬 れっか | 49 | 点談無鮮 |  |
| 攵 | 攵 | 4 | 66 攴 (variant) | のぶん, ぼくづくり | 41 | 政務改数 | variant of 攴 |
| 王 | 王 | 4 | 96 玉 (variant) | おうへん, たまへん | 36 | 全現理主 | 玉 on the left; 玉 itself is its own tile |
| 戈 | 戈 | 4 | 62 戈 | ほこづくり, ほこがまえ | 35 | 戦成歳裁 |  |
| 止 | 止 | 4 | 77 止 | とめる | 27 | 政正歳企 |  |
| 爪 | 爪 爫 | 4 | 87 爪 | つめ; 爫 つめかんむり | 24 | 受授採将 |  |
| 斤 | 斤 | 4 | 69 斤 | おのづくり | 23 | 新近所断 |  |
| 犬 | 犬 犭 | 4 | 94 犬 | いぬ; 犭 けものへん | 22 | 状独然献 |  |
| 方 | 方 | 4 | 70 方 | ほう, かたへん | 21 | 放施防訪 |  |
| 欠 | 欠 | 4 | 76 欠 | あくび | 19 | 資次欧姿 |  |
| 殳 | 殳 | 4 | 79 殳 | るまた, ほこづくり | 18 | 設投役撃 |  |
| 夫 | 夫 | 4 | not a radical |  | 17 | 難規失鉄 | kanji, filed under 大 (37) |
| 廿 | 廿 | 4 | not a radical |  | 17 | 度世席乗 | component, filed under 廾 (55) |
| 戸 | 戸 | 4 | 63 戶 | と, とだれ | 15 | 所編房戻 |  |
| 牛 | 牛 ⺧ 牜 | 4 | 93 牛 | うし; 牜 うしへん | 15 | 制先解告 |  |
| 龶 | 龶 | 4 | not a radical |  | 15 | 表割害積 | the top of 青, 責, 表 (a form of 生) |
| 毋 | 毋 | 4 | 80 毋 | なかれ | 11 | 海毎母敏 | drawn 母 in 毎 and 海 |
| 勿 | 勿 | 4 | not a radical |  | 10 | 場物易傷 | kanji, filed under 勹 (20) |
| 歹 | 歹 | 4 | 78 歹 | がつへん, いちたへん | 10 | 死残例葬 |  |
| 比 | 比 | 4 | 81 比 | くらべる | 9 | 階批混皆 |  |
| 氏 | 氏 | 4 | 83 氏 | うじ | 9 | 民低紙婚 |  |
| 今 **new** | 今 | 4 | not a radical |  | 8 | 念含陰琴 | kanji, filed under 人 (9); new in the audit |
| 尺 | 尺 | 4 | not a radical |  | 8 | 沢駅択訳 | kanji, filed under 尸 (44) |
| 父 | 父 | 4 | 88 父 | ちち | 8 | 交校効較 |  |
| 支 | 支 | 4 | 65 支 | しにょう | 7 | 技枝岐鼓 |  |
| 㐄 | 㐄 | 4 | not a radical |  | 5 | 降舞隣瞬 | the bottom right of 舞, 降 |
| 巴 **new** | 巴 | 4 | not a radical |  | 5 | 色絶肥把 | kanji, filed under 己 (49); new in the audit |
| 文 | 文 | 4 | 67 文 | ぶん | 5 | 対紋蚊斑 |  |
| 井 | 井 | 4 | not a radical |  | 4 | 囲耕丼 | kanji, filed under 二 (7) |
| 斗 | 斗 | 4 | 68 斗 | とます | 4 | 料科斜 |  |
| 不 | 不 | 4 | not a radical |  | 3 | 否杯 | kanji, filed under 一 (1) |
| 五 | 五 | 4 | not a radical |  | 3 | 語悟 | kanji, filed under 二 (7) |
| 毛 | 毛 | 4 | 82 毛 | け | 3 | 尾耗 |  |
| 气 | 气 | 4 | 84 气 | きがまえ | 2 | 気汽 |  |
| 片 | 片 | 4 | 91 片 | かた | 2 | 版 |  |
| 田 | 田 | 5 | 102 田 | た, たへん | 55 | 思界男果 |  |
| 目 | 目 | 5 | 109 目 | め, めへん | 37 | 相県直置 |  |
| 禾 | 禾 | 5 | 115 禾 | のぎへん | 36 | 和委利私 |  |
| 白 | 白 | 5 | 106 白 | しろ | 30 | 的百原優 |  |
| 立 | 立 | 5 | 117 立 | たつ, たつへん | 28 | 部新産位 |  |
| 示 | 示 礻 | 5 | 113 示 | しめす; 礻 しめすへん | 27 | 社神視福 |  |
| 罒 | 罒 | 5 | 122 网 (variant) | あみがしら | 23 | 置環買憲 | variant of 网 |
| 石 | 石 | 5 | 112 石 | いし, いしへん | 19 | 確研破岩 |  |
| 疋 | 疋 | 5 | 103 疋 | ひき | 16 | 定題提疑 | also ⺪ (疑, 定) |
| 疒 | 疒 | 5 | 104 疒 | やまいだれ | 16 | 病療痛症 |  |
| 矢 | 矢 | 5 | 111 矢 | や, やへん | 16 | 知疑族医 |  |
| 由 **new** | 由 | 5 | not a radical |  | 13 | 画演専油 | kanji, filed under 田 (102); new in the audit |
| 业 | 业 | 5 | not a radical |  | 12 | 業並普僕 | the top of 業, 並, 普 |
| 可 | 可 | 5 | not a radical |  | 12 | 何歌崎河 | kanji, filed under 口 (30) |
| 穴 | 穴 | 5 | 116 穴 | あなかんむり | 12 | 空究突控 |  |
| 且 **new** | 且 | 5 | not a radical |  | 11 | 査組助狙 | kanji, filed under 一 (1); new in the audit |
| 皿 | 皿 | 5 | 108 皿 | さら | 11 | 盟益盛温 |  |
| 冊 **new** | 冊 | 5 | not a radical |  | 9 | 論編輪倫 | kanji, filed under 冂 (13); new in the audit |
| 甘 | 甘 | 5 | 99 甘 | あまい | 8 | 謀勘紺媒 |  |
| 生 | 生 | 5 | 100 生 | うまれる | 8 | 性産星隆 |  |
| 皮 | 皮 | 5 | 107 皮 | けがわ | 8 | 被破彼波 |  |
| 禸 | 禸 | 5 | 114 禸 | ぐうのあし | 8 | 離属遇愚 |  |
| 用 | 用 | 5 | 101 用 | もちいる | 7 | 通備痛踊 |  |
| 申 **new** | 申 | 5 | not a radical |  | 6 | 神捜伸紳 | kanji, filed under 田 (102); new in the audit |
| 乍 | 乍 | 5 | not a radical |  | 5 | 作昨詐酢 | component, filed under 丿 (4) |
| 卯 | 卯 | 5 | not a radical |  | 5 | 貿留柳卵 | kanji, filed under 卩 (26) |
| 司 | 司 | 5 | not a radical |  | 5 | 飼詞伺嗣 | kanji, filed under 口 (30) |
| 玉 | 玉 | 5 | 96 玉 | たま | 5 | 国宝璧璽 |  |
| 半 | 半 | 5 | not a radical |  | 4 | 判伴畔 | kanji, filed under 十 (24) |
| 牙 | 牙 | 5 | 92 牙 | きば | 4 | 雅邪芽 |  |
| 癶 | 癶 | 5 | 105 癶 | はつがしら | 4 | 発登廃澄 |  |
| 𢆉 | 𢆉 | 5 | not a radical |  | 4 | 報幸執摯 | the bottom of 幸 (a form of 干) |
| 央 | 央 | 5 | not a radical |  | 3 | 映英 | kanji, filed under 大 (37) |
| 巨 | 巨 | 5 | not a radical |  | 3 | 拒距 | kanji, filed under 工 (48) |
| 布 | 布 | 5 | not a radical |  | 3 | 希怖 | kanji, filed under 巾 (50) |
| 以 **new** | 以 | 5 | not a radical |  | 2 | 似 | kanji, filed under 人 (9); new in the audit |
| 北 | 北 | 5 | not a radical |  | 2 | 背 | kanji, filed under 匕 (21) |
| 卌 | 卌 | 5 | not a radical |  | 2 | 無舞 | the middle of 無, 舞 |
| 瓦 | 瓦 | 5 | 98 瓦 | かわら | 2 | 瓶 |  |
| 糸 | 糸 | 6 | 120 糸 | いと, いとへん | 69 | 経約統総 |  |
| 衣 | 衣 衤 | 6 | 145 衣 | ころも; 衤 ころもへん | 28 | 表初裁補 |  |
| 竹 | 竹 ⺮ | 6 | 118 竹 | たけ; ⺮ たけかんむり | 25 | 第策算答 |  |
| 米 | 米 | 6 | 119 米 | こめ, こめへん | 25 | 来数料断 |  |
| 羊 | 羊 ⺷ | 6 | 123 羊 | ひつじ | 24 | 議業鮮着 | ⺷ (also written 𦍌) when the vertical stops |
| 艮 | 艮 | 6 | 138 艮 | こんづくり, ねづくり | 23 | 銀限退良 |  |
| 老 | 老 耂 | 6 | 125 老 | おい; 耂 おいかんむり | 16 | 者都教考 |  |
| 虫 | 虫 | 6 | 142 虫 | むし, むしへん | 16 | 強独融触 |  |
| 共 | 共 | 6 | not a radical |  | 14 | 選供港異 | kanji, filed under 八 (12) |
| 耳 | 耳 | 6 | 128 耳 | みみ, みみへん | 14 | 最取職聞 |  |
| 西 | 西 覀 | 6 | 146 襾 (variant) | にし; 覀 | 12 | 要価票標 |  |
| 羽 | 羽 | 6 | 124 羽 | はね | 10 | 習躍曜翌 |  |
| 舟 | 舟 | 6 | 137 舟 | ふね, ふねへん | 10 | 般航船盤 |  |
| 曲 | 曲 | 6 | not a radical |  | 9 | 農豊典濃 | kanji, filed under 曰 (73) |
| 至 | 至 | 6 | 133 至 | いたる | 9 | 室屋倒致 |  |
| 虍 | 虍 | 6 | 141 虍 | とらがしら | 9 | 劇慮虚虐 |  |
| 聿 | 聿 | 6 | 129 聿 | ふでづくり | 8 | 書建健律 |  |
| 自 | 自 | 6 | 132 自 | みずから | 8 | 夏息鼻憩 |  |
| 𠔉 | 𠔉 | 6 | not a radical |  | 8 | 勝藤券巻 | the top of 券, 巻, 勝 (龹) |
| 戍 | 戍 | 6 | not a radical |  | 7 | 機感減威 | the 戈 with a stroke of 成, 感, 機 |
| 舌 | 舌 | 6 | 135 舌 | した | 7 | 話活辞乱 |  |
| 行 | 行 | 6 | 144 行 | ぎょうがまえ | 7 | 術衛街衝 |  |
| 兆 | 兆 | 6 | not a radical |  | 6 | 逃挑跳眺 | kanji, filed under 儿 (10) |
| 亥 | 亥 | 6 | not a radical |  | 5 | 核刻該劾 | component, filed under 亠 (8) |
| 亦 | 亦 | 6 | not a radical |  | 5 | 変湾跡恋 | component, filed under 亠 (8) |
| 缶 | 缶 | 6 | 121 缶 | ほとぎ | 5 | 揺謡陶鬱 |  |
| 关 | 关 | 6 | not a radical |  | 4 | 関送咲朕 | the inside of 送, 関 |
| 夹 **new** | 夹 夾 | 6 | not a radical |  | 4 | 狭峡挟頰 | the right of 狭, 峡, 挟 (夾 in 頰); new in the audit |
| 并 | 并 | 6 | not a radical |  | 4 | 併瓶塀餅 | component, filed under 干 (51) |
| 朱 | 朱 | 6 | not a radical |  | 4 | 株殊珠 | kanji, filed under 木 (75) |
| 而 | 而 | 6 | 126 而 | しこうして | 4 | 需端耐儒 |  |
| 𠂤 | 𠂤 | 6 | not a radical |  | 4 | 追師阜帥 | the left of 師, the inside of 追 |
| 耒 | 耒 | 6 | 127 耒 | すきへん | 3 | 籍耕耗 |  |
| 臼 | 臼 | 6 | 134 臼 | うす | 3 | 潟毀 |  |
| 瓜 | 瓜 | 6 | 97 瓜 | うり | 2 | 孤弧 |  |
| 肉 | 肉 | 6 | 130 肉 | にく | 2 | 腐 | the 月 shape (⺼) is the 月 tile |
| 血 | 血 | 6 | 143 血 | ち | 2 | 衆 |  |
| 𠂢 **new** | 𠂢 | 6 | not a radical |  | 2 | 派脈 | the right of 派, 脈; new in the audit |
| 乑 **new** | 乑 | 6 | not a radical |  | 1 | 衆 | the bottom of 衆; new in the audit |
| 言 | 言 | 7 | 149 言 | げん; ごんべん | 71 | 議調話設 |  |
| 貝 | 貝 | 7 | 154 貝 | かい, かいへん | 56 | 員資側費 |  |
| 車 | 車 | 7 | 159 車 | くるま, くるまへん | 25 | 連軍運転 |  |
| 里 | 里 | 7 | 166 里 | さと | 23 | 動理野重 |  |
| 酉 | 酉 | 7 | 164 酉 | とりへん | 17 | 配酒尊酸 |  |
| 豕 | 豕 | 7 | 152 豕 | いのこ, ぶた | 14 | 家象隊劇 |  |
| 足 | 足 ⻊ | 7 | 157 足 | あし; ⻊ あしへん | 14 | 路踏躍露 |  |
| 豆 | 豆 | 7 | 151 豆 | まめ | 12 | 頭登短闘 |  |
| 甫 | 甫 | 7 | not a radical |  | 10 | 補捕博浦 | component, filed under 用 (101) |
| 臣 | 臣 | 7 | 131 臣 | しん | 10 | 蔵緊臨臓 |  |
| 見 | 見 | 7 | 147 見 | みる | 9 | 現規視親 |  |
| 余 | 余 | 7 | not a radical |  | 8 | 除途茶塗 | kanji, filed under 人 (9) |
| 辛 | 辛 | 7 | 160 辛 | からい | 8 | 辞避壁宰 |  |
| 谷 | 谷 | 7 | 150 谷 | たに | 7 | 容欲裕浴 |  |
| 走 | 走 | 7 | 156 走 | はしる, そうにょう | 7 | 起超徒越 |  |
| 辰 | 辰 | 7 | 161 辰 | しんのたつ | 7 | 農振震濃 |  |
| 我 | 我 | 7 | not a radical |  | 6 | 議義儀犠 | kanji, filed under 戈 (62) |
| 釆 | 釆 | 7 | 165 釆 | のごめ | 5 | 番審釈翻 |  |
| 呉 | 呉 | 7 | not a radical |  | 4 | 誤娯虞 | kanji, filed under 口 (30) |
| 身 | 身 | 7 | 158 身 | み | 4 | 射謝窮 |  |
| 角 | 角 | 7 | 148 角 | つの, つのへん | 3 | 解触 |  |
| 豸 | 豸 | 7 | 153 豸 | むじなへん | 3 | 懇墾貌 |  |
| 赤 | 赤 | 7 | 155 赤 | あか | 3 | 赦嚇 |  |
| 隹 | 隹 | 8 | 172 隹 | ふるとり | 40 | 進権集確 |  |
| 金 | 金 | 8 | 167 金 | かね; かねへん | 33 | 銀針録鉄 |  |
| 門 | 門 | 8 | 169 門 | もんがまえ | 16 | 間開問関 |  |
| 雨 | 雨 | 8 | 173 雨 | あめ; あめかんむり | 16 | 電震露需 |  |
| 青 | 青 | 8 | 174 靑 | あお | 7 | 情請清精 | the shinjitai 青 |
| 非 | 非 | 8 | 175 非 | あらず | 7 | 罪悲排俳 |  |
| 其 | 其 | 8 | not a radical |  | 6 | 期基旗棋 | component, filed under 八 (12) |
| 免 | 免 | 8 | not a radical |  | 4 | 勉晩逸 | kanji, filed under 儿 (10) |
| 垂 | 垂 | 8 | not a radical |  | 4 | 郵睡唾 | kanji, filed under 土 (32) |
| 岡 | 岡 | 8 | not a radical |  | 4 | 綱鋼剛 | kanji, filed under 山 (46) |
| 斉 | 斉 | 8 | 210 齊 | せい | 4 | 済剤斎 | the shinjitai 斉 |
| 長 | 長 | 8 | 168 長 | ながい | 4 | 張帳髪 |  |
| 頁 | 頁 | 9 | 181 頁 | おおがい | 25 | 題領額頭 |  |
| 音 | 音 | 9 | 180 音 | おと | 15 | 意職境識 |  |
| 食 | 食 飠 | 9 | 184 食 | しょく; 飠 しょくへん | 12 | 館養飲飯 |  |
| 咼 | 咼 | 9 | not a radical |  | 4 | 過渦鍋禍 | the inside of 過, 禍, 渦 |
| 爰 | 爰 | 9 | not a radical |  | 4 | 援緩暖媛 | the right of 援, 暖, 緩 |
| 革 | 革 | 9 | 177 革 | かくのかわ | 3 | 覇靴 |  |
| 首 | 首 | 9 | 185 首 | くび | 3 | 道導 |  |
| 面 | 面 | 9 | 176 面 | めん | 2 | 麺 |  |
| 風 | 風 | 9 | 182 風 | かぜ | 2 | 嵐 |  |
| 飛 | 飛 | 9 | 183 飛 | とぶ | 1 |  |  |
| 馬 | 馬 | 10 | 187 馬 | うま, うまへん | 13 | 験駅駐駆 |  |
| 鬼 | 鬼 | 10 | 194 鬼 | おに | 6 | 魅魔魂塊 |  |
| 兼 | 兼 | 10 | not a radical |  | 5 | 嫌謙鎌廉 | kanji, filed under 八 (12) |
| 韋 | 韋 | 10 | 178 韋 | なめしがわ | 5 | 違衛韓緯 |  |
| 冓 | 冓 | 10 | not a radical |  | 4 | 構講購溝 | the right of 構, 講, 購 |
| 竜 | 竜 | 10 | 212 龍 | りゅう | 4 | 襲滝籠 | the shinjitai 竜 |
| 骨 | 骨 | 10 | 188 骨 | ほね | 4 | 滑髄骸 |  |
| 袁 | 袁 | 10 | not a radical |  | 3 | 園遠猿 | the inside of 遠, 園 |
| 鬲 | 鬲 | 10 | 193 鬲 | かなえ | 2 | 融隔 |  |
| 曽 | 曽 | 11 | not a radical |  | 6 | 増層贈僧 | the right of 増, 層, 贈 |
| 啇 | 啇 | 11 | not a radical |  | 5 | 摘適敵滴 | the inside of 適, 敵, 滴 |
| 鳥 | 鳥 | 11 | 196 鳥 | とり | 5 | 島鳴鶴鶏 |  |
| 祭 | 祭 | 11 | not a radical |  | 4 | 際察擦 | kanji, filed under 示 (113) |
| 鹿 | 鹿 | 11 | 198 鹿 | しか | 3 | 麗麓 |  |
| 黄 | 黄 | 11 | 201 黃 | き | 2 | 横 | the shinjitai 黄 |
| 尞 | 尞 | 12 | not a radical |  | 4 | 療僚寮瞭 | the right of 僚, 寮, 療 |
| 㐮 | 㐮 | 13 | not a radical |  | 4 | 譲壌醸嬢 | the right of 譲, 嬢, 壌 |
| 監 | 監 | 15 | not a radical |  | 5 | 艦鑑藍濫 | kanji, filed under 皿 (108) |

### Glyph check

Tiles that showed a glyph not matching the shape it stood for, and what happened:

- **Fixed:** 人 for the roof 𠆢; 人 for 匕 (曷); 八 for 丷; 牛 for 牜 and ⺧; 足 for ⻊; 竹 for ⺮; 羊 for ⺷; 手 for 龵; 己 for 巳; 己 for 巴 (a new tile); 卩 for 㔾; 卩 for マ (領 齢); 宀 for 冖 (確 鶴); 月 for 且 (a new tile); 干 干 for 开.
- **Left as they are:**
  - 艮 drawn with 5 strokes in 即 節 既 概 郎 朗 廊 郷 響 爵 (艮 without its last stroke). Readers call it 艮.
  - 鳥 with 7 strokes in 島 (the bird without its feet, over 山). Readers call it 鳥.
  - 立 with 4 strokes in 商 傍 (its last line is the top of what's below).
  - 士 in 周 (週 調): Japanese fonts draw 土 there; the two are one stroke's length apart.
  - 余 in 茶: 茶's bottom has one stroke fewer than 余; readers call it 余.
  - 長 in 髪 is drawn 镸; readers call it 長.

## Every changed kanji

### Tiles or positions (160)

"In" is where the kanji is used: a main answer, another Keep word, or another kanji at N3 or easier. Blank: the rest of jōyō.

| Kanji | In | Before | After | |
|---|---|---|---|---|
| 内 | answer | 冂:bottom 人:top | 冂:outer 人:inner | hand fix |
| 開 | answer | 門:outer 干:inner 干:inner | 門:outer 一:inner 廾:inner |  |
| 実 | answer | 宀:top 一:bottom 夫:bottom | 宀:top 三:bottom 人:bottom |  |
| 午 | answer | 𠂉:top 干:bottom | 𠂉:top 十:bottom |  |
| 勝 | answer | 月:left 丶:right 丿:right 二:right 人:right 力:right | 月:left 𠔉:right 力:right |  |
| 画 | answer | 一:top 田:none 凵:bottom | 一:top 由:inner 凵:outer | hand fix |
| 組 | answer | 糸:left 月:right 一:right | 糸:left 且:right |  |
| 在 | answer | 一:top 亻:top 土:bottom | 一:top 亻:left 土:right | hand fix |
| 論 | answer | 言:left 人:right 一:right 冂:right 廾:right | 言:left 𠆢:right 一:right 冊:right |  |
| 両 | answer | 一:top 冂:none 山:none | 一:top 冂:outer 山:inner | hand fix |
| 確 | answer | 石:left 宀:right 隹:right | 石:left 冖:right 隹:right |  |
| 由 | answer | 日:bottom 丨:top | 由:whole |  |
| 研 | answer | 石:left 干:right 干:right | 石:left 一:right 廾:right |  |
| 残 | answer | 歹:left 一:right 一:right 戈:right | 歹:left 二:right 戈:right |  |
| 助 | answer | 月:left 一:left 力:right | 且:left 力:right |  |
| 形 | answer | 干:left 干:left 彡:right | 一:left 廾:left 彡:right |  |
| 存 | answer | 一:outer 亻:outer 子:inner | 一:top 亻:left 子:right | hand fix |
| 春 | answer | 一:top 一:top 大:top 日:bottom | 三:top 人:top 日:bottom |  |
| 色 | answer | 𠂊:top 己:bottom | 𠂊:top 巴:bottom |  |
| 絶 | answer | 糸:left 𠂊:right 己:right | 糸:left 𠂊:right 巴:right |  |
| 祖 | answer | 礻:left 月:right 一:right | 礻:left 且:right |  |
| 今 | Keep | 人:top 一:bottom 乙:bottom | 今:whole |  |
| 戦 | Keep | ⺍:left 日:left 一:left 丨:left 戈:right | ⺍:left 日:left 十:left 戈:right |  |
| 野 | Keep | 里:left 乙:right 丶:right 了:right | 里:left マ:right 了:right |  |
| 以 | Keep | 丨:left 丶:left 丶:left 人:right | 以:whole |  |
| 官 | Keep | 宀:top 口:bottom 乙:bottom 一:bottom | 宀:top 口:bottom 口:bottom |  |
| 演 | Keep | 氵:left 宀:right 一:right 日:right 丨:right 八:right | 氵:left 宀:right 一:right 由:right 八:right |  |
| 南 | Keep | 十:top 冂:bottom 丶:bottom 丿:bottom 干:bottom | 十:top 冂:bottom 丷:bottom 干:bottom |  |
| 神 | Keep | 礻:left 日:right 丨:right | 礻:left 申:right |  |
| 乗 | Keep | 丿:top 一:top 一:none 丨:left 丨:right 木:bottom | 禾:none 廿:none | hand fix |
| 念 | Keep | 人:top 一:top 乙:top 心:bottom | 今:top 心:bottom |  |
| 働 | Keep | 亻:left 丿:right 一:right 里:right 力:right | 亻:left 𠂉:right 里:right 力:right |  |
| 望 | Keep | 亡:top 王:bottom | 亡:top 月:top 王:bottom |  |
| 呼 | Keep | 口:left 丿:right 丶:right 丿:right 一:right 亅:right | 口:left 丿:right 丷:right 一:right 亅:right |  |
| 館 | Keep | 飠:left 宀:right 口:right 乙:right 一:right | 飠:left 宀:right 口:right 口:right |  |
| 顔 | Keep | 立:left 丿:left 彡:left 頁:right | 立:left 厂:left 彡:left 頁:right |  |
| 喜 | Keep | 士:top 口:top 丶:bottom 丿:bottom 一:bottom 口:bottom | 士:top 口:top 丷:bottom 一:bottom 口:bottom |  |
| 似 | Keep | 亻:left 丨:right 丶:right 丶:right 人:right | 亻:left 以:right |  |
| 吸 | Keep | 口:left 丿:right 又:right | 口:left 及:right |  |
| 三 | N3 | 二:top 一:bottom | 三:whole |  |
| 優 | N3 | 亻:left 一:right 丿:right 日:right 冖:right 心:right 夂:right | 亻:left 一:right 白:right 冖:right 心:right 夂:right |  |
| 申 | N3 | 日:none 丨:none | 申:whole |  |
| 許 | N3 | 言:left 𠂉:right 干:right | 言:left 𠂉:right 十:right |  |
| 御 | N3 | 彳:left 𠂉:right 干:right 卜:right 丨:right 丶:right 卩:right | 彳:left 𠂉:right 一:right 止:right 卩:right |  |
| 領 |  | 人:left 一:left 卩:left 頁:right | 𠆢:left 一:left マ:left 頁:right |  |
| 派 |  | 氵:left 丿:right 丿:right 亻:right 丿:right 丶:right | 氵:left 𠂢:right |  |
| 査 |  | 木:top 月:bottom 一:bottom | 木:top 且:bottom |  |
| 象 |  | 𠂊:top 丨:bottom 乙:bottom 丨:bottom 豕:bottom | 𠂊:top 口:bottom 豕:bottom |  |
| 衆 |  | 血:top 亻:bottom 丿:bottom 丿:bottom 丿:bottom 丶:bottom | 血:top 乑:bottom | hand fix |
| 評 |  | 言:left 干:right 丶:right 丿:right | 言:left 干:right 丷:right |  |
| 含 |  | 人:top 一:top 乙:top 口:bottom | 今:top 口:bottom |  |
| 型 |  | 干:top 干:top 刂:top 土:bottom | 一:top 廾:top 刂:top 土:bottom |  |
| 専 |  | 一:top 日:top 丨:top 寸:bottom | 一:top 由:top 寸:bottom |  |
| 管 |  | 竹:top 宀:bottom 口:bottom 乙:bottom 一:bottom | ⺮:top 宀:bottom 口:bottom 口:bottom |  |
| 及 |  | 丿:left 又:right | 及:whole |  |
| 編 |  | 糸:left 戸:right 冂:right 廾:right | 糸:left 戸:right 冊:right |  |
| 捜 |  | 扌:left 日:right 丨:right 又:right | 扌:left 申:right 又:right |  |
| 従 |  | 彳:left 丶:right 丿:right 疋:right | 彳:left 丷:right 疋:right |  |
| 隊 |  | 阝:left 丶:right 丿:right 豕:right | 阝:left 丷:right 豕:right |  |
| 献 |  | 十:left 冂:left 丶:left 丿:left 干:left 犬:right | 十:left 冂:left 丷:left 干:left 犬:right |  |
| 邦 |  | 一:left 一:left 一:left 丿:left 阝:right | 三:left 丨:left 阝:right |  |
| 益 |  | 丶:top 丿:top 一:top 八:top 皿:bottom | 丷:top 一:top 八:top 皿:bottom |  |
| 逆 |  | 丶:inner 丿:inner 一:inner 凵:inner 丿:inner 辶:outer | 丷:inner 一:inner 凵:inner 丿:inner 辶:outer |  |
| 油 |  | 氵:left 日:right 丨:right | 氵:left 由:right |  |
| 輪 |  | 車:left 人:right 一:right 冂:right 廾:right | 車:left 𠆢:right 一:right 冊:right |  |
| 伸 |  | 亻:left 日:right 丨:right | 亻:left 申:right |  |
| 狙 |  | 犭:left 月:right 一:right | 犭:left 且:right |  |
| 善 |  | 羊:top 丶:top 丿:top 一:top 口:bottom | 羊:top 丷:top 一:top 口:bottom |  |
| 齢 |  | 止:left 米:left 凵:left 人:right 一:right 卩:right | 止:left 米:left 凵:left 𠆢:right 一:right マ:right |  |
| 承 |  | 了:none 一:none 一:none 一:none 水:none | 了:none 三:none 水:none |  |
| 級 |  | 糸:left 丿:right 又:right | 糸:left 及:right |  |
| 締 |  | 糸:left 亠:right 丶:right 丿:right 冖:right 巾:right | 糸:left 亠:right 丷:right 冖:right 巾:right |  |
| 弾 |  | 弓:left ⺍:right 日:right 一:right 丨:right | 弓:left ⺍:right 日:right 十:right |  |
| 像 |  | 亻:left 𠂊:right 丨:right 乙:right 丨:right 豕:right | 亻:left 𠂊:right 口:right 豕:right |  |
| 刑 |  | 干:left 干:left 刂:right | 一:left 廾:left 刂:right |  |
| 掲 |  | 扌:left 日:right 勹:right 人:right | 扌:left 日:right 勹:right 匕:right |  |
| 恵 |  | 一:top 日:top 丨:top 心:bottom | 一:top 由:top 心:bottom |  |
| 届 |  | 尸:outer 日:inner 丨:inner | 尸:outer 由:inner |  |
| 衝 |  | 行:outer 丿:inner 一:inner 里:inner | 行:outer 𠂉:inner 里:inner |  |
| 宙 |  | 宀:top 日:bottom 丨:bottom | 宀:top 由:bottom |  |
| 銭 |  | 金:left 一:right 一:right 戈:right | 金:left 二:right 戈:right |  |
| 扱 |  | 扌:left 丿:right 又:right | 扌:left 及:right |  |
| 奏 |  | 一:top 一:top 一:top 人:top 一:bottom 大:bottom | 三:top 人:top 一:bottom 大:bottom |  |
| 華 |  | 艹:top 一:bottom 一:bottom 丨:bottom 丨:bottom 一:bottom 一:bottom 丨:bottom | 艹:top 一:bottom 廿:bottom 一:bottom 丨:bottom |  |
| 僕 |  | 亻:left 业:right 丶:right 丿:right 一:right 一:right 一:right 人:right | 亻:left 业:right 丷:right 一:right 夫:right |  |
| 寿 |  | 一:top 一:top 一:top 丿:none 寸:bottom | 三:top 丿:none 寸:bottom |  |
| 浅 |  | 氵:left 一:right 一:right 戈:right | 氵:left 二:right 戈:right |  |
| 縦 |  | 糸:left 彳:right 丶:right 丿:right 疋:right | 糸:left 彳:right 丷:right 疋:right |  |
| 軸 |  | 車:left 日:right 丨:right | 車:left 由:right |  |
| 帝 |  | 亠:top 丶:top 丿:top 冖:top 巾:bottom | 亠:top 丷:top 冖:top 巾:bottom |  |
| 阻 |  | 阝:left 月:right 一:right | 阝:left 且:right |  |
| 泰 |  | 一:top 一:top 大:top 氺:bottom | 三:top 人:top 氺:bottom |  |
| 撲 |  | 扌:left 业:right 丶:right 丿:right 一:right 一:right 一:right 人:right | 扌:left 业:right 丷:right 一:right 夫:right |  |
| 冊 |  | 冂:none 廾:none | 冊:whole |  |
| 倫 |  | 亻:left 人:right 一:right 冂:right 廾:right | 亻:left 𠆢:right 一:right 冊:right |  |
| 偏 |  | 亻:left 戸:right 冂:right 廾:right | 亻:left 戸:right 冊:right |  |
| 狭 |  | 犭:left 大:right 人:right 人:right 大:right | 犭:left 夹:right |  |
| 鶴 |  | 宀:left 隹:left 鳥:right | 冖:left 隹:left 鳥:right |  |
| 陰 |  | 阝:left 人:right 一:right 乙:right 二:right 厶:right | 阝:left 今:right 二:right 厶:right |  |
| 騰 |  | 月:left 丶:right 丿:right 二:right 人:right 馬:right | 月:left 𠔉:right 馬:right |  |
| 遂 |  | 丶:inner 丿:inner 豕:inner 辶:outer | 丷:inner 豕:inner 辶:outer |  |
| 抽 |  | 扌:left 日:right 丨:right | 扌:left 由:right |  |
| 拝 |  | 扌:left 一:right 一:right 一:right 一:right 丨:right | 扌:left 一:right 三:right 丨:right |  |
| 棒 |  | 木:left 一:right 一:right 大:right 一:right 一:right 丨:right | 木:left 三:right 人:right 干:right |  |
| 墜 |  | 阝:top 丶:top 丿:top 豕:top 土:bottom | 阝:top 丷:top 豕:top 土:bottom |  |
| 肥 |  | 月:left 己:right | 月:left 巴:right |  |
| 脈 |  | 月:left 丿:right 丿:right 亻:right 丿:right 丶:right | 月:left 𠂢:right |  |
| 勲 |  | 丿:top 一:top 里:top 力:top 灬:bottom | 𠂉:top 里:top 力:top 灬:bottom |  |
| 卸 |  | 𠂉:left 干:left 卜:left 丨:left 丶:left 卩:right | 𠂉:left 一:left 止:left 卩:right |  |
| 把 |  | 扌:left 己:right | 扌:left 巴:right |  |
| 践 |  | 足:left 一:right 一:right 戈:right | ⻊:left 二:right 戈:right |  |
| 琴 |  | 王:top 王:top 人:bottom 一:bottom 乙:bottom | 王:top 王:top 今:bottom |  |
| 奉 |  | 一:top 一:top 大:top 一:bottom 一:bottom 丨:bottom | 三:top 人:top 干:bottom |  |
| 憂 |  | 一:top 丿:top 日:top 冖:top 心:bottom 夂:bottom | 一:top 白:top 冖:top 心:bottom 夂:bottom |  |
| 穂 |  | 禾:left 一:right 日:right 丨:right 心:right | 禾:left 一:right 由:right 心:right |  |
| 畳 |  | 田:top 冖:bottom 月:bottom 一:bottom | 田:top 冖:bottom 且:bottom |  |
| 粗 |  | 米:left 月:right 一:right | 米:left 且:right |  |
| 縫 |  | 糸:left 夂:right 一:right 一:right 一:right 丨:right 辶:right | 糸:left 夂:right 三:right 丨:right 辶:right |  |
| 宜 |  | 宀:top 月:bottom 一:bottom | 宀:top 且:bottom |  |
| 紳 |  | 糸:left 日:right 丨:right | 糸:left 申:right |  |
| 坪 |  | 土:left 干:right 丶:right 丿:right | 土:left 干:right 丷:right |  |
| 峡 |  | 山:left 大:right 人:right 人:right 大:right | 山:left 夹:right |  |
| 俸 |  | 亻:left 一:right 一:right 大:right 一:right 一:right 丨:right | 亻:left 三:right 人:right 干:right |  |
| 峰 |  | 山:left 夂:right 一:right 一:right 一:right 丨:right | 山:left 夂:right 三:right 丨:right |  |
| 遍 |  | 戸:inner 冂:inner 廾:inner 辶:outer | 戸:inner 冊:inner 辶:outer |  |
| 薫 |  | 艹:top 丿:bottom 一:bottom 里:bottom 灬:bottom | 艹:top 𠂉:bottom 里:bottom 灬:bottom |  |
| 喝 |  | 口:left 日:right 勹:right 人:right | 口:left 日:right 勹:right 匕:right |  |
| 挟 |  | 扌:left 大:right 人:right 人:right 大:right | 扌:left 夹:right |  |
| 禅 |  | 礻:left ⺍:right 日:right 一:right 丨:right | 礻:left ⺍:right 日:right 十:right |  |
| 譜 |  | 言:left 丶:right 丿:right 一:right 业:right 日:right | 言:left 丷:right 一:right 业:right 日:right |  |
| 笛 |  | 竹:top 丨:bottom 乙:bottom 丨:bottom 一:bottom 一:bottom | ⺮:top 由:bottom |  |
| 拳 |  | 丶:top 丿:top 二:top 人:top 手:bottom | 𠔉:top 手:bottom |  |
| 渇 |  | 氵:left 日:right 勹:right 人:right | 氵:left 日:right 勹:right 匕:right |  |
| 吟 |  | 口:left 人:right 一:right 乙:right | 口:left 今:right |  |
| 袖 |  | 衤:left 日:right 丨:right | 衤:left 由:right |  |
| 鋳 |  | 金:left 一:right 一:right 一:right 丿:right 寸:right | 金:left 三:right 丿:right 寸:right |  |
| 謹 |  | 言:left 艹:right 口:right 丨:right 一:right 一:right 一:right | 言:left 艹:right 口:right 王:right | hand fix |
| 租 |  | 禾:left 月:right 一:right | 禾:left 且:right |  |
| 桟 |  | 木:left 一:right 一:right 戈:right | 木:left 二:right 戈:right |  |
| 膳 |  | 月:left 羊:right 丶:right 丿:right 一:right 口:right | 月:left 羊:right 丷:right 一:right 口:right |  |
| 腫 |  | 月:left 丿:right 一:right 里:right | 月:left 𠂉:right 里:right |  |
| 棺 |  | 木:left 宀:right 口:right 乙:right 一:right | 木:left 宀:right 口:right 口:right |  |
| 褐 |  | 衤:left 日:right 勹:right 人:right | 衤:left 日:right 勹:right 匕:right |  |
| 繕 |  | 糸:left 羊:right 丶:right 丿:right 一:right 口:right | 糸:left 羊:right 丷:right 一:right 口:right |  |
| 艶 |  | 曲:left 豆:left 𠂊:right 己:right | 曲:left 豆:left 𠂊:right 巴:right |  |
| 蜂 |  | 虫:left 夂:right 一:right 一:right 一:right 丨:right | 虫:left 夂:right 三:right 丨:right |  |
| 謄 |  | 月:left 丶:right 丿:right 一:right 大:right 言:right | 月:left 𠔉:right 言:right | hand fix |
| 嗣 |  | 口:left 冂:left 一:left 廾:left 司:right | 口:left 冊:left 司:right |  |
| 諦 |  | 言:left 亠:right 丶:right 丿:right 冖:right 巾:right | 言:left 亠:right 丷:right 冖:right 巾:right |  |
| 且 |  | 月:top 一:bottom | 且:whole |  |
| 僅 |  | 亻:left 廿:right 丨:right 乙:right 一:right 丨:right 一:right 一:right 一:right | 亻:left 廿:right 口:right 王:right | hand fix |
| 塑 |  | 丶:top 丿:top 一:top 凵:top 丿:top 月:top 土:bottom | 丷:top 一:top 凵:top 丿:top 月:top 土:bottom |  |
| 塞 |  | 宀:top 一:top 丨:top 丨:top 一:top 一:top 八:top 土:bottom | 宀:top 共:top 一:top 土:bottom | hand fix |
| 捻 |  | 扌:left 人:right 一:right 乙:right 心:right | 扌:left 今:right 心:right |  |
| 柵 |  | 木:left 冂:right 廾:right | 木:left 冊:right |  |
| 痩 |  | 疒:outer 日:inner 丨:inner 又:inner | 疒:outer 申:inner 又:inner |  |
| 謁 |  | 言:left 日:right 勹:right 人:right | 言:left 日:right 勹:right 匕:right |  |
| 貪 |  | 人:top 一:top 乙:top 貝:bottom | 今:top 貝:bottom |  |
| 遡 |  | 丶:inner 丿:inner 一:inner 凵:inner 丿:inner 月:inner 辶:outer | 丷:inner 一:inner 凵:inner 丿:inner 月:inner 辶:outer |  |
| 頰 |  | 大:left 人:left 人:left 頁:right | 夾:left 頁:right |  |

### Only the glyph shown (113)

Same tiles in the same places, so scoring is unchanged.

| Shown | Kanji | Which |
|---|---|---|
| 人 → 𠆢 | 34 | 会合全験命答給冷険絵界企検幹介創令鈴診倉舎零捨剣珍舗搭拾傘塔栓脊倹詮 |
| 竹 → ⺮ | 22 | 答等笑箱第策算筋築籍節簡範筆簿筒符篤箸箇箋籠 |
| 八 → 丷 | 15 | 前平説弟税並普脱尊鋭悦猶閲煎遵 |
| 己 → 巳 | 9 | 選港抱包砲胞飽泡遷 |
| 足 → ⻊ | 10 | 路踏躍露跡距踊跳蹴踪 |
| 羊 → ⺷ | 9 | 議差義儀養犠窯羨羞 |
| 卩 → 㔾 | 8 | 犯危範腕厄怨氾宛 |
| 牛 → 牜 | 5 | 物特犠牲牧 |
| 牛 → ⺧ | 3 | 告造酷 |
| 手 → 龵 | 1 | 看 |

## Left alone, and why

- **Readable splits with a loose stroke:** 主 = 丶 + 王 (住 注 柱 駐), 千 = 丿 + 十, 少 = 小 + 丿 (歩 秒 省 砂), 失 = 丿 + 夫, 太 = 大 + 丶, 系 = 丿 + 糸 (係 孫), 丁 = 一 + 亅 (打 町 頂 灯), 七 = 一 + 乙 (切), 丸 = 九 + 丶 (熱 勢), 凡 = 几 + 丶 (恐), 勺 = 勹 + 丶 (約 的), 壬 = 丿 + 士 (任 庭 賃), 必 = 心 + 丿, 直 = 十 目 乙 (値 置), 中 = 口 + 丨, 引 = 弓 + 丨, 事 = 一 口 ヨ 亅. A reader sees these pieces. They still keep their words out of the main list (the loose-stroke rule), which is a game choice, not an accuracy problem.
- **Shapes no reader names:** 段's left (鍛), 候's middle (喉), 旅's lower right, 為 偽, 乏 芝 (之), 民 眠's top, 決 快's 夬, 収's left, 宅 託's 乇, 迎 仰's 卬, 世, 呼's 乎. Any split is strokes; no tile would be one players know.
- **Rare kanji (N1 or later) with stroke salads:** 鬱 麗 慶 薦 遣 暇 郷 響 嘱 属 展 擁 眉 羞 興 畏 酬 華 環 還. None is in a candidate word.
- **葛:** it keeps 日 勹 人 乙. The jōyō 葛 has the older 曷 (人 and 乚 inside 勹), unlike 渇's 匕.
- **別:** 口 勹 刂, as KanjiVG draws it. Some dictionaries call the bottom 力; the stroke doesn't cross, so 勹 is the shape.
- **業 様:** 业 羊 木 and 木 羊 氺. 羊 shares strokes with 木 and 氺, and readers learn them this way.
- **⺌ ⺍ and 小:** three tiles for one radical (42). Merging them would change scoring for 55 kanji, so it is a question for the user (below).

## For the user to decide

1. **New tiles:** 12, each a judgment call. The ones with fewest kanji: 以 (以 似), 𠂢 (派 脈), 乑 (衆, only one kanji). Dropping one brings back its old split.
2. **三 for 春:** 春 is 三 人 日, the reading players learn. 実 follows (宀 三 人), so its step 1 hand fix (宀 一 夫) left. The other reading is 二 大 日.
3. **今 and 以 as tiles:** "The rest stay out" (docs/DESIGN.md, "The puzzle") said a tile for 今 or 以 wouldn't bring words back. They're tiles now for accuracy. 今度 and 今後 came back; 今日 has 2 parts.
4. **关 and 𠔉:** the inside of 送 and the top of 券 look nearly the same, but are two tiles (as KanjiVG and Unicode have them). **The user's call (2026-11-10): keep them apart for now; they could be merged.** Both are written with the same six strokes in the same order (㇔ ㇒ ㇐ ㇐ ㇒ ㇏), so as keys they'd be hard to tell apart (docs/DESIGN.md, "Look-alike tiles stay apart for now").
5. **⺌ ⺍ 小:** one radical as three tiles. **The user's call (2026-11-10): keep them apart for now; ⺌ could become a form of 小.** ⺌ is written like 小 (middle first); ⺍ is written left to right like ツ, so it would stay its own tile even then.
6. **勝:** a day already played (8), it keeps its slot, but it has 3 parts now (月 𠔉 力). With no dailies, it can come up as a 3-part random game.
7. **乗:** a hand fix makes it 禾 with 廿 across its middle (the old 乘 had 北 there). The other choice was 𠂉 + a 卄 shape + 木.
8. **Display forms on phones:** 13 new glyphs aren't in JIS X 0213 and get KanjiVG drawings (丷 㔾 牜 ⻊ ⺮ 夹, and 龵, which isn't in Noto either). Check `review/parts.html` on a phone.
