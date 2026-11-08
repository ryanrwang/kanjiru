import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/engine/game.js';
import { KNOWN_EFFECTS, POWERS } from '../js/registry.js';
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

// Plays words in order, failing on any error.
function play(engine, state, ...steps) {
  return steps.reduce((s, step) => {
    const r = step.startsWith('!') ? engine.usePower(s, step.slice(1)) : engine.guess(s, step);
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
    { date: '2026-11-07', guesses: ['間', '明'], won: true, powers: ['strokes'], answer: '明' });
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
