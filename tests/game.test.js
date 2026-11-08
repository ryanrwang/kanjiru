import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/engine/game.js';
import { KNOWN_EFFECTS, POWERS, MODE } from '../js/registry.js';
import { fixtureData, testConfig, start } from './helpers.js';

// Most tests use a palette bigger than the fixture's tiles, so every
// fixture kanji can be guessed; the palette test makes it small.
const bigPalette = () => {
  const config = testConfig();
  config.modes.forEach((m) => { m.palette = 999; });
  return config;
};
const words = { '日本': { reading: 'にほん', meanings: ['Japan'] } };
const setup = (config = bigPalette(), options) => createEngine(fixtureData({ words }), config, options);

// Plays steps in order, failing on any error: words, '!power', or for
// parts levels a list of tile ids (one kanji) or a list of lists.
function play(engine, state, ...steps) {
  return steps.reduce((s, step) => {
    const picks = Array.isArray(step) ? (Array.isArray(step[0]) ? step : [step]) : null;
    const r = picks ? engine.guess(s, picks)
      : step.startsWith('!') ? engine.usePower(s, step.slice(1)) : engine.guess(s, step);
    assert.equal(r.error, undefined, `${step}: ${r.error}`);
    return r.state;
  }, state);
}

test('a game is won by guessing the answer', () => {
  const engine = setup();
  let game = engine.newGame(start('k1', '明'));
  assert.equal(game.status, 'playing');
  assert.equal(game.rows, 6);
  game = play(engine, game, '間', '時', '明');
  assert.equal(game.status, 'won');
  assert.deepEqual(game.guesses.map((g) => g.word), ['間', '時', '明']);
  assert.equal(engine.guess(game, '林').error, 'over');
});

test('a game is lost when the rows run out', () => {
  const engine = setup();
  const game = play(engine, engine.newGame(start('k1', '明')), '間', '月', '時', '林', '森', '品');
  assert.equal(game.status, 'lost');
  assert.equal(engine.guess(game, '明').error, 'over');
});

test('guesses that are turned away use no row', () => {
  const engine = setup(bigPalette(), { isWord: (w) => w !== '本日' });
  const game = play(engine, engine.newGame(start('k1', '明')), '間');
  assert.equal(engine.guess(game, '日本').error, 'length');
  assert.equal(engine.guess(game, 'ア').error, 'not-kanji');
  assert.equal(engine.guess(game, '鬱').error, 'not-kanji', 'not in the data');
  assert.equal(engine.guess(game, '間').error, 'repeat');
  assert.equal(engine.guess(game, '間').state, game);
  const two = engine.newGame(start('k2', '日本'));
  assert.equal(engine.guess(two, '本日').error, 'not-a-word');
});

test('guesses must be built from the palette', () => {
  const config = testConfig();
  config.modes.find((m) => m.id === 'k1').palette = 8;   // 日 月 + six strokes
  const engine = createEngine(fixtureData(), config);
  const game = engine.newGame(start('k1', '明'));
  assert.equal(game.palette.length, 8);
  assert.ok(game.palette.includes('日') && game.palette.includes('月'));
  assert.equal(engine.guess(game, '明').error, undefined);
  assert.equal(engine.guess(game, '間').error, 'not-in-palette');   // 門 isn't there
  const free = createEngine(fixtureData(), { ...config, rules: { ...config.rules, guessFromPalette: false } });
  assert.equal(free.guess(free.newGame(start('k1', '明')), '間').error, undefined);
});

test('a new game checks its answer and mode', () => {
  const engine = setup();
  assert.throws(() => engine.newGame(start('k9', '明')));
  assert.throws(() => engine.newGame(start('k1', '日本')));
  assert.throws(() => engine.newGame(start('k1', '鬱')));
});

test('calls never change the state they are given', () => {
  const engine = setup();
  const game = engine.newGame(start('k1', '明'));
  const before = JSON.stringify(game);
  engine.guess(game, '時');
  engine.usePower(game, 'strokes');
  assert.equal(JSON.stringify(game), before);
});

test('points: parts the first time, upgrades pay the difference, then the win', () => {
  const engine = setup();
  let game = engine.newGame(start('k1', '明'));
  game = play(engine, game, '間');          // 日 yellow: +4
  assert.equal(engine.points(game).parts, 4);
  game = play(engine, game, '時');          // 日 green: +6 more
  assert.equal(engine.points(game).parts, 10);
  game = play(engine, game, '明');          // 日 again: 0; 月 green: +10
  assert.deepEqual(engine.points(game), { parts: 20, solve: 130, multiplier: 1, total: 150 });
});

test('points: practice and mode multipliers, rounded at the end', () => {
  const engine = setup();
  const practice = play(engine, engine.newGame(start('k1', '明', { daily: false })), '間', '時', '明');
  assert.equal(engine.points(practice).total, 75);   // 150 × 0.5
  const word = play(engine, engine.newGame(start('k2', '日本', { daily: false })), '日本');
  // parts 3 × 10, win 100 + 10 × 5, × 1.5 × 0.5
  assert.deepEqual(engine.points(word), { parts: 30, solve: 150, multiplier: 0.75, total: 135 });
});

test('points: part points pay on a loss, the win bonus does not', () => {
  const engine = setup();
  // 日 yellow (4), 月 yellow (4), 日 green (+6); 月 never goes green.
  const game = play(engine, engine.newGame(start('k1', '明')), '間', '月', '時', '林', '森', '品');
  assert.deepEqual(engine.points(game), { parts: 14, solve: 0, multiplier: 1, total: 14 });
});

test('points: "other" marks pay in longer words', () => {
  const engine = setup();
  const game = play(engine, engine.newGame(start('k2', '日本')), '本日');
  assert.equal(engine.points(game).parts, 3);   // three parts marked other, 1 each
});

test('points: parts a power reveals pay nothing later', () => {
  const engine = setup();
  const game = play(engine, engine.newGame(start('k1', '明')), '!head-start', '明');
  assert.equal(engine.points(game).parts, 0);
  assert.equal(engine.points(game).solve, 150);
});

test('points: an extra row never adds to the win bonus', () => {
  const engine = setup();
  const game = play(engine, engine.newGame(start('k1', '明')), '!extra-guess', '間', '明');
  assert.equal(game.rows, 7);
  assert.equal(engine.points(game).solve, 100 + 10 * 4);
});

test('powers: when they can be used', () => {
  const engine = setup();
  const fresh = engine.newGame(start('k1', '明'));
  assert.equal(engine.canUse(fresh, 'reveal-part'), 'when', 'during only');
  assert.equal(engine.canUse(fresh, 'head-start'), null);
  assert.equal(engine.canUse(fresh, 'reveal-kanji'), 'mode', 'needs 2+ kanji');
  assert.equal(engine.canUse(fresh, 'nope'), 'unknown');
  const after = play(engine, fresh, '間');
  assert.equal(engine.canUse(after, 'head-start'), 'when', 'before only');
  assert.equal(engine.canUse(after, 'reveal-part'), null);
  const won = play(engine, after, '明');
  assert.equal(engine.canUse(won, 'strokes'), 'over');
  assert.equal(engine.usePower(won, 'strokes').error, 'over');
});

test('powers: strokes, layout and reading reveal once', () => {
  const engine = setup();
  let game = engine.newGame(start('k1', '明'));
  assert.equal(engine.clues(game).strokes, null);
  game = play(engine, game, '!strokes', '!layout', '!reading');
  const clues = engine.clues(game);
  assert.deepEqual(clues.strokes, [8]);
  assert.deepEqual(clues.layout, [['left', 'right']]);
  assert.ok(clues.reading.on.length > 0);
  assert.equal(engine.canUse(game, 'strokes'), 'useless');
  assert.equal(engine.canUse(game, 'layout'), 'useless');
  assert.equal(engine.canUse(game, 'reading'), 'useless');
  assert.deepEqual(game.powers, ['strokes', 'layout', 'reading']);

  const word = play(engine, engine.newGame(start('k2', '日本')), '!reading', '!strokes');
  assert.equal(engine.clues(word).reading, 'にほん');
  assert.deepEqual(engine.clues(word).strokes, [4, 5]);
});

test('powers: the meaning is free after the mode\'s guess count', () => {
  const engine = setup();
  let game = play(engine, engine.newGame(start('k1', '明')), '間', '時');
  assert.equal(engine.clues(game).meaning, null);
  game = play(engine, game, '林');
  assert.ok(engine.clues(game).meaning.length > 0);
  assert.equal(engine.clues(game).meaningFree, true);
  assert.equal(engine.canUse(game, 'meaning'), 'useless');
  assert.deepEqual(game.powers, [], 'the free meaning is not a power');

  const bought = play(engine, engine.newGame(start('k1', '明')), '!meaning');
  assert.equal(engine.clues(bought).meaningFree, false);
  assert.deepEqual(engine.clues(bought).meaning, engine.answerInfo('明').meanings);
});

test('powers: reveal parts picks hidden parts, the same way on every replay', () => {
  const engine = setup();
  const game = engine.newGame(start('k1', '時'));
  const a = engine.usePower(game, 'head-start');   // 2 parts
  const b = engine.usePower(game, 'head-start');
  assert.deepEqual(a.result, b.result);
  assert.equal(a.result.parts.length, 2);
  a.result.parts.forEach((p) => assert.ok(['日', '土', '寸'].includes(p.el)));
  // After one guess, reveal-part only picks a part not already green.
  let next = play(engine, a.state, '明');   // 日 green
  const left = ['日', '土', '寸'].filter((el) => !a.result.parts.some((p) => p.el === el) && el !== '日');
  const r = engine.usePower(next, 'reveal-part');
  if (left.length) assert.ok(left.includes(r.result.parts[0].el));
  else assert.equal(r.error, 'useless');
  next = engine.newGame(start('k1', '明'));
  next = play(engine, next, '!head-start');
  next = play(engine, next, '間');
  assert.equal(engine.canUse(next, 'reveal-part'), 'useless', 'every part is known');
});

test('powers: sweep greys out the most-used decoys not yet ruled out', () => {
  const engine = setup();
  const data = fixtureData();
  const uses = Object.fromEntries(data.tiles.map((t) => [t.id, t.uses]));
  let game = play(engine, engine.newGame(start('k1', '明')), '間');   // 門 is now ruled out
  const r = engine.usePower(game, 'sweep');
  const out = r.result.eliminated;
  assert.equal(out.length, 10);
  assert.ok(!out.includes('日') && !out.includes('月'), 'never a part of the answer');
  assert.ok(!out.includes('門'), 'already ruled out');
  for (let i = 1; i < out.length; i += 1) assert.ok(uses[out[i - 1]] >= uses[out[i]]);
  game = r.state;
  const again = engine.usePower(game, 'sweep').result.eliminated;
  assert.ok(again.every((id) => !out.includes(id)));
});

test('powers: reveal a kanji never fills the last one', () => {
  const engine = setup();
  let game = engine.newGame(start('k2', '日本'));
  const r = engine.usePower(game, 'reveal-kanji');
  assert.equal(r.result.kanji.length, 1);
  game = r.state;
  assert.equal(engine.canUse(game, 'reveal-kanji'), 'useless');
  assert.deepEqual(engine.clues(game).solved, [r.result.kanji[0].slot]);
  // The revealed kanji's parts pay nothing when the word is guessed.
  game = play(engine, game, '日本');
  const otherSlot = r.result.kanji[0].slot === 0 ? '本' : '日';
  assert.equal(engine.points(game).parts, fixtureData().kanji[otherSlot].parts.length * 10);
});

test('powers: every effect in KNOWN_EFFECTS is implemented, and every power uses one', () => {
  const engine = setup();
  assert.deepEqual([...engine.effects].sort(), [...KNOWN_EFFECTS].sort());
  POWERS.forEach((p) => assert.ok(engine.effects.includes(p.effect), p.id));
});

test('a game replays from its log', () => {
  const engine = setup();
  const s = start('k1', '時');
  const game = play(engine, engine.newGame(s), '!head-start', '間', '!sweep', '明', '時');
  assert.deepEqual(engine.replay(s, game.log), game);
});

test('the history entry has what stats need', () => {
  const engine = setup();
  const game = play(engine, engine.newGame(start('k1', '明')), '!strokes', '間', '明');
  assert.deepEqual(engine.record(game, '2026-11-07'),
    { date: '2026-11-07', guesses: ['間', '明'], won: true, powers: ['strokes'], answer: '明', level: 'easy' });
});

test('bonus drops: only on a win, at the economy\'s chances, within hold limits', () => {
  const engine = setup();
  const rngOf = (...values) => () => values.shift();
  const perfect = play(engine, engine.newGame(start('k1', '明')), '間', '時', '明');   // 3 of 6 rows
  const slow = play(engine, engine.newGame(start('k1', '明')), '間', '時', '林', '明');
  const lost = play(engine, engine.newGame(start('k1', '明')), '間', '月', '時', '林', '森', '品');
  assert.equal(engine.rollDrop(lost, {}, rngOf(0)), null);
  assert.equal(engine.rollDrop(slow, {}, rngOf(0.5, 0)), null, '0.5 misses the 0.3 chance');
  assert.notEqual(engine.rollDrop(perfect, {}, rngOf(0.5, 0)), null, '0.5 is inside 0.6');
  // Everything held at its limit but one power: that one drops.
  const full = Object.fromEntries(POWERS.map((p) => [p.id, p.hold]));
  delete full.strokes;
  assert.equal(engine.rollDrop(perfect, full, rngOf(0, 0.99)), 'strokes');
  full.strokes = 99;
  assert.equal(engine.rollDrop(perfect, full, rngOf(0, 0.5)), null, 'nothing has room');
});

// ── Levels ───────────────────────────────────────────────────────────

const normal = (answer, extra = {}) => start('k1', answer, { level: 'normal', ...extra });
const hard = (answer, extra = {}) => start('k1', answer, { level: 'hard', ...extra });
const guided = (answer, extra = {}) => start('k1', answer, { level: 'guided', ...extra });
const markList = (r) => r.scored[0].tiles.map((t) => t.mark);

test('levels: a new game keeps its level, and the default when it has none', () => {
  const engine = setup();
  assert.equal(engine.newGame(normal('明')).level, 'normal');
  const { level, ...noLevel } = start('k1', '明');
  assert.equal(engine.newGame(noLevel).level, testConfig().defaultLevel);
  assert.throws(() => engine.newGame(start('k1', '明', { level: 'nope' })));
});

test('levels: the palette is the mode\'s size times the level\'s paletteScale', () => {
  const config = testConfig();
  config.modes.forEach((m) => { m.palette = 20; });
  const engine = createEngine(fixtureData(), config);
  const scale = config.levels.find((l) => l.id === 'normal').paletteScale;
  assert.equal(engine.newGame(start('k1', '明')).palette.length, 20);
  assert.equal(engine.newGame(normal('明')).palette.length, Math.round(20 * scale));
});

test('normal: one cell per part, in writing order, like a word\'s letters', () => {
  const engine = setup();
  let game = engine.newGame(normal('時'));   // 日 土 寸
  assert.equal(engine.guess(game, '時').error, 'level', 'no kanji guesses');
  assert.equal(engine.guess(game, [['日', '土']]).error, 'slots');
  assert.equal(engine.guess(game, [['日', '土', '龍']]).error, 'not-in-palette');
  const r = engine.guess(game, [['土', '日', '寸']]);
  assert.deepEqual(markList(r), ['near', 'near', 'hit'], 'the right parts out of order are yellow');
  assert.equal(r.state.guesses[0].word, null, 'normal never names the kanji the parts make');
  game = r.state;
  assert.equal(engine.guess(game, [['土', '日', '寸']]).error, 'repeat');
  game = play(engine, game, ['日', '土', '寸']);
  assert.equal(game.status, 'won', 'another order is a new guess');
  assert.equal(game.guesses[1].word, '時');
  assert.deepEqual(game.log, [{ guess: [['土', '日', '寸']] }, { guess: [['日', '土', '寸']] }]);
});

test('normal: the cells run across the kanji, so a part from another kanji is yellow', () => {
  const engine = setup();
  const game = engine.newGame(start('k2', '日本', { level: 'normal' }));   // cells: 日 木 一
  const r = engine.guess(game, [['木'], ['日', '一']]);
  assert.deepEqual(r.scored.map((slot) => slot.tiles.map((t) => t.mark)), [['near'], ['near', 'hit']]);
  assert.equal(play(engine, game, [['日'], ['木', '一']]).status, 'won');
});

test('normal: repeated parts are marked like Wordle\'s repeated letters', () => {
  const engine = setup();
  const r = engine.guess(engine.newGame(normal('林')), [['木', '人']]);   // 木 木
  assert.deepEqual(markList(r), ['hit', 'miss']);
  const twice = engine.guess(engine.newGame(normal('休')), [['木', '木']]);   // 人 木
  assert.deepEqual(markList(twice), ['miss', 'hit'], 'the green uses up the only 木');
});

test('normal: any parts go, even ones that make no kanji', () => {
  const engine = setup();
  assert.equal(engine.guess(engine.newGame(normal('明')), [['亠', '月']]).error, undefined);
});

test('hard: the parts, in order, must split into real kanji, any split; the row names them', () => {
  const engine = setup();
  const game = engine.newGame(hard('明'));
  assert.equal(engine.guess(game, [['亠', '月']]).error, 'not-real', '亠 is in no kanji alone or with 月');
  assert.equal(engine.guess(game, [['女', '子']]).state.guesses[0].word, '好', 'one kanji when the parts make one');
  assert.equal(engine.guess(game, [['子', '女']]).state.guesses[0].word, '子女', 'else any split into kanji');
  const three = engine.guess(engine.newGame(hard('時')), [['木', '寸', '日']]);
  assert.equal(three.state.guesses[0].word, '村日', 'fewest kanji first');
  const won = play(engine, game, ['日', '月']);
  assert.equal(won.status, 'won');
  assert.equal(won.guesses[0].word, '明');
});

test('hard: greens stay in their cells, and every part found is used again', () => {
  const engine = setup();
  let game = play(engine, engine.newGame(hard('時')), ['日', '木', '寸']);   // 日 green, 木 grey, 寸 green
  let r = engine.guess(game, [['口', '土', '寸']]);
  assert.equal(r.error, 'keep-hit');
  assert.deepEqual(r.detail, { part: '日', cell: 1 });
  game = play(engine, engine.newGame(hard('時')), ['土', '日', '寸']);   // 土 and 日 yellow, 寸 green
  r = engine.guess(game, [['日', '口', '寸']]);
  assert.equal(r.error, 'use-near');
  assert.equal(r.detail.part, '土');
  assert.equal(play(engine, game, ['日', '土', '寸']).status, 'won');
  // Normal doesn't ask.
  const easy = play(engine, engine.newGame(normal('時')), ['日', '木', '寸']);
  assert.equal(engine.guess(easy, [['口', '土', '子']]).error, undefined);
});

test('shown cells: the parts powers showed, in their cells across the word', () => {
  const engine = setup();
  const cells = ['日', '土', '寸'];
  const game = play(engine, engine.newGame(normal('時')), '!head-start');
  const shown = engine.shownCells(game);
  assert.equal(shown.length, 2);
  shown.forEach(({ cell, el, form }) => { assert.equal(el, cells[cell]); assert.equal(form, el); });
  assert.deepEqual(engine.shownCells(engine.newGame(normal('時'))), []);
  // A revealed kanji shows all its cells; the cells run on after the first kanji's.
  const word = engine.usePower(engine.newGame(start('k2', '日本', { level: 'normal' })), 'reveal-kanji');
  const slot = word.result.kanji[0].slot;
  assert.deepEqual(engine.shownCells(word.state).map((c) => [c.cell, c.el]),
    slot === 0 ? [[0, '日']] : [[1, '木'], [2, '一']]);
});

test('hard: a part a power showed stays in its cell, like a green', () => {
  const engine = setup();
  const game = play(engine, engine.newGame(hard('時')), '!head-start');   // 2 of 日 土 寸
  const first = engine.shownCells(game)[0];
  const r = engine.guess(game, [['木', '寸', '日']]);   // 村日: real kanji, every cell moved
  assert.equal(r.error, 'keep-shown');
  assert.deepEqual(r.detail, { part: first.form, cell: first.cell + 1 });
  assert.equal(play(engine, game, ['日', '土', '寸']).status, 'won');
  // Normal doesn't ask.
  const easy = play(engine, engine.newGame(normal('時')), '!head-start');
  assert.equal(engine.guess(easy, [['木', '寸', '日']]).error, undefined);
});

test('guided: the board shows the split, so the Layout hint has nothing new', () => {
  const engine = setup();
  assert.equal(engine.canUse(engine.newGame(guided('明')), 'layout'), 'useless');
  assert.equal(engine.canUse(engine.newGame(normal('明')), 'layout'), null);
});

test('guided: the kanji that still fit each slot, after every guess', () => {
  const engine = setup();
  let game = engine.newGame(guided('明'));
  // Every fixture kanji of two parts.
  const all = engine.fits(game)[0];
  ['明', '林', '休', '好', '唄', '村', '本', '間'].forEach((ch) => assert.ok(all.includes(ch), ch));
  game = play(engine, game, ['女', '子']);
  assert.deepEqual(game.guesses[0].left, [all.length - 3], '好, 安 and 字 are out');
  game = play(engine, game, ['木', '月']);   // 木 grey, 月 green in the second cell
  assert.deepEqual(engine.fits(game)[0], ['明']);
  assert.deepEqual(game.guesses[1].left, [1]);
});

test('guided: what powers show narrows the kanji that fit too', () => {
  const engine = setup();
  const game = play(engine, engine.newGame(guided('明')), '!strokes');
  const fit = engine.fits(game)[0];
  const { kanji } = fixtureData();
  assert.ok(fit.includes('明'));
  assert.ok(fit.length < engine.fits(engine.newGame(guided('明')))[0].length);
  assert.ok(fit.every((ch) => kanji[ch].strokes === kanji['明'].strokes));
});

test('levels: only a countLeft level keeps the count on each guess', () => {
  const engine = setup();
  assert.equal(play(engine, engine.newGame(hard('明')), ['木', '木']).guesses[0].left, undefined);
  assert.equal(play(engine, engine.newGame(normal('明')), ['木', '木']).guesses[0].left, undefined);
  assert.equal(play(engine, engine.newGame(start('k1', '明')), '林').guesses[0].left, undefined);
});

test('levels: a level not in order scores each kanji on its own (no offered level does)', () => {
  const config = bigPalette();
  const base = config.levels.find((l) => l.id === 'hard');
  config.levels.push({ ...base, id: 'by-kanji', offered: false, order: false, places: true, useHints: false });
  const engine = createEngine(fixtureData({ words }), config, { isWord: (word) => word === '日本' });
  const game = engine.newGame(start('k1', '明', { level: 'by-kanji' }));
  assert.equal(engine.guess(game, [['子', '女']]).error, 'not-real', '好 is 女 left, 子 right');
  assert.deepEqual(markList(engine.guess(game, [['木', '木']])), ['miss', 'miss']);
  const word = engine.newGame(start('k2', '日本', { level: 'by-kanji' }));
  assert.equal(engine.guess(word, [['月'], ['木', '一']]).error, 'not-a-word');
});

test('levels: only a level with freeMeaning shows the meaning for free', () => {
  const engine = setup();
  const game = play(engine, engine.newGame(normal('明')), ['門', '日'], ['口', '木'], ['木', '月']);
  assert.equal(engine.clues(game).meaning, null);
  assert.equal(engine.clues(game).meaningFreeAt, null);
  assert.equal(engine.canUse(game, 'meaning'), null, 'the Meaning hint still works');
  assert.equal(engine.clues(engine.newGame(start('k1', '明'))).meaningFreeAt, MODE.k1.freeMeaning);
});

test('levels: points pay per part found and the level multiplies them', () => {
  const engine = setup();
  // 日 yellow (+4), then 日 green (+6 more), 月 green (+10) and the win: 100 + 10 × 4 unused rows.
  const game = play(engine, engine.newGame(normal('明')), ['門', '日'], ['日', '月']);
  assert.deepEqual(engine.points(game), { parts: 20, solve: 140, multiplier: 2, total: 320 });
  const tough = play(engine, engine.newGame(hard('明', { daily: false })), ['日', '月']);
  assert.equal(engine.points(tough).multiplier, 3 * 0.5);
});

test('levels: a parts game records its picks and level, and replays from either', () => {
  const engine = setup();
  const game = play(engine, engine.newGame(normal('明')), '!strokes', ['門', '日'], ['日', '月']);
  const entry = engine.record(game, '2026-11-07');
  assert.deepEqual(entry.guesses, [[['門', '日']], [['日', '月']]]);
  assert.equal(entry.level, 'normal');
  assert.deepEqual(engine.replay(normal('明'), game.log), game);
  const again = entry.guesses.reduce((s, g) => engine.guess(s, g).state, engine.newGame(normal('明')));
  assert.equal(again.status, 'won');
});

test('main mode: each game takes its answer\'s length, at every level', () => {
  const engine = setup();
  const one = engine.newGame(start('main', '明'));
  const two = engine.newGame(start('main', '日本'));
  assert.equal(engine.guess(two, '明').error, 'length', 'easy: a guess as long as this answer');
  assert.equal(play(engine, two, '日本').status, 'won');
  assert.equal(play(engine, one, '明').status, 'won');
  const parts = engine.newGame(start('main', '日本', { level: 'normal' }));
  assert.equal(engine.guess(parts, [['日', '木']]).error, 'slots', 'the picks come per kanji');
  assert.equal(play(engine, parts, [['日'], ['木', '一']]).status, 'won');
  assert.throws(() => engine.newGame(start('main', '')));
});
