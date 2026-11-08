import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreGuess, scoreParts, scoreOrder, allHit, layoutOf, MARKS } from '../js/engine/score.js';
import { KANJI } from './fixture-kanji.js';
import { slots, marks } from './helpers.js';

const score1 = (guess, answer) => scoreGuess(slots(guess), slots(answer))[0];

test('the worked example in DESIGN.md: answer 明', () => {
  assert.deepEqual(marks(score1('間', '明')), ['miss', 'near']);          // 門 grey, 日 inside not left
  assert.deepEqual(marks(score1('時', '明')), ['hit', 'miss', 'miss']);   // 日 green, 土 寸 grey
  assert.deepEqual(marks(score1('明', '明')), ['hit', 'hit']);
});

test('repeated parts: never more marks than the answer has copies', () => {
  assert.deepEqual(marks(score1('森', '林')), ['near', 'near', 'miss']);  // two 木, not three
  assert.deepEqual(marks(score1('林', '休')), ['miss', 'hit']);           // the green uses up the only 木
  assert.deepEqual(marks(score1('語', '品')), ['miss', 'miss', 'near']);  // one 口 guessed, one mark
  assert.deepEqual(marks(score1('林', '森')), ['near', 'near']);
  assert.deepEqual(marks(score1('品', '品')), ['hit', 'hit', 'hit']);
});

test('greens are found before yellows, whatever the stroke order', () => {
  // 体 = 亻 left, 木 right, 一 right; 本 = 木 top, 一 bottom.
  assert.deepEqual(marks(score1('本', '体')), ['near', 'near']);
  // 森's first 木 is top: against 本 (木 top) it's green and the others miss.
  assert.deepEqual(marks(score1('森', '本')), ['hit', 'miss', 'miss']);
});

test('variant forms score as their tile', () => {
  const row = score1('水', '海');   // 水 whole vs 氵 left
  assert.deepEqual(marks(row), ['near']);
  assert.equal(row.tiles[0].form, '水');
  const same = score1('海', '海');
  assert.equal(same.tiles[0].form, '氵', 'the tile keeps the glyph it appears as');
  assert.equal(same.tiles[0].el, '水');
});

test('positions must match exactly', () => {
  assert.deepEqual(marks(score1('唄', '中')), ['near', 'miss']);   // 口 left vs 口 none
  assert.deepEqual(marks(score1('唄', '員')), ['near', 'near']);   // same parts, other places
  assert.deepEqual(marks(score1('古', '右')), ['miss', 'hit']);    // 口 bottom in both
  assert.deepEqual(marks(score1('日', '明')), ['near']);           // whole only matches whole
});

test('look-alikes are all green but not the answer', () => {
  const scored = scoreGuess(slots('末'), slots('未'));
  assert.ok(allHit(scored));
  assert.equal(scored[0].solved, false);
});

test('each mark points at its own answer part', () => {
  const row = score1('森', '林');
  const refs = row.tiles.filter((t) => t.of).map((t) => `${t.of.slot}:${t.of.part}`);
  assert.equal(new Set(refs).size, refs.length);
  row.tiles.forEach((t) => assert.equal(t.of === null, t.mark === 'miss'));
});

test('one kanji: for every pair of fixture kanji, marks per tile = the smaller count', () => {
  const chars = Object.keys(KANJI);
  const count = (parts, el) => parts.filter((p) => p.el === el).length;
  chars.forEach((g) => chars.forEach((a) => {
    const row = score1(g, a);
    const gp = KANJI[g].parts;
    const ap = KANJI[a].parts;
    new Set(gp.map((p) => p.el)).forEach((el) => {
      const marked = row.tiles.filter((t) => t.el === el && t.mark !== 'miss').length;
      assert.equal(marked, Math.min(count(gp, el), count(ap, el)), `${g} vs ${a}, ${el}`);
    });
    row.tiles.forEach((t) => {
      assert.notEqual(t.mark, 'other', 'one kanji never marks other');
      if (t.mark === 'hit') assert.ok(ap.some((p) => p.el === t.el && p.pos === t.pos));
    });
    if (g === a) assert.ok(allHit([row]));
  }));
});

test('longer words: per-slot marks plus "other"', () => {
  const [one, two] = scoreGuess(slots('本日'), slots('日本'));
  assert.deepEqual(marks(one), ['other', 'other']);   // 木 and 一 are in 本
  assert.deepEqual(marks(two), ['other']);            // 日 is in slot 1
  assert.equal(one.solved || two.solved, false);
  assert.deepEqual(one.tiles.map((t) => t.of), [{ slot: 1, part: 0 }, { slot: 1, part: 1 }]);

  const solved = scoreGuess(slots('日本'), slots('日本'));
  assert.ok(solved.every((s) => s.solved));
  assert.ok(allHit(solved));
});

test('"other" only uses answer parts nothing else has marked', () => {
  // 明日 vs 日本: 明's 日 is yellow in slot 1 and uses up the answer's 日,
  // so slot 2's 日 has nothing left to point at.
  const [one, two] = scoreGuess(slots('明日'), slots('日本'));
  assert.deepEqual(marks(one), ['near', 'miss']);
  assert.deepEqual(marks(two), ['miss']);

  // Four 口 guessed against a word with one 口 (語): one other, the rest miss.
  const scored = scoreGuess(slots('品口日'), slots('日本語'));
  assert.deepEqual(scored.map(marks), [['other', 'miss', 'miss'], ['miss'], ['other']]);
  assert.deepEqual(scored[0].tiles[0].of, { slot: 2, part: 2 });   // 語's 口
  assert.deepEqual(scored[2].tiles[0].of, { slot: 0, part: 0 });   // the answer's 日
});

test('"other" never replaces a mark from the kanji\'s own slot', () => {
  // 林本 vs 本林: slot 1 林 vs 本 has a yellow 木; it stays yellow.
  const [one] = scoreGuess(slots('林本'), slots('本林'));
  assert.deepEqual(marks(one), ['near', 'other']);
});

test('the guess and answer must be the same length', () => {
  assert.throws(() => scoreGuess(slots('日'), slots('日本')));
});

test('marks run weakest to strongest', () => {
  assert.deepEqual(MARKS, ['miss', 'other', 'near', 'hit']);
});

test('layout is the distinct positions in stroke order', () => {
  assert.deepEqual(layoutOf(KANJI['明'].parts), ['left', 'right']);
  assert.deepEqual(layoutOf(KANJI['間'].parts), ['outer', 'inner']);
  assert.deepEqual(layoutOf(KANJI['品'].parts), ['top', 'bottom']);
  assert.deepEqual(layoutOf(KANJI['水'].parts), ['whole']);
});

// ── Parts guesses (levels.js guess: 'parts') ────────────────────────

test('parts: green when the answer has the part, wherever it sits', () => {
  const [slot] = scoreParts([['月', '日']], slots('明'));
  assert.deepEqual(marks(slot), ['hit', 'hit']);
  assert.deepEqual(slot.tiles.map((t) => t.pos), ['right', 'left'], 'a hit takes its answer part\'s place');
  assert.equal(slot.solved, true);
  assert.equal(slot.kanji, '明');
});

test('parts: repeated parts mark only as many copies as the answer has', () => {
  const [slot] = scoreParts([['木', '木', '口']], slots('森'));
  assert.deepEqual(marks(slot), ['hit', 'hit', 'miss']);
  assert.equal(slot.solved, false);
  assert.equal(slot.kanji, null);
  const [more] = scoreParts([['木', '木']], slots('林'));
  assert.equal(more.solved, true);
});

test('parts: longer words mark parts in another kanji as "other"', () => {
  // 日本: 日 (one part), 本 (木, 一).
  const [one, two] = scoreParts([['木'], ['日', '一']], slots('日本'));
  assert.deepEqual(marks(one), ['other']);
  assert.deepEqual(marks(two), ['other', 'hit']);
});

test('parts with places: green in the cell\'s place, yellow elsewhere in the kanji', () => {
  assert.deepEqual(marks(scoreParts([['月', '日']], slots('明'), [['left', 'right']])[0]), ['near', 'near']);
  const [won] = scoreParts([['日', '月']], slots('明'), [['left', 'right']]);
  assert.deepEqual(marks(won), ['hit', 'hit']);
  assert.equal(won.solved, true);
  // 時: 日 left, 土 right, 寸 right.
  assert.deepEqual(marks(scoreParts([['土', '日', '寸']], slots('時'), [['left', 'right', 'right']])[0]), ['near', 'near', 'hit']);
  // Parts sharing a place can go in either of its cells.
  assert.deepEqual(marks(scoreParts([['日', '寸', '土']], slots('時'), [['left', 'right', 'right']])[0]), ['hit', 'hit', 'hit']);
  // 森: 木 top, 木 bottom ×2. Three 木 picked, all green; a 口 is grey.
  assert.deepEqual(marks(scoreParts([['口', '木', '木']], slots('森'), [['top', 'bottom', 'bottom']])[0]), ['miss', 'hit', 'hit']);
});

// ── In order (levels.js order) ───────────────────────────────────────

const answerOf = (word) => [...word].map((kanji) => ({ kanji, parts: KANJI[kanji].parts }));
const flatMarks = (scored) => scored.flatMap((slot) => slot.tiles.map((t) => t.mark));

test('in order: green in the right cell, yellow anywhere else in the word', () => {
  // 時間: 日 土 寸 | 門 日
  const scored = scoreOrder([['日', '寸', '門'], ['土', '口']], answerOf('時間'));
  assert.deepEqual(flatMarks(scored), ['hit', 'near', 'near', 'near', 'miss']);
  assert.deepEqual(scored.map((slot) => slot.solved), [false, false]);
});

test('in order: each cell takes its answer cell\'s place, and greens use up parts first', () => {
  const scored = scoreOrder([['日', '日', '日'], ['門', '日']], answerOf('時間'));
  assert.deepEqual(flatMarks(scored), ['hit', 'miss', 'miss', 'hit', 'hit'], 'two 日 in the answer, both green');
  assert.deepEqual(scored[0].tiles.map((t) => t.pos), ['left', 'right', 'right']);
  assert.equal(scored[1].solved, true);
  assert.equal(scored[1].kanji, '間');
});

test('in order: the kanji a cell sits in doesn\'t change its mark', () => {
  // 日本: 日 | 木 一. The same three parts, split another way, score the same.
  assert.deepEqual(flatMarks(scoreOrder([['木'], ['日', '一']], answerOf('日本'))), ['near', 'near', 'hit']);
  assert.ok(allHit(scoreOrder([['日'], ['木', '一']], answerOf('日本'))));
});
