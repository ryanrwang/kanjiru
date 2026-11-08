/*
 * Nothing in the engine hard-codes a mode, power or number: these tests run
 * it on made-up catalogues, and scan its source for literals.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createEngine } from '../js/engine/game.js';
import { daily } from '../js/engine/daily.js';
import { MODES, POWERS, SKINS, LEVELS, LEVEL, settingsLevel, validate } from '../js/registry.js';
import { fixtureData, testConfig } from './helpers.js';

test('a new 5-kanji mode and a new power need only catalogue entries', () => {
  const config = testConfig();
  config.modes.push({ id: 'k5', length: 5, numeral: '五', guesses: 9, daily: true, points: 3, palette: 999, freeMeaning: 0 });
  config.powers.push({ id: 'triple', icon: '🧩', effect: 'revealParts', params: { count: 3 },
    when: ['before'], cost: 1, hold: 1, drop: 0, minLength: 5 });
  config.economy = { ...config.economy, perPart: { hit: 7, near: 2, other: 1 }, solve: { base: 11, perUnusedGuess: 3 } };
  const data = fixtureData({ answers: { 5: ['日本語学生'] }, epoch: '2026-11-01' });
  const engine = createEngine(data, config);

  const mode = config.modes.find((m) => m.id === 'k5');
  const start = { ...daily(data, mode, '2026-11-01'), level: 'easy' };
  let game = engine.newGame(start);
  assert.equal(game.rows, 9);
  assert.ok(engine.clues(game).meaning !== null, 'freeMeaning 0: shown from the start');
  assert.equal(engine.canUse(game, 'triple'), null);
  const r = engine.usePower(game, 'triple');
  assert.equal(r.result.parts.length, 3);
  game = engine.guess(r.state, '日本語学生').state;
  assert.equal(game.status, 'won');
  const parts = [...'日本語学生'].reduce((n, ch) => n + data.kanji[ch].parts.length, 0);
  assert.equal(engine.points(game).parts, (parts - 3) * 7);
  assert.equal(engine.points(game).solve, 11 + 3 * 8);
  assert.equal(engine.points(game).multiplier, 3);
  // The new power is offered only in modes long enough for it.
  assert.equal(engine.canUse(engine.newGame({ ...start, modeId: 'k1', answer: '明' }), 'triple'), 'mode');
});

test('the engine source has no mode, power or level ids, or loose numbers', () => {
  const dir = new URL('../js/engine/', import.meta.url);
  const ids = [...MODES.map((m) => m.id), ...POWERS.map((p) => p.id), ...LEVELS.map((l) => l.id)];
  // Allowed numbers: 0 and 1, and the constants of the seeded random
  // generator and the date maths, which aren't game rules.
  const allowed = { 'random.js': true, 'daily.js': true };
  readdirSync(dir).filter((f) => f.endsWith('.js')).forEach((file) => {
    const code = readFileSync(new URL(file, dir), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    ids.forEach((id) => assert.ok(!new RegExp(`['"\`]${id}['"\`]`).test(code), `${file} names "${id}"`));
    if (allowed[file]) return;
    const numbers = (code.match(/(?<![\w.$])\d+(\.\d+)?(?![\w])/g) || []).filter((n) => !['0', '1'].includes(n));
    assert.deepEqual(numbers, [], `${file} has numbers: ${numbers.join(', ')}`);
  });
});

test('validate() finds no problems in the real catalogues', () => {
  // validate() checks theme colours against tokens.js, which needs a browser;
  // give it the theme ids so the rest of the checks run.
  globalThis.window = { TOKENS: { themes: Object.fromEntries(SKINS.theme.map((t) => [t.id, {}])) } };
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(validate(), []);
  } finally {
    console.warn = warn;
    delete globalThis.window;
  }
});

test('the Settings switches pick an offered level for each mix', () => {
  assert.equal(settingsLevel(false, false), 'normal');
  assert.equal(settingsLevel(true, false), 'hard');
  assert.equal(settingsLevel(false, true), 'guided');
  assert.equal(settingsLevel(true, true), 'guided-hard');
  [[false, false], [true, false], [false, true], [true, true]].forEach(([hard, guided]) => {
    const level = LEVEL[settingsLevel(hard, guided)];
    assert.ok(level.offered && level.hard === hard && level.guided === guided);
    assert.equal(level.realKanji, hard);
    assert.equal(level.showSplit, guided);
  });
  assert.ok(!LEVEL.easy.offered, 'Easy is retired');
});
